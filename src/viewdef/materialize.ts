import { getSql } from "../db/connect";
import run from "./run";
import { getColumns } from "./columns";

// Execute a ViewDefinition against a `fhir.<type>` table and materialize
// the result into a staging table.
//
//   ctx.fns.viewdef.materialize(ctx, {
//     viewDefinition,
//     source: "fhir.patient",
//     target: "staging.patient_person_view",
//     batchSize: 1000,                  // default
//   })
//
// Creates the target table fresh each run (DROP+CREATE). Column types: text
// for most things, numeric for decimal/integer, boolean for boolean.
// Stage-2 SQL casts as needed.
export default async function (
    ctx: Context,
    opts: {
        viewDefinition: any;
        source: string;
        target: string;
        batchSize?: number;
    },
): Promise<{ rows: number; columns: string[]; ms: number }> {
    const sql = getSql();
    const t0 = Date.now();
    const cols = getColumns(opts.viewDefinition);
    const colTypes = inferColumnTypes(opts.viewDefinition, cols);
    const batchSize = opts.batchSize ?? 1000;

    // 1. CREATE staging table
    const [schema, tname] = opts.target.split(".");
    if (!schema || !tname) throw new Error(`target must be schema.table, got ${opts.target}`);
    await ctx.fns.db.query(ctx, { sql: `CREATE SCHEMA IF NOT EXISTS ${schema}` });
    await ctx.fns.db.query(ctx, { sql: `DROP TABLE IF EXISTS ${opts.target}` });
    const colDdl = cols.map((c, i) => `"${c}" ${colTypes[i]}`).join(", ");
    await ctx.fns.db.query(ctx, {
        sql: `CREATE TABLE ${opts.target} (${colDdl})`,
    });

    // 2. Read source resources, run view, batch-insert
    const allRows = await ctx.fns.db.query(ctx, {
        sql: `SELECT resource FROM ${opts.source}`,
    });
    let total = 0;
    let batch: any[][] = [];
    for (const row of allRows) {
        const rows = run(ctx, { resource: row.resource, viewDefinition: opts.viewDefinition });
        for (const r of rows) batch.push(r);
        if (batch.length >= batchSize) {
            await flushBatch(ctx, opts.target, cols, batch);
            total += batch.length;
            batch = [];
        }
    }
    if (batch.length > 0) {
        await flushBatch(ctx, opts.target, cols, batch);
        total += batch.length;
    }

    const ms = Date.now() - t0;
    return { rows: total, columns: cols, ms };
}

function inferColumnTypes(vd: any, colNames: string[]): string[] {
    const cols = findColumns(vd);
    return colNames.map((name) => {
        const c = cols.find((c) => (c.name || c.path) === name);
        const t = c?.type ?? "string";
        switch (t) {
            case "decimal":
            case "double":
            case "number":     return "numeric";
            case "integer":
            case "positiveInt":
            case "unsignedInt": return "integer";
            case "boolean":    return "boolean";
            default:           return "text";
        }
    });
}

function findColumns(def: any): any[] {
    if (def.column) return def.column;
    if (def.select) {
        const out: any[] = [];
        for (const s of def.select) out.push(...findColumns(s));
        return out;
    }
    return [];
}

async function flushBatch(
    ctx: Context,
    target: string,
    cols: string[],
    batch: any[][],
): Promise<void> {
    const colList = cols.map((c) => `"${c}"`).join(", ");
    const tuples = batch
        .map((row) =>
            "(" +
            row
                .map((v) => {
                    if (v === null || v === undefined) return "NULL";
                    if (typeof v === "number") return String(v);
                    if (typeof v === "boolean") return v ? "TRUE" : "FALSE";
                    // text — escape single quotes
                    return "'" + String(v).replace(/'/g, "''") + "'";
                })
                .join(", ") +
            ")",
        )
        .join(", ");
    await ctx.fns.db.query(ctx, {
        sql: `INSERT INTO ${target} (${colList}) VALUES ${tuples}`,
    });
}
