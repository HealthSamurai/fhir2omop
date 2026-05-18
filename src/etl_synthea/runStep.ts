import { resolve } from "node:path";
import { render } from "./render";
import { translate } from "./translate";

// Load one SQL template, render placeholders, translate dialect, execute.
// Equivalent to:
//   sql <- SqlRender::loadRenderTranslateSql(sqlFilename, params, dbms="postgresql")
//   DatabaseConnector::executeSql(conn, sql)
// in ETL-Synthea R wrappers.
//
// `file` is resolved against the upstream ETL-Synthea SQL tree we pulled out
// of the docker image (refs/refs/ETL-Synthea-installed/sql/sql_server/) —
// see refs/refs/ETL-Synthea-installed for the original layout. Data files
// live outside src/ per project convention.
// Returns the executed SQL text (post render+translate) for debugging.
export default async function (
    ctx: Context,
    opts: { file: string; params: Record<string, string>; verbose?: boolean },
): Promise<{ sql: string; ms: number }> {
    const base = resolve(
        import.meta.dir, "..", "..",
        "refs/refs/ETL-Synthea-installed/sql/sql_server",
    );
    const path = opts.file.startsWith("/") ? opts.file : resolve(base, opts.file);
    const raw = await Bun.file(path).text();
    const rendered = render(raw, opts.params);
    const sql = translate(rendered);

    const t0 = Date.now();
    if (opts.verbose) {
        console.log(`[etl_synthea] running ${opts.file} …`);
    }
    await ctx.fns.db.query(ctx, { sql });
    const ms = Date.now() - t0;
    if (opts.verbose) {
        console.log(`[etl_synthea]   ${opts.file} done in ${(ms / 1000).toFixed(2)}s`);
    }
    return { sql, ms };
}
