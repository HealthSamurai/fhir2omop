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

    // Join key: prefer the table's PK (<table>_id) — both pipelines hash
    // the same Patient/Encounter/Condition UUID into the surrogate, so the
    // values match exactly. Falls back to <table>_source_value otherwise.
    const candidates = [
        `${omopTable}_id`,
        `${omopTable}_source_value`,
        `${omopTable.replace(/_occurrence$/, "")}_id`,
        `${omopTable.replace(/_exposure$/,   "")}_id`,
        `${omopTable.replace(/_occurrence$/, "")}_source_value`,
        `${omopTable.replace(/_exposure$/,   "")}_source_value`,
    ];
    const inList = candidates.map((c) => `'${c}'`).join(",");
    const exists = await ctx.fns.db.query(ctx, {
        sql: `
            SELECT
                EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema='cdm'           AND table_name=$1) AS ref_ok,
                EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema='cdm_ours_fhir' AND table_name=$1) AS ours_ok,
                (SELECT column_name FROM information_schema.columns
                   WHERE table_schema='cdm' AND table_name=$1 AND column_name IN (${inList})
                   ORDER BY array_position(ARRAY[${candidates.map((c) => `'${c}'`).join(",")}], column_name)
                   LIMIT 1) AS key_col
        `,
        params: [omopTable],
    });
    if (!exists[0]?.ref_ok || !exists[0]?.ours_ok || !exists[0]?.key_col) return null;
    const keyCol = exists[0].key_col as string;

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
    const cols = shared.map((r: any) => r.column_name as string).filter((c: string) => c !== keyCol);
    if (cols.length === 0) return null;

    // Fetch ref + ours rows in one query — preserves order by the ref's key.
    const selectList = cols.map((c) => `r."${c}" AS "r_${c}", o."${c}" AS "o_${c}"`).join(", ");
    const rows = await ctx.fns.db.query(ctx, {
        sql: `
            SELECT r."${keyCol}" AS key_val, ${selectList}
              FROM cdm.${omopTable} r
              JOIN cdm_ours_fhir.${omopTable} o
                ON o."${keyCol}" = r."${keyCol}"
             ORDER BY r."${keyCol}"
             LIMIT ${limit}
        `,
    });

    if (rows.length === 0) return null;

    // Per-column diff counts on the full table (not just sample) so the
    // header shows the global divergence picture.
    const fullDiffs = await ctx.fns.db.query(ctx, {
        sql: `
            SELECT ${cols.map((c) =>
                `count(*) FILTER (WHERE r."${c}" IS DISTINCT FROM o."${c}")::int AS "mm_${c}"`
            ).join(", ")}
              FROM cdm.${omopTable} r
              JOIN cdm_ours_fhir.${omopTable} o ON o."${keyCol}" = r."${keyCol}"
        `,
    });
    const mismatches: Record<string, number> = {};
    for (const c of cols) mismatches[c] = fullDiffs[0]?.[`mm_${c}`] ?? 0;

    // Header: key, then one pair (ref / ours) per col.
    const headerCells = [
        `<th class="sticky left-0 z-10 bg-gray-50 px-2 py-1.5 text-left font-medium border-r border-gray-200" colspan="1">${esc(keyCol)}</th>`,
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
