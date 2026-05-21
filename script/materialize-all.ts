#!/usr/bin/env bun
// Materialize all stage-1 ViewDefinitions into staging.* for the 9 edges
// that have stage-2 ETL SQL.
import { resolve } from "node:path";
import materialize from "../src/viewdef/materialize";

const JOBS: Array<{ view: string; source: string; target: string }> = [
    { view: "Patient__person",                source: "fhir.patient",            target: "staging.patient_person" },
    { view: "Organization__care_site",        source: "fhir.organization",       target: "staging.organization_care_site" },
    { view: "Practitioner__provider",         source: "fhir.practitioner",       target: "staging.practitioner_provider" },
    { view: "Encounter__visit_occurrence",    source: "fhir.encounter",          target: "staging.encounter_visit" },
    { view: "Condition__condition_occurrence",source: "fhir.condition",          target: "staging.condition_occurrence" },
    { view: "Observation__measurement",       source: "fhir.observation",        target: "staging.obs_meas_view" },
    { view: "Observation__observation",       source: "fhir.observation",        target: "staging.obs_obs_view" },
    { view: "DiagnosticReport__measurement",  source: "fhir.diagnostic_report",  target: "staging.dr_meas_view" },
];

const ctx = { env: process.env, fns: {} as any } as any;
ctx.fns.db = { query: (await import("../src/db/query")).default };

for (const j of JOBS) {
    const path = resolve("mapspec/views", `${j.view}.view.json`);
    const vd = JSON.parse(await Bun.file(path).text());
    process.stdout.write(`${j.view} → ${j.target} … `);
    try {
        const r = await materialize(ctx, { viewDefinition: vd, source: j.source, target: j.target });
        console.log(`${r.rows.toLocaleString()} rows in ${(r.ms/1000).toFixed(1)}s`);
    } catch (e: any) {
        console.log(`FAILED: ${e.message}`);
    }
}
process.exit(0);
