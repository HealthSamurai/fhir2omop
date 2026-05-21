#!/usr/bin/env bun
// End-to-end Patient→person pipeline reset, run autonomously.
//
//   1. Wipe fhir.* (psql, fast)
//   2. Reload fhir.* from synthea/output/fhir (100 patients with US Core)
//   3. Apply mapspec/etl/_functions.sql (referenceToId)
//   4. Materialize ConceptMaps into cm.*
//   5. Build cdm.* shell + load cdm.person from synthea CSV (reference oracle)
//   6. Materialize staging.patient_person from view JSON
//   7. Run stage-2 Patient__person.sql → cdm_ours_fhir.person
//   8. diff.createIndices for fast lookups
//   9. Report row-level + concept-level diff
//
// All bulk SQL goes via psql to dodge Bun.SQL's per-query timeout. JS only
// does parsing + light orchestration.
import { SQL } from "bun";
import { $ } from "bun";
import { resolve } from "node:path";
import { parse } from "csv-parse/sync";

const DSN = "postgresql://athena:athena@localhost:54392/athena";
const sql = new SQL(DSN, { idleTimeout: 0, maxLifetime: 0 });

const t0 = Date.now();
const log = (m: string) => console.log(`[${((Date.now() - t0) / 1000).toFixed(1)}s] ${m}`);
const psql = (script: string) => $`psql ${DSN} -v ON_ERROR_STOP=1 -c ${script}`.quiet();
const psqlFile = (path: string) => $`psql ${DSN} -v ON_ERROR_STOP=1 -f ${path}`.quiet();

// ── 1. wipe fhir.* ──────────────────────────────────────────────────────────
log("wipe fhir.*");
await psql(`
    DO $$ DECLARE r record; BEGIN
        FOR r IN SELECT table_name FROM information_schema.tables WHERE table_schema='fhir' LOOP
            EXECUTE format('TRUNCATE TABLE fhir.%I', r.table_name);
        END LOOP;
    END $$;
`);

// ── 2. reload Synthea FHIR bundles ──────────────────────────────────────────
log("reload fhir.* from synthea/output/fhir");
const loadRes = await $`bun script/load-fhir.ts synthea/output/fhir`.text();
const summary = loadRes.match(/done in [\d.]+s.*$/m)?.[0] ?? "?";
log(`  ${summary}`);

// ── 3. apply ETL helper functions ───────────────────────────────────────────
log("apply mapspec/etl/_functions.sql");
await psqlFile("mapspec/etl/_functions.sql");

// ── 4. materialize ConceptMaps into cm.* ────────────────────────────────────
log("materialize ConceptMaps");
const ctx: any = { env: process.env, fns: {}, state: {} };
ctx.fns.db = { query: (await import("../src/db/query")).default };
ctx.fns.profiles = { load: (await import("../src/profiles/load")).default };
const cmMat = (await import("../src/conceptmap/materialize")).default;
const { conceptmaps } = await ctx.fns.profiles.load(ctx);
for (const cm of conceptmaps) {
    const r = await cmMat(ctx, { cm });
    log(`  ${r.table}: ${r.rows} rows`);
}

// ── 5. build cdm.* shell + load cdm.person from synthea CSV ─────────────────
log("ensure cdm.* shell exists");
await psql(`CREATE SCHEMA IF NOT EXISTS cdm`);
// reuse the OMOP 5.4 DDL but only for tables we need today; cdm.person, cdm.location
const ddl = await Bun.file(
    "CommonDataModel/inst/ddl/5.4/postgresql/OMOPCDM_postgresql_5.4_ddl.sql"
).text();
// Replace template var, then run just CREATE TABLE statements for person + location
const ddlSubstituted = ddl.replace(/@cdmDatabaseSchema/g, "cdm");
// Build idempotent CREATE TABLE IF NOT EXISTS by parsing the file
const personDdl = ddlSubstituted.match(/CREATE TABLE cdm\.person\b[\s\S]*?\);/)?.[0];
const locationDdl = ddlSubstituted.match(/CREATE TABLE cdm\.location\b[\s\S]*?\);/)?.[0];
if (!personDdl || !locationDdl) throw new Error("could not extract person/location DDL");
await psql(personDdl.replace("CREATE TABLE cdm.person", "CREATE TABLE IF NOT EXISTS cdm.person"));
await psql(locationDdl.replace("CREATE TABLE cdm.location", "CREATE TABLE IF NOT EXISTS cdm.location"));
// Widen _id columns to bigint to match our hash IDs
await psql(`
    ALTER TABLE cdm.person   ALTER COLUMN person_id    TYPE bigint USING person_id::bigint;
    ALTER TABLE cdm.person   ALTER COLUMN location_id  TYPE bigint USING location_id::bigint;
    ALTER TABLE cdm.location ALTER COLUMN location_id  TYPE bigint USING location_id::bigint;
`);

log("load cdm.person from synthea/output/csv/patients.csv");
const csvText = await Bun.file("synthea/output/csv/patients.csv").text();
const patients = parse(csvText, { columns: true, skip_empty_lines: true, relax_column_count: true }) as any[];

// Race / ethnicity mapping that matches ETL-Synthea (covers WHITE/BLACK/ASIAN
// only, others → 0 — same behaviour as reference R-based ETL).
const raceMap: Record<string, number> = {
    white: 8527, black: 8516, asian: 8515,
    native: 0, hawaiian: 0, other: 0,
};
const ethMap: Record<string, number> = {
    hispanic: 38003563, nonhispanic: 38003564,
};
const genderMap: Record<string, number> = { M: 8507, F: 8532 };

await psql(`TRUNCATE TABLE cdm.person; TRUNCATE TABLE cdm.location;`);

// Insert distinct locations first so we can map person.location_id.
const locByZip = new Map<string, { id: bigint; city: string; state: string; zip: string }>();
for (const p of patients) {
    const zip = (p.ZIP ?? "").trim();
    if (!zip || locByZip.has(zip)) continue;
    // bigint hash: hashtextextended via Postgres so the value matches ours
}
// Use postgres for the hash to stay consistent with our pipeline.
log(`  ${patients.length} patient rows`);
log("  build cdm.location (distinct ZIPs)");
const distinctLocs = [...new Map(patients.map((p) => [p.ZIP, p])).values()]
    .filter((p) => p.ZIP);
if (distinctLocs.length > 0) {
    const params: any[] = [];
    const tuples: string[] = [];
    let i = 1;
    for (const p of distinctLocs) {
        tuples.push(`(hashtextextended($${i++}, 0)::bigint, $${i++}, $${i++}, $${i++}, $${i++})`);
        params.push(p.ZIP, p.CITY, p.ZIP, p.ZIP, p.STATE);
    }
    // location columns: location_id, city, zip, location_source_value, country_source_value
    await sql.unsafe(
        `INSERT INTO cdm.location (location_id, city, zip, location_source_value, country_source_value) VALUES ${tuples.join(",")}`,
        params,
    );
}

log("  build cdm.person");
const personParams: any[] = [];
const personTuples: string[] = [];
let i = 1;
for (const p of patients) {
    const bd = p.BIRTHDATE as string;
    const yr = bd ? parseInt(bd.slice(0, 4)) : null;
    const mo = bd ? parseInt(bd.slice(5, 7)) : null;
    const dy = bd ? parseInt(bd.slice(8, 10)) : null;
    const gender = genderMap[String(p.GENDER ?? "").toUpperCase()] ?? 0;
    const race = raceMap[String(p.RACE ?? "").toLowerCase()] ?? 0;
    const eth = ethMap[String(p.ETHNICITY ?? "").toLowerCase()] ?? 0;
    const locId = p.ZIP ? `hashtextextended($${i++}, 0)::bigint` : "NULL";
    if (p.ZIP) personParams.push(p.ZIP);
    personTuples.push(`(
        hashtextextended($${i++}, 0)::bigint,
        $${i++}::int, $${i++}::int, $${i++}::int, $${i++}::int, $${i++}::timestamp,
        $${i++}::int, $${i++}::int,
        ${locId},
        $${i++}::text, $${i++}::text, $${i++}::int, $${i++}::text, $${i++}::int, $${i++}::text, $${i++}::int
    )`);
    personParams.push(
        p.Id,                 // person_id (hashed)
        gender, yr, mo, dy, bd ? bd + " 00:00:00" : null,
        race, eth,
        // person_source_value..eth_source_concept_id
        p.Id, p.GENDER ?? null, 0, p.RACE ?? null, 0, p.ETHNICITY ?? null, 0,
    );
}
if (personTuples.length > 0) {
    await sql.unsafe(
        `INSERT INTO cdm.person (
            person_id, gender_concept_id, year_of_birth, month_of_birth, day_of_birth, birth_datetime,
            race_concept_id, ethnicity_concept_id, location_id,
            person_source_value, gender_source_value, gender_source_concept_id,
            race_source_value, race_source_concept_id, ethnicity_source_value, ethnicity_source_concept_id
        ) VALUES ${personTuples.join(",")}`,
        personParams,
    );
}

// ── 6. materialize staging.patient_person ───────────────────────────────────
log("materialize staging.patient_person");
ctx.fns.viewdef = { materialize: (await import("../src/viewdef/materialize")).default };
const vd = JSON.parse(await Bun.file("mapspec/views/Patient__person.view.json").text());
const matR = await ctx.fns.viewdef.materialize(ctx, {
    viewDefinition: vd,
    source: "fhir.patient",
    target: "staging.patient_person",
});
log(`  ${matR.rows} rows in ${(matR.ms / 1000).toFixed(1)}s`);

// ── 7. run Patient__person stage-2 ETL via psql ─────────────────────────────
log("run Patient__person stage-2 ETL");
const stage2Sql =
    `TRUNCATE TABLE cdm_ours_fhir.person;\nINSERT INTO cdm_ours_fhir.person\n` +
    await Bun.file("mapspec/etl/Patient__person.sql").text();
await $`echo ${stage2Sql} | psql ${DSN} -v ON_ERROR_STOP=1`.quiet();

// ── 8. indexes for fast diff ────────────────────────────────────────────────
log("diff.createIndices");
const createIndices = (await import("../src/diff/createIndices")).default;
const idxR = await createIndices(ctx);
log(`  ${idxR.created} indexes in ${(idxR.ms / 1000).toFixed(1)}s`);

// ── 9. report ───────────────────────────────────────────────────────────────
log("report");
const counts = await sql`
    SELECT 'cdm.person'         AS tbl, count(*)::int AS n FROM cdm.person UNION ALL
    SELECT 'cdm_ours_fhir.person',       count(*)::int FROM cdm_ours_fhir.person UNION ALL
    SELECT 'staging.patient_person',     count(*)::int FROM staging.patient_person UNION ALL
    SELECT 'fhir.patient',               count(*)::int FROM fhir.patient
`;
console.log("\nROW COUNTS:");
for (const r of counts) console.log(`  ${r.tbl.padEnd(28)} ${r.n}`);

const compare = (await import("../src/diff/compareTables")).default;
ctx.fns.diff = { compareTables: compare };
const diff = await compare(ctx, {
    ref: "cdm.person",
    ours: "cdm_ours_fhir.person",
    key: "person_source_value",
    ttl: 0,
});
console.log(`\nROW MATCH: ref=${diff.ref_rows}  ours=${diff.ours_rows}  both=${diff.in_both}  ref_only=${diff.ref_only}  ours_only=${diff.ours_only}`);
console.log("\nFIELD DIFFS:");
console.log("  column                          match  mismatch  ref_null  ours_null");
for (const f of (diff.fields ?? [])) {
    const flag = f.mismatch > 0 ? " *" : "";
    console.log(`  ${f.column.padEnd(32)} ${String(f.match).padStart(5)}  ${String(f.mismatch).padStart(8)}  ${String(f.ref_null).padStart(8)}  ${String(f.ours_null).padStart(9)}${flag}`);
}

await sql.end();
process.exit(0);
