import { getSql } from "./connect";

// Execute a raw SQL statement and return rows.
//
// Designed for ad-hoc usage from the REPL:
//   bun script/repl.ts 'await ctx.fns.db.query(ctx, { sql: "select 1 as x" })'
//
// For parameterized queries, pass `params` and reference them as $1, $2, ... in
// the SQL string. Internally uses Bun.SQL.unsafe; no JSON pre-encoding of
// params is applied (so jsonb columns should be filled by inlining `::jsonb`
// literals or by writing-side helpers, not by passing JS objects as params).
export default async function (
    _ctx: Context,
    opts: { sql: string; params?: any[] },
): Promise<any[]> {
    const sql = getSql();
    const params = opts.params ?? [];
    if (params.length === 0) return await sql.unsafe(opts.sql) as any[];
    return await sql.unsafe(opts.sql, params) as any[];
}
