#!/usr/bin/env bun
// Resolve Synthea-style search references in fhir.* before stage-2.
//
// Synthea writes references in the search-by-identifier form, e.g.
//   "reference": "Practitioner?identifier=http://hl7.org/fhir/sid/us-npi|9999998799"
// instead of the direct form
//   "reference": "Practitioner/<UUID>"
//
// Our stage-2 ETLs hash hash(Practitioner.id) on the producer side
// (Practitioner__provider) but `getReferenceKey()` on the consumer side
// extracts the tail-after-`:`, which on a search-ref yields the raw
// "us-npi|9999998799" string. The two hashes don't match → every
// provider/organization/location FK is dangling.
//
// Fix: walk fhir.* once, replace every search-ref string with the
// equivalent direct-ref string. After this pass:
//   - Practitioner__provider hashes Practitioner.id (unchanged)
//   - All consumers extract Practitioner.id via getReferenceKey() and
//     hash the same string → FKs align.
//
// Idempotent: a direct-ref doesn't match the search-ref regex, so
// re-runs are no-ops.
//
//   bun script/resolve-search-refs.ts        # all tables
//   bun script/resolve-search-refs.ts --dry  # report would-rewrite counts only

import { SQL } from "bun";

const sql = new SQL(process.env.ATHENA_DSN ?? "postgresql://athena:athena@localhost:54392/athena");
const dry = process.argv.includes("--dry");

const log = (m: string) => console.log(`[${new Date().toISOString().slice(11, 19)}] ${m}`);

// 1. Build lookups: search-ref string → direct-ref string
log("building Resource?identifier=… → Resource/<id> lookups");
const lookup = new Map<string, string>();

type Spec = { type: string; system: string; table: string };
const SPECS: Spec[] = [
    { type: "Practitioner", system: "http://hl7.org/fhir/sid/us-npi",          table: "fhir.practitioner" },
    { type: "Organization", system: "https://github.com/synthetichealth/synthea", table: "fhir.organization" },
    { type: "Location",     system: "https://github.com/synthetichealth/synthea", table: "fhir.location" },
];

for (const spec of SPECS) {
    const rows = await sql.unsafe(`
        SELECT id, jsonb_array_elements(resource->'identifier') AS ident
        FROM ${spec.table}
        WHERE resource ? 'identifier'
    `) as { id: string; ident: { system?: string; value?: string } }[];

    let added = 0;
    for (const r of rows) {
        if (r.ident?.system !== spec.system || !r.ident.value) continue;
        const search = `${spec.type}?identifier=${spec.system}|${r.ident.value}`;
        const direct = `${spec.type}/${r.id}`;
        if (lookup.has(search) && lookup.get(search) !== direct) {
            log(`  WARN duplicate identifier ${search}: ${lookup.get(search)} vs ${direct}`);
            continue;
        }
        lookup.set(search, direct);
        added++;
    }
    log(`  ${spec.type.padEnd(13)} ${added} identifiers indexed (system=${spec.system})`);
}

if (lookup.size === 0) {
    log("nothing to resolve");
    await sql.end();
    process.exit(0);
}

// 2. Walk affected tables, rewrite each row's resource JSON
const AFFECTED = [
    "fhir.encounter",
    "fhir.procedure",
    "fhir.medication_request",
    "fhir.medication_administration",
    "fhir.immunization",
    "fhir.diagnostic_report",
    "fhir.observation",
    "fhir.condition",
    "fhir.allergy_intolerance",
    "fhir.device",
    "fhir.patient",
];

function rewrite(node: any): { node: any; changed: number } {
    let changed = 0;
    if (Array.isArray(node)) {
        for (let i = 0; i < node.length; i++) {
            const r = rewrite(node[i]);
            if (r.changed) { node[i] = r.node; changed += r.changed; }
        }
        return { node, changed };
    }
    if (node && typeof node === "object") {
        // FHIR Reference: { reference: "...", display?: "..." }
        if (typeof node.reference === "string") {
            const direct = lookup.get(node.reference);
            if (direct) {
                node.reference = direct;
                changed++;
            }
        }
        for (const k of Object.keys(node)) {
            const r = rewrite(node[k]);
            if (r.changed) { node[k] = r.node; changed += r.changed; }
        }
    }
    return { node, changed };
}

let totalRowsRewritten = 0;
let totalRefsRewritten = 0;

for (const tbl of AFFECTED) {
    const t0 = Date.now();
    // Only fetch rows that actually contain `?identifier=` — skip the rest.
    const rows = await sql.unsafe(
        `SELECT id, resource FROM ${tbl} WHERE resource::text ~ '\\?identifier='`,
    ) as { id: string; resource: any }[];
    if (rows.length === 0) {
        log(`  ${tbl.padEnd(35)} 0 rows match`);
        continue;
    }

    let rowsTouched = 0;
    let refsTouched = 0;
    // Bun.SQL re-encodes string params, so a JSON.stringify'd object
    // passed as $1::jsonb gets stored as a json-string scalar (jsonb_typeof
    // = 'string'). To stay correct we inline the literal in the SQL text
    // using server-side $tag$...$tag$ dollar-quoting (no escaping needed)
    // and ::jsonb-cast on the server.
    for (const r of rows) {
        const { changed } = rewrite(r.resource);
        if (changed === 0) continue;
        refsTouched += changed;
        rowsTouched++;
        if (!dry) {
            const json = JSON.stringify(r.resource);
            // dollar-quote tag must not collide with the JSON body.
            let tag = "j";
            while (json.includes(`$${tag}$`)) tag += "x";
            const escId = r.id.replaceAll("'", "''");
            await sql.unsafe(
                `UPDATE ${tbl} SET resource = $${tag}$${json}$${tag}$::jsonb WHERE id = '${escId}'`,
            );
        }
    }
    totalRowsRewritten += rowsTouched;
    totalRefsRewritten += refsTouched;
    log(`  ${tbl.padEnd(35)} ${rowsTouched.toString().padStart(6)} rows, ${refsTouched.toString().padStart(6)} refs ${dry ? "(dry)" : "rewritten"} ${Date.now() - t0}ms`);
}

log(`\ntotal: ${totalRowsRewritten} rows, ${totalRefsRewritten} refs ${dry ? "would be" : ""} rewritten`);
await sql.end();
