#!/usr/bin/env bun
// One-command full rebuild of cdm_ours_fhir.* from fhir.*:
//   1. apply mapspec/etl/_functions.sql (helper functions)
//   2. materialize cm.* from mapspec/profiles/*.cm.json
//   3. materialize staging.* from mapspec/views/*.view.json
//   4. run stage-2 ETLs in the right order (TRUNCATE-first vs APPEND)
//
// Run after `bun script/load-fhir.ts synthea/output/fhir`.
//
//   bun script/etl-all.ts           # default: all edges
//   bun script/etl-all.ts --only Patient__person,Condition__condition_occurrence
//
import { SQL } from "bun";
import { $ } from "bun";
import { resolve } from "node:path";
import { readdirSync } from "node:fs";
import { PLAN, colCount } from "./etl-plan";

const DSN = process.env.ATHENA_DSN ?? "postgresql://athena:athena@localhost:54392/athena";
const sql = new SQL(DSN, { idleTimeout: 0, maxLifetime: 0 });
const psql = (s: string) => $`psql ${DSN} -v ON_ERROR_STOP=1 -c ${s}`.quiet();
const psqlFile = (p: string) => $`psql ${DSN} -v ON_ERROR_STOP=1 -f ${p}`.quiet();
const psqlScript = async (sqlText: string) => {
    const proc = Bun.spawn(["psql", DSN, "-v", "ON_ERROR_STOP=1"], {
        stdin: new TextEncoder().encode(sqlText), stdout: "pipe", stderr: "pipe",
    });
    const code = await proc.exited;
    if (code !== 0) {
        const err = await new Response(proc.stderr).text();
        throw new Error(`psql exited ${code}: ${err}`);
    }
};

const t0 = Date.now();
const log = (m: string) => console.log(`[${((Date.now() - t0) / 1000).toFixed(2)}s] ${m}`);

// Edge plan lives in script/etl-plan.ts (shared with the test runner).
// Parse --only filter and --strict-profiles flag
const onlyArg = process.argv.find((a) => a.startsWith("--only="));
const only = onlyArg ? new Set(onlyArg.slice("--only=".length).split(",")) : null;
const plan = only ? PLAN.filter((p) => only.has(p.edge)) : PLAN;
const strictProfiles = process.argv.includes("--strict-profiles");

// ── 1. helper functions ─────────────────────────────────────────────────────
log("apply mapspec/etl/_functions.sql");
await psqlFile("mapspec/etl/_functions.sql");

// ── 2. materialize ConceptMaps ──────────────────────────────────────────────
log("materialize ConceptMaps");
const ctx: any = { env: process.env, fns: {}, state: {} };
ctx.fns.db = { query: (await import("../src/db/query")).default };
ctx.fns.profiles = { load: (await import("../src/profiles/load")).default };
const cmMat = (await import("../src/conceptmap/materialize")).default;
const { conceptmaps } = await ctx.fns.profiles.load(ctx);
for (const cm of conceptmaps) {
    const r = await cmMat(ctx, { cm });
    log(`  ${r.table.padEnd(45)} ${r.rows} rows`);
}

// ── 3. materialize staging tables ───────────────────────────────────────────
// When multiple edges share one staging table (Patient_person and
// Patient_location both consume staging.patient_person, etc.), pick the
// view that DECLARES the most columns — it's the canonical superset that
// covers all sibling stage-2 SQLs.
log("materialize staging.*");
ctx.fns.viewdef = { materialize: (await import("../src/viewdef/materialize")).default };

const stagedBest = new Map<string, { edge: string; src: string; cols: number }>();
for (const p of plan) {
    const sqlFile = `mapspec/views/${p.edge}.view.json`;
    if (!(await Bun.file(sqlFile).exists())) continue;
    const view = JSON.parse(await Bun.file(sqlFile).text());
    const cols = colCount(view);
    const existing = stagedBest.get(p.staging);
    if (!existing || cols > existing.cols) stagedBest.set(p.staging, { edge: p.edge, src: p.src, cols });
}

const compileProfile = (await import("../src/profiles/compile")).default;

for (const [staging, { edge, src }] of stagedBest) {
    const vd = JSON.parse(await Bun.file(`mapspec/views/${edge}.view.json`).text());
    // Profile-gated filter: if --strict-profiles AND a matching profile
    // exists, compile its min:1 elements into a SQL WHERE clause and
    // pass to materialize. Off by default so cdm_ours_fhir.* row counts
    // remain stable for the diff page.
    let whereSql: string | undefined;
    if (strictProfiles) {
        const ppath = `mapspec/profiles/${edge}.profile.json`;
        if (await Bun.file(ppath).exists()) {
            const profile = JSON.parse(await Bun.file(ppath).text());
            const compiled = compileProfile(ctx, { profile, alias: "f" });
            if (compiled.predicates.length > 0) {
                whereSql = compiled.whereSql;
                log(`  ${edge}: profile-gated (${compiled.predicates.length} predicates)`);
            }
        }
    }
    const r = await ctx.fns.viewdef.materialize(ctx, { viewDefinition: vd, source: src, target: staging, whereSql });
    log(`  ${staging.padEnd(60)} ${r.rows.toString().padStart(7)} rows  ${r.ms}ms   (via ${edge})`);
}

// Postgres planner needs fresh statistics on the just-materialized staging.*
// + cm.* tables, otherwise it picks bad plans for the stage-2 vocab JOINs
// (observed: Observation__measurement degraded from 5s → 56s without this).
log("ANALYZE staging.* + cm.*");
for (const staging of stagedBest.keys()) await psql(`ANALYZE ${staging}`);
for (const cm of conceptmaps)             await psql(`ANALYZE cm.${cm.id.replace(/-/g, "_")}`);

// ── 3b. Shared resolve passes ─────────────────────────────────────────────
// mapspec/etl/_resolve_*.sql files build derived staging tables so per-
// domain stage-2 ETLs don't repeat the same vocab JOIN N times. Each file
// is idempotent (DROP + CREATE TABLE AS). Run order is alphabetical (only
// matters within a single resource family).
log("resolve passes (_resolve_*.sql)");
const resolveFiles = readdirSync("mapspec/etl")
    .filter((f) => f.startsWith("_resolve_") && f.endsWith(".sql"))
    .sort();
for (const f of resolveFiles) {
    const t1 = Date.now();
    await psqlFile(`mapspec/etl/${f}`);
    log(`  ${f.padEnd(40)} ${Date.now() - t1}ms`);
}

// ── 4. stage-2 ETLs ─────────────────────────────────────────────────────────
log("stage-2 ETLs");
for (const p of plan) {
    const sqlFile = `mapspec/etl/${p.edge}.sql`;
    if (!(await Bun.file(sqlFile).exists())) {
        log(`  skip ${p.edge} (no stage-2 SQL)`);
        continue;
    }
    const t1 = Date.now();
    const body = await Bun.file(sqlFile).text();

    let stmt: string;
    if (p.mode === "truncate") stmt = `TRUNCATE TABLE ${p.target};\nINSERT INTO ${p.target}\n${body}`;
    else if (p.mode === "append") stmt = `INSERT INTO ${p.target}\n${body}`;
    else /* update */            stmt = body;

    try {
        await psqlScript(stmt);
    } catch (e: any) {
        log(`  ERR ${p.edge}: ${(e.message ?? String(e)).split("\n")[0]}`);
        continue;
    }
    const ms = Date.now() - t1;
    const n = (await sql.unsafe(`SELECT count(*)::int AS n FROM ${p.target}`))[0].n;
    log(`  ${p.edge.padEnd(50)} → ${p.target.padEnd(40)} ${n.toString().padStart(7)} rows  ${ms}ms  [${p.mode}]`);
}

// ── 5. PK / unique constraints on cdm_ours_fhir.* ───────────────────────────
// Surrogate IDs are 64-bit hashes — collision probability is tiny but
// non-zero. Without a PK an accidental duplicate from multi-edge appends
// would silently coexist. We DROP-and-recreate the PK so the load is
// idempotent.
log("PK / unique constraints");
const PK_BY_TABLE: Record<string, string> = {
    "person":                "person_id",
    "location":              "location_id",
    "care_site":             "care_site_id",
    "provider":              "provider_id",
    "visit_occurrence":      "visit_occurrence_id",
    "condition_occurrence":  "condition_occurrence_id",
    "procedure_occurrence":  "procedure_occurrence_id",
    "measurement":           "measurement_id",
    "observation":           "observation_id",
    "note":                  "note_id",
    "drug_exposure":         "drug_exposure_id",
    "device_exposure":       "device_exposure_id",
    "death":                 "person_id",      // death has no own surrogate
    "observation_period":    "observation_period_id",
};
for (const [tbl, col] of Object.entries(PK_BY_TABLE)) {
    const ok = await sql.unsafe(
        `SELECT 1 FROM information_schema.tables WHERE table_schema='cdm_ours_fhir' AND table_name=$1`,
        [tbl],
    );
    if (ok.length === 0) continue;
    // Drop any existing PK on the table then add fresh one.
    await psql(`
        DO $$ DECLARE c text;
        BEGIN
            SELECT conname INTO c FROM pg_constraint
              WHERE conrelid = 'cdm_ours_fhir.${tbl}'::regclass AND contype = 'p';
            IF c IS NOT NULL THEN EXECUTE format('ALTER TABLE cdm_ours_fhir.${tbl} DROP CONSTRAINT %I', c); END IF;
        END$$;
        ALTER TABLE cdm_ours_fhir.${tbl} ADD PRIMARY KEY (${col});
    `).catch((e: any) => {
        const msg = (e.message ?? String(e)).split("\n")[0].slice(0, 120);
        log(`  WARN ${tbl}: ${msg}`);
    });
    log(`  PK on cdm_ours_fhir.${tbl} (${col})`);
}

log("done");
await sql.end();
process.exit(0);
