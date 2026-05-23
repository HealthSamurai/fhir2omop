import { $ } from "bun";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { unlink } from "node:fs/promises";
import run from "./run";
import { getColumns } from "./columns";

// Execute a ViewDefinition against a `fhir.<type>` table and materialize
// the result into a staging table — via CSV + psql `\copy` for speed.
//
//   ctx.fns.viewdef.materialize(ctx, {
//     viewDefinition,
//     source: "fhir.observation",
//     target: "staging.obs_obs_view",
//   })
//
// Hot path is the inner loop that writes one CSV line per view row to a
// temp file; once the file is built, a single psql `\copy` streams the
// whole thing to the server with the COPY protocol — orders of magnitude
// faster than the old `INSERT INTO ... VALUES (...), (...)` approach for
// large staging tables (hundreds of thousands+ of rows).
//
// CSV null marker is `\N` so we can distinguish NULL from empty string.
export default async function (
    ctx: Context,
    opts: {
        viewDefinition: any;
        source: string;
        target: string;
        /** Optional profile WHERE clause to filter the SELECT (jsonb predicate). */
        whereSql?: string;
    },
): Promise<{ rows: number; columns: string[]; ms: number }> {
    const t0 = Date.now();
    const cols = getColumns(opts.viewDefinition);
    const colTypes = inferColumnTypes(opts.viewDefinition, cols);

    const [schema, tname] = opts.target.split(".");
    if (!schema || !tname) throw new Error(`target must be schema.table, got ${opts.target}`);
    await ctx.fns.db.query(ctx, { sql: `CREATE SCHEMA IF NOT EXISTS ${schema}` });
    await ctx.fns.db.query(ctx, { sql: `DROP TABLE IF EXISTS ${opts.target}` });
    const colDdl = cols.map((c, i) => `"${c}" ${colTypes[i]}`).join(", ");
    await ctx.fns.db.query(ctx, {
        sql: `CREATE TABLE ${opts.target} (${colDdl})`,
    });

    const tmp = join(
        tmpdir(),
        `viewdef_${schema}_${tname}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.csv`,
    );
    const writer = Bun.file(tmp).writer();

    // Stream the source in fixed-size pages so JS memory stays bounded
    // regardless of cohort size. Keyset paginate on `id` (text) — every
    // fhir.* table has it, and a text-ordered keyset scan walks the
    // table once in btree order without OFFSET's quadratic re-scan.
    const PAGE = parseInt(ctx.env.VIEWDEF_PAGE_SIZE ?? "5000", 10);
    let cursor: string | null = null;
    let total = 0;
    const colCount = cols.length;
    while (true) {
        const cursorClause = cursor === null ? "" : `id > '${cursor.replace(/'/g, "''")}'`;
        const profileClause = opts.whereSql && opts.whereSql !== "TRUE" ? opts.whereSql : "";
        const clauses = [cursorClause, profileClause].filter(Boolean);
        const where = clauses.length === 0 ? "" : ` WHERE ${clauses.map((c) => `(${c})`).join(" AND ")}`;
        const chunk = await ctx.fns.db.query(ctx, {
            sql: `SELECT id, resource FROM ${opts.source} f${where} ORDER BY id LIMIT ${PAGE}`,
        });
        if (chunk.length === 0) break;
        for (const row of chunk) {
            const viewRows = run(ctx, {
                resource: row.resource,
                viewDefinition: opts.viewDefinition,
            });
            for (const r of viewRows) {
                writer.write(csvLine(r, colCount) + "\n");
                total++;
            }
        }
        cursor = chunk[chunk.length - 1].id;
        if (chunk.length < PAGE) break;
    }
    await writer.end();

    const dsn = ctx.env.ATHENA_DSN
        ?? "postgresql://athena:athena@localhost:54392/athena";
    const copyCmd =
        `\\copy ${opts.target} FROM '${tmp}' WITH (FORMAT csv, NULL '\\N')`;
    const res = await $`psql ${dsn} -v ON_ERROR_STOP=1 -c ${copyCmd}`.quiet();
    if (res.exitCode !== 0) {
        throw new Error(
            `\\copy failed for ${opts.target}: ${res.stderr.toString()}`,
        );
    }
    await unlink(tmp).catch(() => {});

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
            case "number":      return "numeric";
            case "integer":
            case "positiveInt":
            case "unsignedInt": return "integer";
            case "boolean":     return "boolean";
            default:            return "text";
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

function csvLine(row: any[], colCount: number): string {
    const parts = new Array<string>(colCount);
    for (let i = 0; i < colCount; i++) parts[i] = csvField(row[i]);
    return parts.join(",");
}

function csvField(v: any): string {
    if (v === null || v === undefined) return "\\N";
    if (typeof v === "number") return String(v);
    if (typeof v === "boolean") return v ? "true" : "false";
    const s = String(v);
    if (s.length === 0) return "";
    if (
        s.indexOf(",") >= 0  ||
        s.indexOf("\n") >= 0 ||
        s.indexOf("\r") >= 0 ||
        s.indexOf('"') >= 0  ||
        s.indexOf("\\") >= 0
    ) {
        return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
}
