// Render one golden test case: FHIR input (highlighted JSON) on the left,
// the expected OMOP rows (concept-aware cards) on the right, notes as markdown.
export default async function (ctx: Context, opts: { case: any }): Promise<string> {
    const c = opts.case;

    const flow = renderFlow(c.fhirTypes, c.omopTables);
    const notesHtml = c.notes
        ? await ctx.fns.markdown.render(ctx, { source: c.notes })
        : "";

    // FHIR input — one highlighted JSON block per resource.
    const fhirCards = await Promise.all((c.fhir ?? []).map(async (r: any) => {
        const head = `${r.resourceType ?? "?"}${r.id ? ` <span class="font-mono text-sky-700">#${esc(r.id)}</span>` : ""}`;
        const json = JSON.stringify(r, null, 2);
        const hl = await ctx.fns.markdown.render(ctx, { source: "```json\n" + json + "\n```" });
        return `<div class="border border-gray-200 rounded-lg overflow-hidden">
  <div class="px-3 py-1.5 bg-sky-50 border-b border-gray-200 text-xs font-semibold text-sky-900">${head}</div>
  <div class="px-1">${hl}</div>
</div>`;
    }));

    // Expected OMOP — grouped by table.
    const byTable = new Map<string, any[]>();
    for (const row of c.omop ?? []) {
        const t = row.table ?? "(untagged)";
        (byTable.get(t) ?? byTable.set(t, []).get(t)!).push(row);
    }
    let omopHtml: string;
    if (!(c.omop ?? []).length) {
        omopHtml = `<div class="border border-rose-200 bg-rose-50 rounded-lg p-4 text-rose-800">
  <div class="font-semibold">Expected: no rows</div>
  <div class="text-sm mt-1">The pipeline must emit <strong>zero</strong> OMOP rows for this input (e.g. refuted / entered-in-error / unmapped).</div>
</div>`;
    } else {
        omopHtml = [...byTable.entries()].map(([table, rows]) => {
            const rowCards = rows.map((row, i) =>
                renderRow(row, rows.length > 1 ? i + 1 : null)).join("");
            return `<div>
  <div class="flex items-center gap-2 mb-1.5">
    <span class="px-2 py-0.5 rounded font-mono text-xs bg-violet-100 text-violet-800">${esc(table)}</span>
    <span class="text-xs text-gray-400">${rows.length} row${rows.length === 1 ? "" : "s"}</span>
  </div>
  <div class="space-y-2">${rowCards}</div>
</div>`;
        }).join('<div class="h-3"></div>');
    }

    return `<h1>${esc(c.title)}</h1>
<div class="-mt-1 mb-1">${flow}</div>
<p class="font-mono text-[11px] text-gray-400 -mt-1">cases/${esc(c.file)}</p>

<div class="not-prose grid lg:grid-cols-2 gap-5 mt-4">
  <section>
    <h2 class="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">FHIR input</h2>
    <div class="space-y-3">${fhirCards.join("")}</div>
  </section>
  <section>
    <h2 class="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Expected OMOP rows</h2>
    <p class="text-[11px] text-gray-400 mb-2">FK ids shown as <span class="font-mono">ref:&lt;logical-id&gt;</span>. Columns not listed are asserted <span class="font-mono">NULL</span>; the row's own surrogate id is derived (not asserted).</p>
    ${omopHtml}
  </section>
</div>

${notesHtml ? `<section class="mt-7">
  <h2 class="text-sm font-semibold text-gray-500 uppercase tracking-wider">Notes</h2>
  <div class="prose prose-sm max-w-none">${notesHtml}</div>
</section>` : ""}`;
}

// One expected OMOP row as a key/value card. concept_id columns pair with
// their "<col>__name" sibling; FK refs render as pills.
function renderRow(row: any, n: number | null): string {
    const keys = Object.keys(row).filter((k) => k !== "table" && !k.endsWith("__name"));
    const lines = keys.map((k) => {
        const v = row[k];
        const name = row[`${k}__name`];
        return `<div class="contents">
  <dt class="font-mono text-[12px] text-gray-500 py-1 pr-3 align-top">${esc(k)}</dt>
  <dd class="py-1">${renderValue(v, name)}</dd>
</div>`;
    }).join("");
    const num = n ? `<div class="text-[11px] font-semibold text-gray-400 mb-1">#${n}</div>` : "";
    return `<div class="border border-gray-200 rounded-lg p-3 bg-gray-50/50">
  ${num}
  <dl class="grid grid-cols-[max-content_1fr] gap-x-1 text-[13px]">${lines}</dl>
</div>`;
}

function renderValue(v: any, name?: string): string {
    if (v === null || v === undefined) {
        return `<span class="text-gray-400 italic">null</span>`;
    }
    if (typeof v === "string" && v.startsWith("ref:")) {
        return `<span class="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-mono text-[12px]">${esc(v)}</span>`;
    }
    if (name !== undefined && name !== null) {
        return `<span class="font-mono text-[12px] text-gray-800">${esc(String(v))}</span>
  <span class="ml-1.5 px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[12px]">${esc(String(name))}</span>`;
    }
    if (typeof v === "number") {
        return `<span class="font-mono text-[12px] text-indigo-700">${esc(String(v))}</span>`;
    }
    return `<span class="text-gray-800">${esc(String(v))}</span>`;
}

function renderFlow(fhirTypes: string[], omopTables: string[]): string {
    const fhir = (fhirTypes ?? []).map((t) =>
        `<span class="px-1.5 py-0.5 rounded text-[11px] font-medium bg-sky-100 text-sky-800">${esc(t)}</span>`).join(" ");
    const omop = (omopTables ?? []).length
        ? omopTables.map((t) =>
            `<span class="px-1.5 py-0.5 rounded text-[11px] font-mono bg-violet-100 text-violet-800">${esc(t)}</span>`).join(" ")
        : `<span class="text-xs text-gray-400 italic">(no rows)</span>`;
    return `<div class="not-prose flex items-center flex-wrap gap-1.5">${fhir}<span class="text-gray-400 px-1">→</span>${omop}</div>`;
}

function esc(s: string) {
    return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}
