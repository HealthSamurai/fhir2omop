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

// Edge plan — each entry: { edge, view-stem, source, staging, target, mode }.
//   mode 'truncate'  → TRUNCATE target before INSERT (first edge writing to it)
//   mode 'append'    → APPEND to target (sibling edges)
//   mode 'update'    → run as-is (PractitionerRole's UPDATE-via-CTE)
//
// Order matters: per-target, the first edge truncates, subsequent append.
const PLAN: Array<{ edge: string; src: string; staging: string; target: string; mode: "truncate" | "append" | "update" }> = [
    // — core dimension tables —
    { edge: "Practitioner__provider",                 src: "fhir.practitioner",          staging: "staging.practitioner_provider",                target: "cdm_ours_fhir.provider",             mode: "truncate" },
    { edge: "Organization__care_site",                src: "fhir.organization",          staging: "staging.organization_care_site",               target: "cdm_ours_fhir.care_site",            mode: "truncate" },
    { edge: "Location__care_site",                    src: "fhir.location",              staging: "staging.location_care_site",                   target: "cdm_ours_fhir.care_site",            mode: "append" },
    { edge: "Patient__location",                      src: "fhir.patient",               staging: "staging.patient_person",                       target: "cdm_ours_fhir.location",             mode: "truncate" },
    { edge: "Location__location",                     src: "fhir.location",              staging: "staging.location_location",                    target: "cdm_ours_fhir.location",             mode: "append" },
    { edge: "Patient__person",                        src: "fhir.patient",               staging: "staging.patient_person",                       target: "cdm_ours_fhir.person",               mode: "truncate" },

    // — visits (FK target for everything below) —
    { edge: "Encounter__visit_occurrence",            src: "fhir.encounter",             staging: "staging.encounter_visit",                      target: "cdm_ours_fhir.visit_occurrence",     mode: "truncate" },

    // — clinical events —
    { edge: "Condition__condition_occurrence",        src: "fhir.condition",             staging: "staging.condition_occurrence",                 target: "cdm_ours_fhir.condition_occurrence", mode: "truncate" },
    { edge: "Procedure__procedure_occurrence",        src: "fhir.procedure",             staging: "staging.procedure_occurrence",                 target: "cdm_ours_fhir.procedure_occurrence", mode: "truncate" },
    { edge: "DiagnosticReport__procedure_occurrence", src: "fhir.diagnostic_report",     staging: "staging.diagnosticreport_procedure_occurrence",target: "cdm_ours_fhir.procedure_occurrence", mode: "append" },

    { edge: "Observation__measurement",               src: "fhir.observation",           staging: "staging.obs_meas_view",                        target: "cdm_ours_fhir.measurement",          mode: "truncate" },
    { edge: "Observation_component__measurement",     src: "fhir.observation",           staging: "staging.observation_component_measurement",    target: "cdm_ours_fhir.measurement",          mode: "append" },
    { edge: "DiagnosticReport__measurement",          src: "fhir.diagnostic_report",     staging: "staging.diagnosticreport_measurement",         target: "cdm_ours_fhir.measurement",          mode: "append" },

    { edge: "Observation__observation",               src: "fhir.observation",           staging: "staging.obs_obs_view",                         target: "cdm_ours_fhir.observation",          mode: "truncate" },
    { edge: "AllergyIntolerance__observation",        src: "fhir.allergy_intolerance",   staging: "staging.allergyintolerance_observation",       target: "cdm_ours_fhir.observation",          mode: "append" },
    { edge: "DiagnosticReport__observation",          src: "fhir.diagnostic_report",     staging: "staging.diagnosticreport_observation",         target: "cdm_ours_fhir.observation",          mode: "append" },

    { edge: "DiagnosticReport__note",                 src: "fhir.diagnostic_report",     staging: "staging.diagnosticreport_note",                target: "cdm_ours_fhir.note",                 mode: "truncate" },

    { edge: "MedicationRequest__drug_exposure",       src: "fhir.medication_request",    staging: "staging.medicationrequest_drug_exposure",      target: "cdm_ours_fhir.drug_exposure",        mode: "truncate" },
    { edge: "MedicationAdministration__drug_exposure",src: "fhir.medication_administration", staging: "staging.medicationadministration_drug_exposure", target: "cdm_ours_fhir.drug_exposure",   mode: "append" },
    { edge: "Immunization__drug_exposure",            src: "fhir.immunization",          staging: "staging.immunization_drug_exposure",           target: "cdm_ours_fhir.drug_exposure",        mode: "append" },

    { edge: "Device__device_exposure",                src: "fhir.device",                staging: "staging.device_device_exposure",               target: "cdm_ours_fhir.device_exposure",      mode: "truncate" },
    { edge: "Patient__death",                         src: "fhir.patient",               staging: "staging.patient_death",                        target: "cdm_ours_fhir.death",                mode: "truncate" },

    // — derived (must run after visit_occurrence is populated) —
    { edge: "Patient__observation_period",            src: "fhir.patient",               staging: "staging.patient_observation_period",           target: "cdm_ours_fhir.observation_period",   mode: "truncate" },

    // — enrichments —
    { edge: "PractitionerRole__provider",             src: "fhir.practitioner_role",     staging: "staging.practitionerrole_provider",            target: "cdm_ours_fhir.provider",             mode: "update" },
];

// Parse --only filter
const onlyArg = process.argv.find((a) => a.startsWith("--only="));
const only = onlyArg ? new Set(onlyArg.slice("--only=".length).split(",")) : null;
const plan = only ? PLAN.filter((p) => only.has(p.edge)) : PLAN;

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

function colCount(view: any): number {
    let n = 0;
    const walk = (s: any) => { n += (s.column ?? []).length; for (const c of s.select ?? []) walk(c); };
    for (const top of view.select ?? []) walk(top);
    return n;
}

const stagedBest = new Map<string, { edge: string; src: string; cols: number }>();
for (const p of plan) {
    const sqlFile = `mapspec/views/${p.edge}.view.json`;
    if (!(await Bun.file(sqlFile).exists())) continue;
    const view = JSON.parse(await Bun.file(sqlFile).text());
    const cols = colCount(view);
    const existing = stagedBest.get(p.staging);
    if (!existing || cols > existing.cols) stagedBest.set(p.staging, { edge: p.edge, src: p.src, cols });
}

for (const [staging, { edge, src }] of stagedBest) {
    const vd = JSON.parse(await Bun.file(`mapspec/views/${edge}.view.json`).text());
    const r = await ctx.fns.viewdef.materialize(ctx, { viewDefinition: vd, source: src, target: staging });
    log(`  ${staging.padEnd(60)} ${r.rows.toString().padStart(7)} rows  ${r.ms}ms   (via ${edge})`);
}

// Postgres planner needs fresh statistics on the just-materialized staging.*
// + cm.* tables, otherwise it picks bad plans for the stage-2 vocab JOINs
// (observed: Observation__measurement degraded from 5s → 56s without this).
log("ANALYZE staging.* + cm.*");
for (const staging of stagedBest.keys()) await psql(`ANALYZE ${staging}`);
for (const cm of conceptmaps)             await psql(`ANALYZE cm.${cm.id.replace(/-/g, "_")}`);

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
