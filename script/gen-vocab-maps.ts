#!/usr/bin/env bun
// Materialize cm.<vocab>_to_<domain> lookup tables — one row per
// source concept with the standard target it Maps-to. Replaces three
// nested index probes (concept × concept_relationship × concept) with
// a single hash JOIN at query time.
//
//   bun script/gen-vocab-maps.ts            # build all
//   bun script/gen-vocab-maps.ts --only=loinc_to_measurement,snomed_to_condition
//
// Why: every code-resolving stage-2 ETL pays the 3-table join cost.
// At 100-patient Synthea scale the Maps-to partial index already
// makes this sub-second per ETL; at 1M+ patients the pre-materialized
// path is materially faster (~2-10×, since hash JOIN scales
// linearly while indexed probes thrash the buffer pool).
//
// The 24 wired stage-2 SQLs are NOT rewritten — they keep their
// current vocab.concept_relationship JOINs. New edges can opt into
// the cm.* path by joining `cm.<vocab>_to_<domain>` directly.

import { SQL } from "bun";

const sql = new SQL(process.env.ATHENA_DSN ?? "postgresql://athena:athena@localhost:54392/athena");

const PAIRS: { vocab: string; domain: string }[] = [
    { vocab: "LOINC",  domain: "Measurement" },
    { vocab: "LOINC",  domain: "Observation" },
    { vocab: "SNOMED", domain: "Condition"   },
    { vocab: "SNOMED", domain: "Procedure"   },
    { vocab: "SNOMED", domain: "Observation" },
    { vocab: "SNOMED", domain: "Specimen"    },
    { vocab: "SNOMED", domain: "Device"      },
    { vocab: "RxNorm", domain: "Drug"        },
    { vocab: "ICD10CM", domain: "Condition"  },
    { vocab: "ICD9CM",  domain: "Condition"  },
    { vocab: "CPT4",   domain: "Procedure"   },
    { vocab: "HCPCS",  domain: "Procedure"   },
    { vocab: "CVX",    domain: "Drug"        },
];

function tableName(vocab: string, domain: string): string {
    return `${vocab.toLowerCase().replace(/[^a-z0-9]/g, "_")}_to_${domain.toLowerCase()}`;
}

const onlyArg = process.argv.find((a) => a.startsWith("--only="));
const only = onlyArg ? new Set(onlyArg.slice("--only=".length).split(",")) : null;
const pairs = only ? PAIRS.filter((p) => only.has(tableName(p.vocab, p.domain))) : PAIRS;

console.log("Materializing cm.<vocab>_to_<domain> tables…");
const t0 = Date.now();
let totalRows = 0;

for (const { vocab, domain } of pairs) {
    const table = `cm.${tableName(vocab, domain)}`;
    const t1 = Date.now();
    // Build the (source_code, source_concept_id, std_concept_id) projection.
    // DISTINCT ON (source_code) — pick the lowest std_concept_id when 1→N.
    await sql.unsafe(`DROP TABLE IF EXISTS ${table}`);
    const stmt = `
        CREATE TABLE ${table} AS
        SELECT DISTINCT ON (src.concept_code)
            src.concept_code AS source_code,
            src.concept_id   AS source_concept_id,
            std.concept_id   AS std_concept_id,
            std.concept_name AS std_concept_name
        FROM vocab.concept src
        JOIN vocab.concept_relationship rel
          ON rel.concept_id_1 = src.concept_id
         AND rel.relationship_id = 'Maps to'
         AND rel.invalid_reason IS NULL
        JOIN vocab.concept std
          ON std.concept_id = rel.concept_id_2
         AND std.standard_concept = 'S'
         AND std.domain_id = '${domain}'
        WHERE src.vocabulary_id = '${vocab}'
        ORDER BY src.concept_code, std.concept_id;
    `;
    try {
        await sql.unsafe(stmt);
    } catch (e: any) {
        console.log(`  ERR ${table}: ${e.message.split("\n")[0]}`);
        continue;
    }
    await sql.unsafe(`CREATE INDEX IF NOT EXISTS ix_${tableName(vocab, domain)}_src ON ${table} (source_code)`);
    await sql.unsafe(`ANALYZE ${table}`);
    const [{ n }] = await sql.unsafe(`SELECT count(*)::int AS n FROM ${table}`);
    totalRows += n;
    console.log(`  ${table.padEnd(40)} ${n.toString().padStart(8)} rows  ${(Date.now() - t1).toString().padStart(5)}ms`);
}

console.log(`\n${pairs.length} tables, ${totalRows.toLocaleString()} rows total, ${Date.now() - t0}ms`);
console.log(`use as: SELECT m.std_concept_id, m.source_concept_id`);
console.log(`        FROM staging.X v JOIN cm.<vocab>_to_<domain> m ON m.source_code = v.<col>`);
await sql.end();
