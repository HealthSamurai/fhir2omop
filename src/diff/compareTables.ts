// Side-by-side row+column diff of two OMOP-shaped tables.
//
//   ctx.fns.diff.compareTables(ctx, {
//     ref:  "cdm.person",                    // schema.table
//     ours: "cdm_ours_fhir.person",
//     key:  "person_source_value",           // column to JOIN on (Synthea UUID)
//     columns: ["gender_concept_id", ...]    // optional — defaults: all shared cols
//   })
//
// Returns:
//   {
//     ref_rows, ours_rows,
//     in_both, ref_only, ours_only,
//     fields: [{ column, match, mismatch, ref_null, ours_null, both_null }, ...]
//   }
export default async function (
    ctx: Context,
    opts: { ref: string; ours: string; key: string; columns?: string[] },
): Promise<any> {
    const [refSchema, refTable]   = opts.ref.split(".");
    const [oursSchema, oursTable] = opts.ours.split(".");
    if (!refSchema || !refTable || !oursSchema || !oursTable) {
        throw new Error(`bad schema.table: ref=${opts.ref}, ours=${opts.ours}`);
    }

    // 1. Discover shared columns (excluding the join key).
    const cols = opts.columns ?? await discoverSharedColumns(ctx, opts.ref, opts.ours);
    const compareCols = cols.filter((c) => c !== opts.key);

    // 2. Row-level totals.
    const totals = await ctx.fns.db.query(ctx, {
        sql: `
            SELECT
                (SELECT count(*) FROM ${opts.ref})  AS ref_rows,
                (SELECT count(*) FROM ${opts.ours}) AS ours_rows,
                (SELECT count(*) FROM ${opts.ref}  r JOIN ${opts.ours} o ON o.${opts.key} = r.${opts.key}) AS in_both,
                (SELECT count(*) FROM ${opts.ref}  r LEFT JOIN ${opts.ours} o ON o.${opts.key} = r.${opts.key} WHERE o.${opts.key} IS NULL) AS ref_only,
                (SELECT count(*) FROM ${opts.ours} o LEFT JOIN ${opts.ref}  r ON o.${opts.key} = r.${opts.key} WHERE r.${opts.key} IS NULL) AS ours_only
        `,
    });
    const t = totals[0];

    // 3. Per-column match / mismatch counts.
    // One SQL pass with FILTER aggregates per column.
    const fields: any[] = [];
    if (compareCols.length > 0) {
        const filters = compareCols.flatMap((c) => {
            const rc = `r."${c}"`, oc = `o."${c}"`;
            return [
                `count(*) FILTER (WHERE ${rc} IS NOT DISTINCT FROM ${oc}) AS "match__${c}"`,
                `count(*) FILTER (WHERE ${rc} IS DISTINCT FROM ${oc})    AS "diff__${c}"`,
                `count(*) FILTER (WHERE ${rc} IS NULL AND ${oc} IS NOT NULL) AS "ref_null__${c}"`,
                `count(*) FILTER (WHERE ${rc} IS NOT NULL AND ${oc} IS NULL) AS "ours_null__${c}"`,
                `count(*) FILTER (WHERE ${rc} IS NULL AND ${oc} IS NULL) AS "both_null__${c}"`,
            ];
        });
        const sql = `
            SELECT ${filters.join(",\n                   ")}
            FROM ${opts.ref}  r
            JOIN ${opts.ours} o ON o.${opts.key} = r.${opts.key}
        `;
        const agg = (await ctx.fns.db.query(ctx, { sql }))[0];
        for (const c of compareCols) {
            fields.push({
                column:    c,
                match:     Number(agg[`match__${c}`]),
                mismatch:  Number(agg[`diff__${c}`]),
                ref_null:  Number(agg[`ref_null__${c}`]),
                ours_null: Number(agg[`ours_null__${c}`]),
                both_null: Number(agg[`both_null__${c}`]),
            });
        }
    }

    return {
        ref:  opts.ref,
        ours: opts.ours,
        key:  opts.key,
        ref_rows:  Number(t.ref_rows),
        ours_rows: Number(t.ours_rows),
        in_both:   Number(t.in_both),
        ref_only:  Number(t.ref_only),
        ours_only: Number(t.ours_only),
        fields,
    };
}

async function discoverSharedColumns(
    ctx: Context,
    ref: string,
    ours: string,
): Promise<string[]> {
    const [rs, rt] = ref.split(".");
    const [os, ot] = ours.split(".");
    const rows = await ctx.fns.db.query(ctx, {
        sql: `
            SELECT column_name FROM information_schema.columns
             WHERE table_schema = $1 AND table_name = $2
            INTERSECT
            SELECT column_name FROM information_schema.columns
             WHERE table_schema = $3 AND table_name = $4
        `,
        params: [rs, rt, os, ot],
    });
    return rows.map((r: any) => r.column_name).sort();
}
