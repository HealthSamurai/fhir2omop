#!/usr/bin/env bun
// Run FHIR→OMOP golden test cases (cases/*.json) through the REAL Postgres
// pipeline and assert the expected OMOP rows.
//
// For each variant: reset isolated schemas (t_fhir / t_staging / t_cdm),
// load fhir[] into t_fhir.*, run the relevant edges (materialize view →
// _resolve_*.sql → stage-2 SQL, all pointed at the t_* schemas via a
// `staging.`→`t_staging.` substitution) into t_cdm.*, then assert omop.
// vocab.* + cm.* (full Athena) are shared read-only.
//
//   bun script/run-cases.ts                      # all cases
//   bun script/run-cases.ts patient              # only files matching substring
//   bun script/run-cases.ts -v                   # verbose (print every diff)
import { SQL } from "bun";
import { readdirSync } from "node:fs";
import { PLAN, colCount } from "./etl-plan";

const DSN = process.env.ATHENA_DSN ?? "postgresql://athena:athena@localhost:54392/athena";
const sql = new SQL(DSN, { idleTimeout: 0, maxLifetime: 0 });

const T = { fhir: "t_fhir", staging: "t_staging", cdm: "t_cdm" };
const args = process.argv.slice(2);
const verbose = args.includes("-v");
const filter = args.find((a) => !a.startsWith("-"));

const PK_BY_TABLE: Record<string, string> = {
    person: "person_id", location: "location_id", care_site: "care_site_id", provider: "provider_id",
    visit_occurrence: "visit_occurrence_id", condition_occurrence: "condition_occurrence_id",
    procedure_occurrence: "procedure_occurrence_id", measurement: "measurement_id", observation: "observation_id",
    note: "note_id", drug_exposure: "drug_exposure_id", device_exposure: "device_exposure_id",
    death: "person_id", observation_period: "observation_period_id",
};

const ctx: any = { env: process.env, fns: {}, state: {} };
ctx.fns.db = { query: (await import("../src/db/query")).default };
ctx.fns.viewdef = { materialize: (await import("../src/viewdef/materialize")).default };

const snake = (rt: string) => rt.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toLowerCase();
const tbl = (q: string) => q.split(".")[1]!;
const subStaging = (body: string) => body.replaceAll("staging.", T.staging + ".");
const resolveFiles = readdirSync("mapspec/etl").filter((f) => f.startsWith("_resolve_") && f.endsWith(".sql")).sort();

async function runScript(sqlText: string): Promise<void> {
    const proc = Bun.spawn(["psql", DSN, "-v", "ON_ERROR_STOP=1", "-q"], {
        stdin: new TextEncoder().encode(sqlText), stdout: "pipe", stderr: "pipe",
    });
    if ((await proc.exited) !== 0) {
        const err = (await new Response(proc.stderr).text()).split("\n").filter(Boolean).slice(-4).join(" | ");
        throw new Error(err);
    }
}

async function resetSchemas() {
    await runScript(`
        DROP SCHEMA IF EXISTS ${T.fhir} CASCADE; DROP SCHEMA IF EXISTS ${T.staging} CASCADE; DROP SCHEMA IF EXISTS ${T.cdm} CASCADE;
        CREATE SCHEMA ${T.fhir}; CREATE SCHEMA ${T.staging}; CREATE SCHEMA ${T.cdm};`);
}

async function loadFhir(resources: any[]): Promise<Set<string>> {
    const byType = new Map<string, any[]>();
    for (const r of resources) {
        if (!r?.resourceType) continue;
        if (!byType.has(r.resourceType)) byType.set(r.resourceType, []);
        byType.get(r.resourceType)!.push(r);
    }
    let ddl = "";
    for (const [rt, list] of byType) {
        const t = `${T.fhir}.${snake(rt)}`;
        ddl += `CREATE TABLE ${t} (id text PRIMARY KEY, resource jsonb NOT NULL);\n`;
        for (const r of list) {
            const lit = JSON.stringify(r).replaceAll("'", "''");
            ddl += `INSERT INTO ${t} (id, resource) VALUES ('${String(r.id).replaceAll("'", "''")}', '${lit}'::jsonb);\n`;
        }
    }
    await runScript(ddl);
    return new Set([...byType.keys()].map(snake));
}

// Resources whose edges fan out to several OMOP tables via a shared resolve
// pass — for these we run ALL sibling edges so mis-routing to the wrong table
// is caught (a row leaking into a table the case didn't list).
const RESOLVE_FAMILY = new Set(["fhir.condition", "fhir.observation", "fhir.diagnostic_report"]);

async function runPipeline(present: Set<string>, slug: string, expectedTables: Set<string>): Promise<Set<string>> {
    // primary (resource, table) from the filename: <res>--<table>--<aspect>
    const [resPart, tablePart] = slug.split("--");
    const primaryTable = (tablePart ?? "").replaceAll("-", "_");
    const primaryFhir = [...present].find((t) => t.replaceAll("_", "") === resPart);
    const primarySrc = primaryFhir ? `fhir.${primaryFhir}` : null;
    const runTargets = new Set([...expectedTables, primaryTable]);

    let edges = PLAN.filter((p) => present.has(tbl(p.src)));
    edges = edges.filter((p) =>
        RESOLVE_FAMILY.has(p.src)
            ? p.src === primarySrc                         // all siblings of the primary resolve family
            : runTargets.has(tbl(p.target)));              // else only expected + primary targets
    if (!edges.length) return new Set();

    // 1. materialize staging (canonical max-column view per staging table)
    const best = new Map<string, { edge: string; src: string; cols: number }>();
    for (const p of edges) {
        const vf = `mapspec/views/${p.edge}.view.json`;
        if (!(await Bun.file(vf).exists())) continue;
        const cols = colCount(JSON.parse(await Bun.file(vf).text()));
        const ex = best.get(p.staging);
        if (!ex || cols > ex.cols) best.set(p.staging, { edge: p.edge, src: p.src, cols });
    }
    const materialized = new Set<string>();
    for (const [staging, { edge, src }] of best) {
        const vd = JSON.parse(await Bun.file(`mapspec/views/${edge}.view.json`).text());
        await ctx.fns.viewdef.materialize(ctx, {
            viewDefinition: vd, source: `${T.fhir}.${tbl(src)}`, target: `${T.staging}.${tbl(staging)}`,
        });
        materialized.add(tbl(staging));
        await runScript(`ANALYZE ${T.staging}.${tbl(staging)};`);
    }

    // 2. resolve passes (skip silently when their input staging is absent)
    for (const f of resolveFiles) {
        try { await runScript(subStaging(await Bun.file(`mapspec/etl/${f}`).text())); } catch { /* resource not in this case */ }
    }

    // 3. stage-2 edges → t_cdm (truncate first writer per target, then append)
    const produced = new Set<string>();
    const created = new Set<string>();
    for (const p of edges) {
        const sf = `mapspec/etl/${p.edge}.sql`;
        if (!(await Bun.file(sf).exists())) continue;
        const target = `${T.cdm}.${tbl(p.target)}`;
        if (!created.has(target)) {
            await runScript(`CREATE TABLE ${target} (LIKE ${p.target} INCLUDING DEFAULTS);`);
            created.add(target);
        }
        const body = subStaging(await Bun.file(sf).text());
        const stmt = p.mode === "update" ? body : `INSERT INTO ${target}\n${body}`;
        try { await runScript(stmt); produced.add(tbl(p.target)); }
        catch (e: any) { if (verbose) console.log(`    [stage2 ${p.edge}] ${e.message}`); }
    }
    return produced;
}

// ── assertion ────────────────────────────────────────────────────────────────
function clean(exp: any) { const o: any = {}; for (const k of Object.keys(exp)) if (!k.endsWith("__name")) o[k] = exp[k]; return o; }

async function refToId(id: string): Promise<string> {
    const r = await sql`SELECT referenceToId(${id})::text AS h`;
    return r[0].h;
}

// Rows are fetched all-as-text (PG canonical naive representation), so `a` is
// always a string or null; `e` is the JSON-typed expected value.
function valEq(a: any, e: any): boolean {
    if (a === null || a === undefined) return e === null || e === undefined;
    if (e === null || e === undefined) return false;
    const A = String(a), E = String(e);
    if (A === E) return true;                                                       // exact (incl. big int FKs)
    if (/^\d{4}-\d{2}-\d{2}$/.test(E)) return A.slice(0, 10) === E;                  // date-only expected
    if (/^\d{4}-\d{2}-\d{2}T/.test(E)) return A.replace(" ", "T").slice(0, E.length) === E; // datetime expected
    const na = Number(A), ne = Number(E);
    if (!isNaN(na) && !isNaN(ne) && A.trim() !== "" && E.trim() !== "") return na === ne; // numeric
    return false;
}

// Fetch every column cast to ::text so Bun's driver never coerces a naive
// timestamp to a TZ-shifted Date or truncates a 64-bit id to a float.
async function fetchRows(schema: string, table: string): Promise<any[]> {
    const cols = await sql`SELECT column_name FROM information_schema.columns
        WHERE table_schema = ${schema} AND table_name = ${table} ORDER BY ordinal_position`;
    if (!cols.length) throw new Error(`${schema}.${table} does not exist`);
    const sel = cols.map((c: any) => `"${c.column_name}"::text AS "${c.column_name}"`).join(", ");
    return await sql.unsafe(`SELECT ${sel} FROM ${schema}.${table}`);
}

// `ref:<logical-id>` → referenceToId('<logical-id>') (precomputed in refMap).
// `id:<token>`       → a symbolic binding: the token takes the actual value the
//                      first time it's matched and must stay consistent across
//                      all rows (cross-row FK equality / derived surrogate keys
//                      like location_id = stringToId(address) that aren't a
//                      referenceToId of any fhir resource). proposed binds are
//                      committed by the caller only when the whole row matches.
function rowMatches(exp: any, act: any, pk: string | undefined, refMap: Map<string, string>, bindings: Map<string, any>): { ok: boolean; col?: string; a?: any; e?: any; proposed?: Map<string, any> } {
    const ec = clean(exp);
    const proposed = new Map<string, any>();
    for (const col of Object.keys(act)) {
        if (col === pk && !(col in ec)) continue; // derived surrogate PK, not asserted
        if (col in ec) {
            let e = ec[col];
            if (typeof e === "string" && e.startsWith("ref:")) {
                e = refMap.get(e.slice(4)) ?? "__UNRESOLVED__";
            } else if (typeof e === "string" && e.startsWith("id:")) {
                const tok = e.slice(3);
                const known = bindings.get(tok) ?? proposed.get(tok);
                if (known !== undefined) { if (!valEq(act[col], known)) return { ok: false, col, a: act[col], e: known }; }
                else if (act[col] === null) return { ok: false, col, a: null, e: `id:${tok} (non-null)` };
                else proposed.set(tok, act[col]);
                continue;
            }
            if (!valEq(act[col], e)) return { ok: false, col, a: act[col], e };
        } else if (act[col] !== null) {
            return { ok: false, col, a: act[col], e: null };
        }
    }
    return { ok: true, proposed };
}

async function assertVariant(variant: any): Promise<string[]> {
    const expected: Record<string, any[]> = variant.omopByTable ?? {};
    const failures: string[] = [];

    // resolve all ref: ids once
    const refIds = new Set<string>();
    for (const rows of Object.values(expected)) for (const r of rows) for (const v of Object.values(r)) if (typeof v === "string" && v.startsWith("ref:")) refIds.add(v.slice(4));
    const refMap = new Map<string, string>();
    for (const id of refIds) refMap.set(id, await refToId(id));

    const produced = variant.__produced as Set<string>;
    const bindings = new Map<string, any>(); // id:<token> bindings, shared across tables in this variant

    // expected tables: exact match
    for (const [table, expRows] of Object.entries(expected)) {
        let actual: any[];
        try { actual = await fetchRows(T.cdm, table); }
        catch { failures.push(`${table}: not produced (expected ${expRows.length})`); continue; }
        const pk = PK_BY_TABLE[table];
        const used = new Array(actual.length).fill(false);
        for (const exp of expRows) {
            let found = -1, last: any = null, foundProposed: Map<string, any> | undefined;
            for (let i = 0; i < actual.length; i++) {
                if (used[i]) continue;
                const m = rowMatches(exp, actual[i], pk, refMap, bindings);
                if (m.ok) { found = i; foundProposed = m.proposed; break; } else last = m;
            }
            if (found >= 0 && foundProposed) for (const [k, v] of foundProposed) bindings.set(k, v);
            if (found < 0) {
                const hint = last ? ` (closest mismatch ${last.col}: got ${JSON.stringify(last.a)} want ${JSON.stringify(last.e)})` : "";
                failures.push(`${table}: no actual row matches expected${hint}`);
            } else used[found] = true;
        }
        actual.forEach((r, i) => { if (!used[i]) failures.push(`${table}: unexpected extra row (concept ${r[`${table}_concept_id`] ?? r.observation_concept_id ?? "?"})`); });
    }

    // unlisted produced tables must be empty
    for (const t of produced) {
        if (expected[t]) continue;
        const n = await sql.unsafe(`SELECT count(*)::int AS n FROM ${T.cdm}.${t}`);
        if (n[0].n > 0) failures.push(`${t}: ${n[0].n} unexpected rows (expected none)`);
    }
    return failures;
}

// ── main ───────────────────────────────────────────────────────────────────
const files = readdirSync("cases").filter((f) => f.endsWith(".json") && (!filter || f.includes(filter))).sort();
let pass = 0, fail = 0;
const failedCases: string[] = [];

for (const f of files) {
    const file = JSON.parse(await Bun.file(`cases/${f}`).text());
    const cases = Array.isArray(file.cases) ? file.cases : [{ desc: file.title, fhir: file.fhir, omop: file.omop }];
    console.log(`\n${f}`);
    for (let i = 0; i < cases.length; i++) {
        const v = cases[i];
        // normalize omop to {table:[rows]}
        const omopByTable: Record<string, any[]> = Array.isArray(v.omop)
            ? v.omop.reduce((o: any, r: any) => { const { table, ...rest } = r; (o[table] ??= []).push(rest); return o; }, {})
            : (v.omop ?? {});
        try {
            await resetSchemas();
            const present = await loadFhir(v.fhir ?? []);
            const produced = await runPipeline(present, f.replace(/\.json$/, ""), new Set(Object.keys(omopByTable)));
            const failures = await assertVariant({ omopByTable, __produced: produced });
            if (failures.length === 0) { pass++; console.log(`  ✓ [${i + 1}] ${v.desc}`); }
            else {
                fail++; failedCases.push(`${f} #${i + 1}`);
                console.log(`  ✗ [${i + 1}] ${v.desc}`);
                for (const x of failures) console.log(`        ${x}`);
            }
        } catch (e: any) {
            fail++; failedCases.push(`${f} #${i + 1}`);
            console.log(`  ✗ [${i + 1}] ${v.desc}\n        ERROR: ${e.message}`);
        }
    }
}

console.log(`\n${"=".repeat(50)}\n${pass} passed, ${fail} failed  (of ${pass + fail})`);
if (fail) console.log("failed: " + failedCases.join(", "));
await sql.end();
process.exit(fail ? 1 : 0);
