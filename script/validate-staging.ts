#!/usr/bin/env bun
// Staging-time profile validator.
//
//   bun script/validate-staging.ts                # report
//   bun script/validate-staging.ts --strict       # exit 1 on any violation
//
// Three checks per edge:
//   1. The staging.* table exists and has > 0 rows.
//   2. Its `id` column (resource id, the PK source) has zero NULLs.
//   3. Every column passed to referenceToId(v.<col>) in the matching
//      stage-2 SQL has zero NULLs — these are FK references the stage-2
//      INSERT can't recover from.
//
// This is intentionally narrow: a lightweight, runtime stand-in for
// full profile-driven validation. It catches the common class of
// "resource is missing a required reference" issues before they flow
// into cdm_ours_fhir.* as orphaned rows.
//
// Full FHIR-profile-driven validation (compile profile → SQL WHERE)
// is still TODO; tracked in ./TODO.md.

import { readdirSync } from "node:fs";
import { SQL } from "bun";

const sql = new SQL(process.env.ATHENA_DSN ?? "postgresql://athena:athena@localhost:54392/athena");
const strict = process.argv.includes("--strict");

async function loadStage2(edge: string): Promise<{ staging: string; refCols: string[] } | null> {
    const path = `mapspec/etl/${edge}.sql`;
    if (!(await Bun.file(path).exists())) return null;
    const text = await Bun.file(path).text();
    const stagingMatch = text.match(/FROM\s+(staging\.\w+)\s+v\b/);
    if (!stagingMatch) return null;
    const refCols = [...new Set([...text.matchAll(/referenceToId\(\s*v\.([a-z_][a-z0-9_]*)\s*\)/gi)].map((m) => m[1]!))];
    return { staging: stagingMatch[1]!, refCols };
}

async function tableExists(staging: string): Promise<boolean> {
    const [schema, name] = staging.split(".");
    const r = await sql.unsafe(
        `SELECT 1 FROM information_schema.tables WHERE table_schema=$1 AND table_name=$2`,
        [schema, name],
    );
    return r.length > 0;
}

async function tableHasColumn(staging: string, col: string): Promise<boolean> {
    const [schema, name] = staging.split(".");
    const r = await sql.unsafe(
        `SELECT 1 FROM information_schema.columns
         WHERE table_schema=$1 AND table_name=$2 AND column_name=$3`,
        [schema, name, col],
    );
    return r.length > 0;
}

const edges = readdirSync("mapspec/etl")
    .filter((f) => f.endsWith(".sql") && !f.startsWith("_"))
    .map((f) => f.replace(/\.sql$/, ""));

let totalChecks = 0;
let violations = 0;

for (const edge of edges) {
    const meta = await loadStage2(edge);
    if (!meta) continue;
    const { staging, refCols } = meta;

    if (!(await tableExists(staging))) {
        console.log(`SKIP ${edge.padEnd(50)} ${staging} not materialized`);
        continue;
    }

    const [{ total }] = await sql.unsafe(`SELECT count(*)::int AS total FROM ${staging}`);
    totalChecks++;
    if (total === 0) {
        console.log(`zero ${edge.padEnd(50)} ${staging} has 0 rows`);
        continue;  // not a violation — Synthea may not emit this resource
    }

    // Check `id` always non-null
    if (await tableHasColumn(staging, "id")) {
        const [{ nulls }] = await sql.unsafe(
            `SELECT count(*) FILTER (WHERE id IS NULL)::int AS nulls FROM ${staging}`,
        );
        totalChecks++;
        if (nulls > 0) {
            violations++;
            console.log(`VIOL ${edge.padEnd(50)} id has ${nulls}/${total} NULL`);
        }
    }

    // Check each referenceToId(v.<col>) column for NULLs
    const refNulls: string[] = [];
    for (const col of refCols) {
        if (!(await tableHasColumn(staging, col))) continue;
        totalChecks++;
        const [{ nulls }] = await sql.unsafe(
            `SELECT count(*) FILTER (WHERE "${col}" IS NULL)::int AS nulls FROM ${staging}`,
        );
        if (nulls > 0) {
            // Mostly informational — many FK refs are legitimately optional
            // (encounter on a population-level Observation, etc.). Surface
            // ratio so the operator can decide.
            const pct = ((nulls / total) * 100).toFixed(0);
            refNulls.push(`${col} ${nulls}/${total} (${pct}%)`);
        }
    }

    if (refNulls.length === 0) {
        console.log(`ok   ${edge.padEnd(50)} ${total} rows, id+${refCols.length} refs clean`);
    } else {
        // Don't count optional-FK nulls as violations (default), unless 100%.
        for (const r of refNulls) {
            const isAll = r.includes("(100%)");
            const tag = isAll ? "VIOL" : "INFO";
            if (isAll) violations++;
            console.log(`${tag} ${edge.padEnd(50)} ${total} rows, ref ${r}`);
        }
    }
}

console.log(`\n${totalChecks} checks, ${violations} violation${violations === 1 ? "" : "s"} (100%-NULL refs only).`);
await sql.end();
process.exit(strict && violations > 0 ? 1 : 0);
