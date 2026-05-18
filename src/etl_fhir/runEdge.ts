import { resolve } from "node:path";

// Execute a Stage-2 ETL for one edge.
//
//   ctx.fns.etl_fhir.runEdge(ctx, { resource, table, target_schema?, dry? })
//     → { rows, ms, sql }
//
// Reads `mapspec/etl/<RT>__<table>.sql`, which contains a SELECT only (no
// INSERT). The runner wraps it as `INSERT INTO <target_schema>.<table>
// <select>` and executes. Postgres binds columns POSITIONALLY — so the
// SELECT must produce ALL of the target table's columns in OMOP order.
// (If the table changes or you want a subset, write an explicit INSERT
// yourself instead of using this runner.)
//
// Default target_schema is `cdm_ours_fhir`. `dry: true` returns the SQL
// without executing.
export default async function (
    ctx: Context,
    opts: { resource: string; table: string; target_schema?: string; dry?: boolean },
): Promise<{ rows: number; ms: number; sql: string }> {
    const target_schema = opts.target_schema ?? "cdm_ours_fhir";
    const file = `${opts.resource}__${opts.table}.sql`;
    const path = resolve(import.meta.dir, "..", "..", "mapspec", "etl", file);
    const select_sql = await Bun.file(path).text();

    const stmt =
        `INSERT INTO ${target_schema}.${opts.table}\n` +
        select_sql.replace(/;\s*$/, "");

    if (opts.dry) {
        return { rows: 0, ms: 0, sql: stmt };
    }

    const t0 = Date.now();
    await ctx.fns.db.query(ctx, { sql: `TRUNCATE TABLE ${target_schema}.${opts.table}` });
    await ctx.fns.db.query(ctx, { sql: stmt });
    const r = await ctx.fns.db.query(ctx, {
        sql: `SELECT count(*)::int AS n FROM ${target_schema}.${opts.table}`,
    });
    return { rows: r[0].n, ms: Date.now() - t0, sql: stmt };
}
