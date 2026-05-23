#!/usr/bin/env bun
// Scaffold a stage-2 SQL skeleton from an edge.json.
//
//   bun script/scaffold-edge.ts mapspec/edges/<NewEdge>.json
//
// Writes mapspec/etl/<NewEdge>.sql with one SELECT line per field,
// `referenceToId(...)` for FK references, constants inlined, and a
// `-- TODO` comment wherever the edge declares concept_map / fk-to-CONCEPT
// (i.e. needs a vocab JOIN you must add by hand).
//
// Why scaffold, not full codegen: the 24 existing stage-2 SQLs carry
// hand-tuned CTEs, JOIN ordering, vocab priority and Synthea-specific
// comments that don't round-trip through edge.json. A generator that
// re-emits them would either lose nuance or require turning edge.json
// into a SQL-in-JSON DSL. Scaffolding hits the smaller win — make NEW
// edges cheap to start — without touching what works.

import { readFileSync, existsSync, writeFileSync } from "node:fs";

const file = process.argv[2];
if (!file) {
    console.error("usage: bun script/scaffold-edge.ts <path-to-edge.json>");
    process.exit(2);
}
const edge = JSON.parse(readFileSync(file, "utf-8"));
const stem = file.split("/").pop()!.replace(/\.json$/, "");
const target = `mapspec/etl/${stem}.sql`;
if (existsSync(target) && !process.argv.includes("--force")) {
    console.error(`refusing to overwrite ${target} (re-run with --force)`);
    process.exit(1);
}

const stagingTable = `staging.${stem.toLowerCase().replace(/__/g, "_")}`;

function lineFor(f: any): { expr: string; col: string; comment: string } {
    const col   = f.omop_column;
    const ty    = (f.omop_type ?? "text").toLowerCase();
    const fk    = (f.fk ?? "").toString().toUpperCase();
    const path  = f.fhir_path ?? "";

    if (f.constant !== undefined && f.constant !== null) {
        const v = typeof f.constant === "number" ? f.constant : `'${f.constant}'`;
        return { expr: `${v}::${ty}`, col, comment: "constant" };
    }
    if (f.pk) {
        return { expr: `hashtextextended(v.id, 0)::bigint`, col, comment: "surrogate PK" };
    }
    if (fk && fk !== "CONCEPT") {
        return { expr: `referenceToId(v.${guessRefCol(path)})`, col, comment: `FK ${fk}` };
    }
    if (fk === "CONCEPT" || f.concept_map) {
        return { expr: `NULL::${ty}`, col, comment: "TODO vocab JOIN / cm.* lookup" };
    }
    return { expr: `v.${guessRefCol(path)}::${ty}`, col, comment: "" };
}

function guessRefCol(path: string): string {
    // Last segment of the FHIR path → likely staging column name.
    // (Imperfect — author refines once view+staging columns are settled.)
    const seg = path.split(/[.()]/).filter(Boolean).pop() ?? "value";
    return seg.toLowerCase().replace(/[^a-z0-9_]/g, "_");
}

const header = [
    `-- Stage-2 ETL: ${edge.fhir_resource} → ${edge.omop_table} (OMOP CDM v5.4)`,
    `-- SCAFFOLDED from ${file} by script/scaffold-edge.ts.`,
    `-- Review every line; fill in vocab JOINs marked TODO; remove this banner.`,
    "",
].join("\n");

const items = (edge.fields ?? []).map(lineFor);
// Compute alignment for `expr  AS  col,  -- comment` so the SQL is readable.
const exprPad = Math.max(0, ...items.map((i) => i.expr.length));
const colPad  = Math.max(0, ...items.map((i) => i.col.length));
const rendered = items.map((i, idx) => {
    const trailingComma = idx === items.length - 1 ? " " : ",";
    const base = `    ${i.expr.padEnd(exprPad)} AS ${i.col.padEnd(colPad)}${trailingComma}`;
    return i.comment ? `${base} -- ${i.comment}` : base;
});
const lines = rendered.join("\n");

const out = `${header}\nSELECT\n${lines}\n\nFROM ${stagingTable} v\n;\n`;

writeFileSync(target, out);
console.log(`wrote ${target} (${edge.fields?.length ?? 0} columns scaffolded)`);
console.log(`  next: edit JOINs, validate with: bun script/lint-edges.ts`);
