// Side-by-side row comparison: cdm.<table> vs cdm_ours_fhir.<table>.
// For each shared row (matched by key), show ref / ours values per column;
// cells that differ get highlighted. Lazy-loaded via htmx from
// /compare/:resource/:table.
//
//   ctx.fns.compare.renderSideBySide(ctx, { omop_table, limit?: 20 }) → string|null

export default async function (
    ctx: Context,
    opts: { omop_table: string; limit?: number },
): Promise<string | null> {
    const omopTable = opts.omop_table;
    const limit = opts.limit ?? 20;

    // Verify both schemas have the table.
    const exists = await ctx.fns.db.query(ctx, {
        sql: `
            SELECT
                EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema='cdm'           AND table_name=$1) AS ref_ok,
                EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema='cdm_ours_fhir' AND table_name=$1) AS ours_ok
        `,
        params: [omopTable],
    });
    if (!exists[0]?.ref_ok || !exists[0]?.ours_ok) return null;

    // Join strategy: pick the first column where (a) it exists in both
    // schemas, AND (b) a JOIN on it actually returns rows. PK <table>_id is
    // a deterministic hash on our side and a row_number() on the reference
    // (intentionally different surrogate strategies for tables like
    // condition_occurrence), so we may need to fall back to either
    // <table>_source_value or a composite (person_id, source_value,
    // start_date) that's stable across both pipelines.
    const stem = omopTable.replace(/_occurrence$|_exposure$|_period$|_era$/, "");
    const tryKeys: Array<string | string[]> = [
        `${omopTable}_source_value`,
        `${stem}_source_value`,
        `${omopTable}_id`,
        `${stem}_id`,
        ["person_id", `${stem}_source_value`, `${stem}_start_date`],
        ["person_id", `${omopTable}_source_value`, `${omopTable}_start_date`],
    ];
    let keyCol: string | string[] | null = null;
    for (const k of tryKeys) {
        const keysArr = Array.isArray(k) ? k : [k];
        const allCols = await ctx.fns.db.query(ctx, {
            sql: `SELECT count(*)::int AS n FROM information_schema.columns
                    WHERE table_schema IN ('cdm','cdm_ours_fhir') AND table_name=$1 AND column_name = ANY($2)`,
            params: [omopTable, keysArr],
        });
        if (allCols[0].n !== keysArr.length * 2) continue;  // missing in one or both schemas
        const onClause = keysArr.map((c) => `o."${c}" IS NOT DISTINCT FROM r."${c}"`).join(" AND ");
        const probe = await ctx.fns.db.query(ctx, {
            sql: `SELECT count(*)::int AS n FROM cdm.${omopTable} r JOIN cdm_ours_fhir.${omopTable} o ON ${onClause} LIMIT 1000`,
        });
        if (probe[0].n > 0) { keyCol = k; break; }
    }
    if (!keyCol) return null;
    const keysArr = Array.isArray(keyCol) ? keyCol : [keyCol];
    const onClause = keysArr.map((c) => `o."${c}" IS NOT DISTINCT FROM r."${c}"`).join(" AND ");
    const displayKey = keysArr.join(" + ");

    // Discover shared columns (excl key).
    const shared = await ctx.fns.db.query(ctx, {
        sql: `
            SELECT r.column_name
              FROM information_schema.columns r
              JOIN information_schema.columns o
                ON o.table_schema='cdm_ours_fhir' AND o.table_name=$1 AND o.column_name=r.column_name
             WHERE r.table_schema='cdm' AND r.table_name=$1
             ORDER BY r.ordinal_position
        `,
        params: [omopTable],
    });
    const cols = shared.map((r: any) => r.column_name as string).filter((c: string) => !keysArr.includes(c));
    if (cols.length === 0) return null;

    // Fetch ref + ours rows in one query.
    const selectList = cols.map((c) => `r."${c}" AS "r_${c}", o."${c}" AS "o_${c}"`).join(", ");
    const keyExpr = keysArr.length === 1
        ? `r."${keysArr[0]}"::text`
        : `(${keysArr.map((c) => `r."${c}"::text`).join(" || ' · ' || ")})`;
    const orderBy = keysArr.map((c) => `r."${c}"`).join(", ");
    const rows = await ctx.fns.db.query(ctx, {
        sql: `
            SELECT ${keyExpr} AS key_val, ${selectList}
              FROM cdm.${omopTable} r
              JOIN cdm_ours_fhir.${omopTable} o ON ${onClause}
             ORDER BY ${orderBy}
             LIMIT ${limit}
        `,
    });

    if (rows.length === 0) return null;

    // Per-column diff counts on the full table (not just sample).
    const fullDiffs = await ctx.fns.db.query(ctx, {
        sql: `
            SELECT ${cols.map((c) =>
                `count(*) FILTER (WHERE r."${c}" IS DISTINCT FROM o."${c}")::int AS "mm_${c}"`
            ).join(", ")}
              FROM cdm.${omopTable} r
              JOIN cdm_ours_fhir.${omopTable} o ON ${onClause}
        `,
    });
    const mismatches: Record<string, number> = {};
    for (const c of cols) mismatches[c] = fullDiffs[0]?.[`mm_${c}`] ?? 0;

    // Header: key, then one pair (ref / ours) per col.
    const headerCells = [
        `<th class="sticky left-0 z-10 bg-gray-50 px-2 py-1.5 text-left font-medium border-r border-gray-200" colspan="1">${esc(displayKey)}</th>`,
    ];
    for (const c of cols) {
        const mm = mismatches[c] ?? 0;
        const flag = mm > 0 ? ` <span class="text-amber-600 text-[9px]">${mm} ≠</span>` : "";
        const dim  = /_source_/.test(c) ? " text-gray-400" : "";
        headerCells.push(
            `<th class="px-2 py-1.5 text-left font-medium border-l border-gray-200${dim}" colspan="2"><div class="font-mono">${esc(c)}${flag}</div><div class="text-[8px] uppercase tracking-wider text-gray-400 mt-0.5"><span class="mr-3">ref</span><span>ours</span></div></th>`
        );
    }

    // Body
    const bodyRows = rows.map((row: any) => {
        const cells = [`<td class="sticky left-0 z-10 bg-white px-2 py-1 font-mono text-[10px] text-gray-500 border-r border-gray-200" title="${esc(String(row.key_val))}">${esc(String(row.key_val).slice(0, 12))}…</td>`];
        for (const c of cols) {
            const r = row[`r_${c}`];
            const o = row[`o_${c}`];
            const same = r === o || (r === null && o === null) || (r != null && o != null && String(r) === String(o));
            const cellCls = same ? "" : " bg-amber-50";
            const dim  = /_source_/.test(c) ? " text-gray-400" : "";
            cells.push(
                `<td class="px-2 py-1 font-mono text-[10px] border-l border-gray-100${cellCls}${dim}">${fmt(r)}</td>`,
                `<td class="px-2 py-1 font-mono text-[10px]${cellCls}${dim}">${fmt(o)}</td>`,
            );
        }
        return `<tr class="border-t border-gray-100 hover:bg-blue-50/30">${cells.join("")}</tr>`;
    }).join("");

    return `
<div class="mb-6 border border-amber-200 rounded-lg overflow-hidden">
  <div class="flex items-center justify-between px-4 py-2 bg-amber-50 border-b border-amber-200">
    <div class="flex items-center gap-2 text-xs">
      <span class="text-[10px] uppercase tracking-wider text-amber-800 font-semibold">Side-by-side ETL diff</span>
      <code class="font-mono text-sm text-amber-900">cdm.${esc(omopTable)}</code>
      <span class="text-gray-400">vs</span>
      <code class="font-mono text-sm text-amber-900">cdm_ours_fhir.${esc(omopTable)}</code>
    </div>
    <span class="text-[11px] text-amber-700">${rows.length} rows shown · cells that differ are highlighted</span>
  </div>
  <div class="overflow-x-auto bg-white">
    <table class="text-[11px] min-w-full">
      <thead class="bg-gray-50 text-[10px] uppercase tracking-wider border-b border-gray-200">
        <tr>${headerCells.join("")}</tr>
      </thead>
      <tbody>${bodyRows}</tbody>
    </table>
  </div>
</div>`;
}

function fmt(v: any): string {
    if (v === null || v === undefined) return `<span class="text-gray-300 italic">∅</span>`;
    const s = String(v);
    return esc(s.length > 28 ? s.slice(0, 28) + "…" : s);
}

function esc(s: string): string {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
