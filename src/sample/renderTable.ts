// Render a sample-rows card for one OMOP table: first N rows of
// cdm_ours_fhir.<table> as a wide scrollable table. Lazy-loaded via htmx
// from /sample/:resource/:table.
//
//   ctx.fns.sample.renderTable(ctx, { omop_table, limit?: 50 }) → string|null

export default async function (
    ctx: Context,
    opts: { omop_table: string; limit?: number },
): Promise<string | null> {
    const omopTable = opts.omop_table;
    const limit = opts.limit ?? 50;

    const exists = await ctx.fns.db.query(ctx, {
        sql: `SELECT 1 FROM information_schema.tables
                WHERE table_schema = 'cdm_ours_fhir' AND table_name = $1`,
        params: [omopTable],
    });
    if (exists.length === 0) return null;

    const cols = await ctx.fns.db.query(ctx, {
        sql: `SELECT column_name FROM information_schema.columns
                WHERE table_schema = 'cdm_ours_fhir' AND table_name = $1
                ORDER BY ordinal_position`,
        params: [omopTable],
    });
    const colNames = cols.map((c: any) => c.column_name as string);
    if (colNames.length === 0) return null;

    const rows = await ctx.fns.db.query(ctx, {
        sql: `SELECT * FROM cdm_ours_fhir.${omopTable} LIMIT ${limit}`,
    });

    const total = (await ctx.fns.db.query(ctx, {
        sql: `SELECT count(*)::int AS n FROM cdm_ours_fhir.${omopTable}`,
    }))[0].n as number;

    const head = colNames.map((c) =>
        `<th class="px-2 py-1.5 text-left font-medium whitespace-nowrap ${c.endsWith("_source_value") || c.endsWith("_source_concept_id") ? "text-gray-400" : "text-gray-600"}">${esc(c)}</th>`
    ).join("");

    const body = rows.map((row: any) => {
        const tds = colNames.map((c) => {
            const v = row[c];
            const dim = c.endsWith("_source_value") || c.endsWith("_source_concept_id") ? " text-gray-400" : "";
            if (v === null || v === undefined) return `<td class="px-2 py-1 text-[10px] text-gray-300 italic">∅</td>`;
            if (c.endsWith("concept_id") && typeof v === "number") {
                const cls = v === 0 ? "text-gray-400" : "text-purple-700 font-semibold";
                return `<td class="px-2 py-1 font-mono text-[11px] ${cls}">${v}</td>`;
            }
            if (c.endsWith("_id") && typeof v === "bigint") return `<td class="px-2 py-1 font-mono text-[10px]${dim}" title="${esc(String(v))}">${esc(String(v).slice(0, 12))}…</td>`;
            const s = String(v);
            return `<td class="px-2 py-1 font-mono text-[11px]${dim}">${esc(s.length > 40 ? s.slice(0, 40) + "…" : s)}</td>`;
        }).join("");
        return `<tr class="border-t border-gray-100 hover:bg-gray-50">${tds}</tr>`;
    }).join("");

    return `
<div class="mb-6 border border-slate-200 rounded-lg overflow-hidden">
  <div class="flex items-center justify-between px-4 py-2 bg-slate-50 border-b border-slate-200">
    <div class="flex items-center gap-2 text-xs">
      <span class="text-[10px] uppercase tracking-wider text-slate-800 font-semibold">Sample rows</span>
      <code class="font-mono text-sm text-slate-900">cdm_ours_fhir.${esc(omopTable)}</code>
    </div>
    <span class="text-[11px] text-slate-700">showing ${rows.length} of ${total.toLocaleString()} · ${colNames.length} columns</span>
  </div>
  <div class="overflow-x-auto bg-white">
    <table class="text-[11px] min-w-full">
      <thead class="bg-gray-50 text-[10px] uppercase tracking-wider border-b border-gray-200">
        <tr>${head}</tr>
      </thead>
      <tbody>${body}</tbody>
    </table>
  </div>
</div>`;
}

function esc(s: string): string {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
