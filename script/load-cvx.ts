#!/usr/bin/env bun
// Load CVX (vaccine codes) into vocab.* from the CDC source.
//
// Background: the Athena bundle excludes CVX (license). Synthea
// Immunization resources are 100% CVX-coded, so without this our
// drug_exposure pipeline drops every immunization on the floor.
//
// CDC publishes CVX as a pipe-delimited text file (no auth, ~200 rows):
//   https://www2a.cdc.gov/vaccines/iis/iisstandards/downloads/cvx.txt
//
// Format: code | short_name | full_name | notes | status | nonvaccine | update_date
//
// We load these into vocab.concept with synthetic concept_ids starting
// from the OMOP Extension reserve range (2_000_000_000) so they can't
// collide with future Athena bundle imports. domain_id='Drug',
// vocabulary_id='CVX', standard_concept=NULL (CVX is non-standard;
// Maps-to → RxNorm would come from a future Athena bundle that
// includes it).
//
//   bun script/load-cvx.ts                # idempotent: skips if vocabulary_id='CVX' already has rows

import { SQL } from "bun";

const CDC_URL = "https://www2a.cdc.gov/vaccines/iis/iisstandards/downloads/cvx.txt";
const CONCEPT_ID_BASE = 2_000_000_000;

const sql = new SQL(process.env.ATHENA_DSN ?? "postgresql://athena:athena@localhost:54392/athena");

const [{ existing }] = await sql.unsafe(
    `SELECT count(*)::int AS existing FROM vocab.concept WHERE vocabulary_id = 'CVX'`,
);
if (existing > 0) {
    console.log(`CVX already loaded (${existing} rows). Pass --force to reload.`);
    if (!process.argv.includes("--force")) {
        await sql.end();
        process.exit(0);
    }
    await sql.unsafe(`DELETE FROM vocab.concept WHERE vocabulary_id = 'CVX'`);
    await sql.unsafe(`DELETE FROM vocab.vocabulary WHERE vocabulary_id = 'CVX'`);
    console.log("  cleared, reloading…");
}

console.log(`fetching ${CDC_URL}`);
const resp = await fetch(CDC_URL);
if (!resp.ok) {
    console.error(`failed: HTTP ${resp.status}`);
    process.exit(1);
}
const text = await resp.text();
const lines = text.split("\n").filter((l) => l.trim());

const rows: { code: string; name: string; notes: string; status: string; date: string }[] = [];
for (const line of lines) {
    const parts = line.split("|").map((p) => p.trim());
    if (parts.length < 6) continue;
    const [code, _short, full, notes, status, _nonvax, date] = parts;
    if (!code || !/^\d+$/.test(code)) continue;
    rows.push({ code, name: full!, notes: notes ?? "", status: status ?? "Active", date: date ?? "2000/01/01" });
}
console.log(`parsed ${rows.length} CVX codes from CDC`);

// Register the vocabulary itself.
const [{ has_vocab }] = await sql.unsafe(
    `SELECT count(*)::int AS has_vocab FROM vocab.vocabulary WHERE vocabulary_id = 'CVX'`,
);
if (!has_vocab) {
    await sql.unsafe(
        `INSERT INTO vocab.vocabulary
            (vocabulary_id, vocabulary_name, vocabulary_reference, vocabulary_version, vocabulary_concept_id)
         VALUES ('CVX', 'CDC Vaccine Administered (CVX)', $1, current_date::text, 0)`,
        [CDC_URL],
    );
}

const today = new Date().toISOString().slice(0, 10);
let inserted = 0;
for (const [i, row] of rows.entries()) {
    const conceptId = CONCEPT_ID_BASE + i;
    const validStart = (row.date ?? "2000/01/01").replaceAll("/", "-");
    const validEnd   = row.status === "Active" ? "2099-12-31" : today;
    const invalid    = row.status === "Active" ? null : "D";
    await sql.unsafe(
        `INSERT INTO vocab.concept (
            concept_id, concept_name, domain_id, vocabulary_id, concept_class_id,
            standard_concept, concept_code, valid_start_date, valid_end_date, invalid_reason
         ) VALUES ($1, $2, 'Drug', 'CVX', 'CVX', NULL, $3, $4::date, $5::date, $6)`,
        [conceptId, row.name.slice(0, 255), row.code, validStart, validEnd, invalid],
    );
    inserted++;
}

console.log(`inserted ${inserted} CVX concepts (concept_id range ${CONCEPT_ID_BASE}..${CONCEPT_ID_BASE + inserted - 1})`);
await sql.unsafe(`ANALYZE vocab.concept`);
await sql.end();
