import { $ } from "bun";
import { readdirSync } from "node:fs";
import { resolve, basename } from "node:path";

// Load Synthea CSV files into staging tables. Uses psql \copy because
// Bun.SQL's protocol-level COPY doesn't support headers/quoting nicely yet.
// One file per table — filename (without .csv) must match a staging table.
//
// Equivalent to ETL-Synthea LoadSyntheaTables.r.
export default async function (
    ctx: Context,
    opts: { synthea_schema: string; csv_dir: string; tables?: string[] },
): Promise<{ loaded: { table: string; rows: number; ms: number }[] }> {
    const allFiles = readdirSync(opts.csv_dir).filter((f) => f.endsWith(".csv"));
    const want = opts.tables
        ? allFiles.filter((f) => opts.tables!.includes(f.replace(/\.csv$/, "")))
        : allFiles;

    const dsn = ctx.env.ATHENA_DSN
        ?? "postgresql://athena:athena@localhost:54392/athena";

    const loaded: { table: string; rows: number; ms: number }[] = [];
    for (const f of want.sort()) {
        const table = basename(f, ".csv");
        const path = resolve(opts.csv_dir, f);
        const qualified = `${opts.synthea_schema}.${table}`;
        const t0 = Date.now();

        console.log(`[etl_synthea] loading ${f} → ${qualified} …`);
        // Truncate before COPY for idempotency
        await ctx.fns.db.query(ctx, { sql: `TRUNCATE TABLE ${qualified}` });

        // psql \copy reads CSV with header, handles quoted commas/newlines
        const copyCmd = `\\copy ${qualified} FROM '${path}' WITH (FORMAT csv, HEADER true, QUOTE '"', ESCAPE '"', NULL '')`;
        const res = await $`psql ${dsn} -v ON_ERROR_STOP=1 -c ${copyCmd}`.quiet();
        if (res.exitCode !== 0) {
            throw new Error(`copy failed for ${f}: ${res.stderr.toString()}`);
        }

        const rows = await ctx.fns.db.query(ctx, {
            sql: `SELECT count(*)::int AS n FROM ${qualified}`,
        });
        const ms = Date.now() - t0;
        loaded.push({ table, rows: rows[0].n, ms });
        console.log(`[etl_synthea]   ${rows[0].n.toLocaleString()} rows (${(ms/1000).toFixed(1)}s)`);
    }
    return { loaded };
}
