// Render one branch file: title + notes, then each variant case as a
// collapsible section — FHIR input (highlighted JSON) beside the expected
// OMOP rows (concept-aware cards), grouped by table.
export default async function (ctx: Context, opts: { case: any }): Promise<string> {
    const file = opts.case;
    const flow = renderFlow(file.fhirTypes, file.omopTables);
    const notesHtml = file.notes ? await ctx.fns.markdown.render(ctx, { source: file.notes }) : "";

    const variants = await Promise.all((file.cases ?? []).map(async (v: any, i: number) => {
        // FHIR input — one highlighted JSON block per resource.
        const fhirCards = await Promise.all((v.fhir ?? []).map(async (r: any) => {
            const head = `${r.resourceType ?? "?"}${r.id ? ` <span class="font-mono text-sky-700">#${esc(r.id)}</span>` : ""}`;
            const hl = await ctx.fns.markdown.render(ctx, { source: "```json\n" + JSON.stringify(r, null, 2) + "\n```" });
            return `<div class="border border-gray-200 rounded-lg overflow-hidden">
  <div class="px-3 py-1.5 bg-sky-50 border-b border-gray-200 text-xs font-semibold text-sky-900">${head}</div>
  <div class="px-1">${hl}</div>
</div>`;
        }));

        // Expected OMOP — grouped by table.
        const tables = Object.keys(v.omopByTable ?? {});
        const totalRows = tables.reduce((n, t) => n + (v.omopByTable[t]?.length ?? 0), 0);
        let omopHtml: string;
        if (totalRows === 0) {
            omopHtml = `<div class="border border-rose-200 bg-rose-50 rounded-lg p-3 text-rose-800">
  <div class="font-semibold text-sm">Expected: no rows</div>
  <div class="text-xs mt-0.5">The pipeline must emit <strong>zero</strong> OMOP rows for this input.</div>
</div>`;
        } else {
            omopHtml = tables.map((t) => {
                const rows = v.omopByTable[t] ?? [];
                const rowCards = rows.map((row: any, k: number) =>
                    renderRow(row, rows.length > 1 ? k + 1 : null)).join("");
                return `<div>
  <div class="flex items-center gap-2 mb-1.5">
    <span class="px-2 py-0.5 rounded font-mono text-xs bg-violet-100 text-violet-800">${esc(t)}</span>
    <span class="text-xs text-gray-400">${rows.length} row${rows.length === 1 ? "" : "s"}</span>
  </div>
  <div class="space-y-2">${rowCards}</div>
</div>`;
            }).join('<div class="h-3"></div>');
        }

        const vFlow = renderFlow(v.fhirTypes, v.omopTables);
        return `<details open data-k="case-${esc(file.slug)}-${i}" class="border border-gray-200 rounded-lg overflow-hidden">
  <summary class="px-4 py-2.5 bg-gray-50 hover:bg-gray-100 flex items-center gap-3">
    <span class="text-gray-400 text-xs font-mono">#${i + 1}</span>
    <span class="font-medium text-gray-900 flex-1">${esc(v.desc ?? `variant ${i + 1}`)}</span>
    ${vFlow}
  </summary>
  <div class="not-prose grid lg:grid-cols-2 gap-5 p-4">
    <div>
      <div class="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">FHIR input</div>
      <div class="space-y-3">${fhirCards.join("")}</div>
    </div>
    <div>
      <div class="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Expected OMOP</div>
      ${omopHtml}
    </div>
  </div>
</details>`;
    }));

    return `<h1>${esc(file.title)}</h1>
<div class="-mt-1 mb-1">${flow}</div>
<p class="font-mono text-[11px] text-gray-400 -mt-1">cases/${esc(file.file)} · ${file.variantCount} variant${file.variantCount === 1 ? "" : "s"}</p>
${notesHtml ? `<div class="prose prose-sm max-w-none mb-4">${notesHtml}</div>` : ""}
<p class="not-prose text-[11px] text-gray-400 mb-3">FK ids shown as <span class="font-mono">ref:&lt;logical-id&gt;</span>. Per row, columns not listed are asserted <span class="font-mono">NULL</span>; tables not listed are asserted empty.</p>
<div class="not-prose space-y-4">${variants.join("")}</div>`;
}

// One expected OMOP row as a key/value card.
function renderRow(row: any, n: number | null): string {
    const keys = Object.keys(row).filter((k) => !k.endsWith("__name"));
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
    if (v === null || v === undefined) return `<span class="text-gray-400 italic">null</span>`;
    if (typeof v === "string" && v.startsWith("ref:")) {
        return `<span class="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-mono text-[12px]">${esc(v)}</span>`;
    }
    if (name !== undefined && name !== null) {
        return `<span class="font-mono text-[12px] text-gray-800">${esc(String(v))}</span>
  <span class="ml-1.5 px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[12px]">${esc(String(name))}</span>`;
    }
    if (typeof v === "number") return `<span class="font-mono text-[12px] text-indigo-700">${esc(String(v))}</span>`;
    if (typeof v === "boolean") return `<span class="font-mono text-[12px] text-indigo-700">${v}</span>`;
    return `<span class="text-gray-800">${esc(String(v))}</span>`;
}

function renderFlow(fhirTypes: string[], omopTables: string[]): string {
    const fhir = (fhirTypes ?? []).map((t) =>
        `<span class="px-1.5 py-0.5 rounded text-[11px] font-medium bg-sky-100 text-sky-800">${esc(t)}</span>`).join(" ");
    const omop = (omopTables ?? []).length
        ? omopTables.map((t) =>
            `<span class="px-1.5 py-0.5 rounded text-[11px] font-mono bg-violet-100 text-violet-800">${esc(t)}</span>`).join(" ")
        : `<span class="text-xs text-gray-400 italic">∅</span>`;
    return `<div class="not-prose flex items-center flex-wrap gap-1.5">${fhir}<span class="text-gray-400 px-1">→</span>${omop}</div>`;
}

function esc(s: string) {
    return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}
