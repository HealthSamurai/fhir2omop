import { resolve } from "node:path";
import { render } from "./render";
import { translate } from "./translate";

// Create the Synthea staging tables in `synthea_schema`.
// Equivalent to ETL-Synthea CreateSyntheaTables.r.
export default async function (
    ctx: Context,
    opts: { synthea_schema: string; synthea_version?: string },
): Promise<{ tables: number }> {
    const version = opts.synthea_version ?? "v320";
    const base = resolve(
        import.meta.dir, "..", "..",
        "refs/refs/ETL-Synthea-installed/sql/sql_server",
    );
    const path = resolve(base, "synthea_version", version, "create_synthea_tables.sql");
    const raw = await Bun.file(path).text();
    const sql = translate(render(raw, { synthea_schema: opts.synthea_schema }));

    // Drop + recreate schema for clean state
    await ctx.fns.db.query(ctx, { sql: `DROP SCHEMA IF EXISTS ${opts.synthea_schema} CASCADE` });
    await ctx.fns.db.query(ctx, { sql: `CREATE SCHEMA ${opts.synthea_schema}` });
    await ctx.fns.db.query(ctx, { sql });

    // Count created tables
    const rows = await ctx.fns.db.query(ctx, {
        sql: `SELECT count(*)::int AS n FROM pg_tables WHERE schemaname = $1`,
        params: [opts.synthea_schema],
    });
    return { tables: rows[0].n };
}
