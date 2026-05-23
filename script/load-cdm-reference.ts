#!/usr/bin/env bun
// Build cdm.* (reference oracle) by replaying Synthea CSVs through the
// same Maps-to + domain routing our FHIR pipeline uses. Each table has
// its own SQL file in script/load-cdm/ — applied in filename order.
//
//   bun script/load-cdm-reference.ts
//
// Replaces the old monolithic script/load-cdm-person.ts.
import { $ } from "bun";
import { readdirSync } from "node:fs";

const DSN = process.env.ATHENA_DSN ?? "postgresql://athena:athena@localhost:54392/athena";
const t0 = Date.now();
const log = (m: string) => console.log(`[${((Date.now() - t0) / 1000).toFixed(2)}s] ${m}`);

await $`psql ${DSN} -v ON_ERROR_STOP=1 -c ${"CREATE SCHEMA IF NOT EXISTS cdm"}`.quiet();

const files = readdirSync("script/load-cdm").filter((f) => f.endsWith(".sql")).sort();

// Each per-table SQL file may CREATE TEMP TABLE, COPY, INSERT — all in one
// transaction so the temp tables stay visible across statements. We join the
// shared (patients.csv) loader and each per-table loader into one psql call
// so the TEMP TABLEs survive across files.
const combined: string[] = [];
for (const f of files) {
    combined.push(`-- ── ${f} ──`);
    combined.push(await Bun.file(`script/load-cdm/${f}`).text());
}
const sql = combined.join("\n");

const proc = Bun.spawn(["psql", DSN, "-v", "ON_ERROR_STOP=1"], {
    stdin: new TextEncoder().encode(sql), stdout: "inherit", stderr: "inherit",
});
const code = await proc.exited;
if (code !== 0) {
    log(`psql exited ${code}`);
    process.exit(code);
}

log(
    "cdm.* loaded. Run `bun script/etl-all.ts` to (re)build cdm_ours_fhir.* from fhir.*."
);
