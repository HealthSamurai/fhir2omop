// Render a sample-rows card for one OMOP table: first N rows of
// cdm_ours_fhir.<table> as a key/value record viewer with prev/next
// navigation. One record visible at a time, all N pre-rendered in the
// DOM so navigation is instant (no htmx round-trip).
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

    // OMOP CDM v5.4 field metadata (datatype, FK target, user_guidance).
    // We treat OMOP table names case-insensitively.
    const omopFields = await ctx.fns.omop.byTable(ctx, { name: omopTable });
    const metaByName = new Map<string, any>();
    for (const f of omopFields) metaByName.set(f.name.toLowerCase(), f);

    const rows = await ctx.fns.db.query(ctx, {
        sql: `SELECT * FROM cdm_ours_fhir.${omopTable} LIMIT ${limit}`,
    });

    const total = (await ctx.fns.db.query(ctx, {
        sql: `SELECT count(*)::int AS n FROM cdm_ours_fhir.${omopTable}`,
    }))[0].n as number;

    if (rows.length === 0) {
        return `
<div class="mb-6 border border-slate-200 rounded-lg overflow-hidden">
  <div class="px-4 py-2 bg-slate-50 border-b border-slate-200 text-xs flex items-center gap-2">
    <span class="text-[10px] uppercase tracking-wider text-slate-800 font-semibold">Sample rows</span>
    <code class="font-mono text-sm text-slate-900">cdm_ours_fhir.${esc(omopTable)}</code>
  </div>
  <div class="px-4 py-6 text-xs text-gray-400 italic">no rows</div>
</div>`;
    }

    // Unique-per-card id so multiple sample cards on one page coexist.
    const uid = `samp_${omopTable}_${Math.random().toString(36).slice(2, 8)}`;

    const records = rows.map((row: any, idx: number) => {
        const trs = colNames.map((c) => {
            const v = row[c];
            const meta = metaByName.get(c.toLowerCase());
            const typeBadge = meta?.type
                ? `<span class="text-[10px] uppercase tracking-wider text-gray-400 ml-1 font-normal">${esc(meta.type)}</span>`
                : "";
            const flags: string[] = [];
            if (meta?.isPrimaryKey) flags.push(`<span class="text-[10px] text-amber-700 ml-1 font-normal" title="primary key">PK</span>`);
            if (meta?.required)     flags.push(`<span class="text-[10px] text-red-600 ml-1 font-normal" title="NOT NULL">*</span>`);
            if (meta?.fkTable)      flags.push(`<span class="text-[10px] text-blue-600 ml-1 font-normal" title="FK">→${esc(meta.fkTable.toLowerCase())}</span>`);
            const flagsHtml = flags.join("");

            const tipParts: string[] = [];
            if (meta?.userGuidance)   tipParts.push(meta.userGuidance);
            if (meta?.etlConventions) tipParts.push(`ETL: ${meta.etlConventions}`);
            const tip = tipParts.join("\n\n");
            const titleAttr = tip ? ` title="${esc(tip)}"` : "";
            const tipCls    = tip ? " cursor-help underline decoration-dotted decoration-gray-400 underline-offset-2" : "";

            const cellHtml = formatCell(c, v);
            return `
      <tr class="border-t border-gray-200">
        <th class="bg-gray-100 text-left align-top w-72 px-4 py-2.5 font-mono text-xs font-semibold text-gray-800 border-r border-gray-200">
          <span class="${tipCls.trim()}"${titleAttr}>${esc(c)}</span>${typeBadge}${flagsHtml}
        </th>
        <td class="px-4 py-2.5 font-mono text-xs text-gray-900 align-top">${cellHtml}</td>
      </tr>`;
        }).join("");
        return `
<div class="${uid}-rec ${idx === 0 ? "" : "hidden"}" data-idx="${idx}">
  <table class="w-full border-collapse">
    <tbody>${trs}</tbody>
  </table>
</div>`;
    }).join("");

    const total_records = rows.length;

    // Plain JS (no htmx) — prev/next buttons swap which record is visible.
    // hx-boost="false" so htmx doesn't try to intercept the button clicks.
    const nav = `
<script>
(function(){
  const recs = document.querySelectorAll('.${uid}-rec');
  const total = ${total_records};
  let i = 0;
  function show(n) {
    i = ((n % total) + total) % total;
    recs.forEach((el, idx) => el.classList.toggle('hidden', idx !== i));
    const counter = document.getElementById('${uid}_counter');
    if (counter) counter.textContent = (i + 1) + ' / ' + total;
  }
  document.getElementById('${uid}_prev')?.addEventListener('click', () => show(i - 1));
  document.getElementById('${uid}_next')?.addEventListener('click', () => show(i + 1));
  document.addEventListener('keydown', (e) => {
    // Only handle when the card is on-screen and not typing in an input.
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
    if (e.key === 'ArrowLeft')  document.getElementById('${uid}_prev')?.click();
    if (e.key === 'ArrowRight') document.getElementById('${uid}_next')?.click();
  });
})();
</script>`;

    return `
<div class="not-prose mb-6 border border-slate-200 rounded-lg overflow-hidden" hx-boost="false">
  <div class="flex items-center justify-between px-4 py-2 bg-slate-50 border-b border-slate-200">
    <div class="flex items-center gap-2 text-xs">
      <span class="text-[10px] uppercase tracking-wider text-slate-800 font-semibold">Sample rows</span>
      <code class="font-mono text-sm text-slate-900">cdm_ours_fhir.${esc(omopTable)}</code>
      <span class="text-[10px] text-slate-500">· ${colNames.length} columns</span>
    </div>
    <div class="flex items-center gap-2 text-xs">
      <span class="text-[10px] text-slate-500">showing ${total_records.toLocaleString()} of ${total.toLocaleString()}</span>
      <button id="${uid}_prev" type="button"
        class="px-2 py-0.5 rounded border border-slate-300 hover:bg-slate-100 text-slate-700"
        title="Previous (←)">‹ prev</button>
      <span id="${uid}_counter" class="font-mono text-[11px] text-slate-700 w-14 text-center">1 / ${total_records}</span>
      <button id="${uid}_next" type="button"
        class="px-2 py-0.5 rounded border border-slate-300 hover:bg-slate-100 text-slate-700"
        title="Next (→)">next ›</button>
    </div>
  </div>
  <div class="bg-white">${records}</div>
  ${nav}
</div>`;
}

function formatCell(col: string, v: any): string {
    if (v === null || v === undefined) {
        return `<span class="text-gray-300 italic text-[10px]">∅ null</span>`;
    }
    if (col.endsWith("concept_id") && typeof v === "number") {
        const cls = v === 0 ? "text-gray-400" : "text-purple-700 font-semibold";
        return `<span class="${cls}">${v}</span>`;
    }
    if (col.endsWith("_id") && typeof v === "bigint") {
        return `<span class="text-gray-700" title="${esc(String(v))}">${esc(String(v))}</span>`;
    }
    const dim = col.endsWith("_source_value") || col.endsWith("_source_concept_id") ? " text-gray-500" : " text-gray-900";
    const s = String(v);
    return `<span class="${dim}">${esc(s)}</span>`;
}

function esc(s: string): string {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
