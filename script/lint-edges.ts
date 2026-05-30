#!/usr/bin/env bun
// Lint: every column a stage-2 ETL references via `v.<col>` must be
// declared in the corresponding view's select.column[].name.
//
// Catches the silent "column does not exist" failure at edit time
// instead of at INSERT time.
//
//   bun script/lint-edges.ts            # all edges
//   bun script/lint-edges.ts --strict   # exit 1 on any warning
//
import { readdirSync } from "node:fs";

const STAGING_TO_VIEW: Record<string, string> = {
    // When N edges share a staging table, the canonical view (column
    // superset). Keep in sync with script/etl-all.ts.
    "staging.patient_person":                          "Patient__person",
    "staging.observation_coded":                       "Observation__measurement",
    "staging.dr_meas_view":                            "DiagnosticReport__measurement",
    "staging.observation_component":                   "Observation_component__measurement",
    "staging.condition_occurrence":                    "Condition__condition_occurrence",
    // observation_resolved / observation_component_resolved are derived
    // staging tables (built by _resolve_observation*.sql); the resolve-fed
    // siblings use alias `r` so the linter's `FROM staging.X v` matcher skips
    // them — these entries document the source-view superset for parity.
    "staging.observation_resolved":                    "Observation__measurement",
    "staging.observation_component_resolved":          "Observation_component__measurement",
    // condition_resolved is a derived staging table (built by
    // _resolve_condition.sql); its columns are the resolved superset
    // of Condition__condition_occurrence view + std_concept_id,
    // src_*, std_domain. Linter validates against the source view —
    // CTE-derived cols (std_*, src_*) live in the resolve SQL.
    "staging.condition_resolved":                      "Condition__condition_occurrence",
};

function viewColumns(view: any): Set<string> {
    const cols = new Set<string>();
    const walk = (sel: any) => {
        for (const c of sel.column ?? []) cols.add(c.name);
        for (const child of sel.select ?? []) walk(child);
    };
    for (const top of view.select ?? []) walk(top);
    return cols;
}

function refsInSql(sql: string): { col: string; line: number }[] {
    // Match v.<col_name> — `v` is the canonical alias in our stage-2 SQLs.
    const out: { col: string; line: number }[] = [];
    const lines = sql.split("\n");
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.trim().startsWith("--")) continue;
        for (const m of line.matchAll(/\bv\.([a-z_][a-z0-9_]*)\b/g)) {
            out.push({ col: m[1]!, line: i + 1 });
        }
    }
    return out;
}

function stagingTableFromSql(sql: string): string | null {
    const m = sql.match(/FROM\s+(staging\.\w+)\s+v\b/);
    return m?.[1] ?? null;
}

function viewForStaging(staging: string, edge: string): string {
    return STAGING_TO_VIEW[staging] ?? edge;
}

const strict = process.argv.includes("--strict");
const edges = readdirSync("mapspec/etl")
    .filter((f) => f.endsWith(".sql") && !f.startsWith("_"))
    .map((f) => f.replace(/\.sql$/, ""));

let warnings = 0;
let errors = 0;
for (const edge of edges) {
    const sqlText = await Bun.file(`mapspec/etl/${edge}.sql`).text();
    const staging = stagingTableFromSql(sqlText);
    if (!staging) {
        console.log(`SKIP ${edge}: no "FROM staging.X v" found`);
        continue;
    }
    const viewName = viewForStaging(staging, edge);
    const viewPath = `mapspec/views/${viewName}.view.json`;
    if (!(await Bun.file(viewPath).exists())) {
        console.log(`ERR  ${edge}: view ${viewName} doesn't exist`);
        errors++;
        continue;
    }
    const view = JSON.parse(await Bun.file(viewPath).text());
    const declared = viewColumns(view);
    const refs = refsInSql(sqlText);
    const missing = refs.filter((r) => !declared.has(r.col));
    if (missing.length === 0) {
        console.log(`ok   ${edge.padEnd(50)} ${refs.length} refs verified against ${viewName}`);
    } else {
        const uniq = [...new Set(missing.map((m) => m.col))];
        console.log(`WARN ${edge.padEnd(50)} ${uniq.length} undeclared col${uniq.length === 1 ? "" : "s"}: ${uniq.join(", ")}`);
        for (const m of missing.slice(0, 3)) {
            console.log(`       ${edge}.sql:${m.line}  v.${m.col}`);
        }
        warnings++;
    }
}

console.log(`\n${edges.length} edges checked. ${warnings} warning${warnings === 1 ? "" : "s"}, ${errors} error${errors === 1 ? "" : "s"}.`);
process.exit((errors > 0 || (strict && warnings > 0)) ? 1 : 0);
