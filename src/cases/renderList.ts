// Render the /cases index: one card per golden test case, showing the
// FHIR→OMOP flow, tables touched, and expected row count.
export default function (ctx: Context, opts: { cases: any[] }): string {
    const { cases } = opts;

    if (!cases.length) {
        return `<h1>Test cases</h1>
<p class="text-gray-500">No cases found in <code>cases/*.json</code>.</p>`;
    }

    const cards = cases.map((c) => {
        const flow = renderFlow(c.fhirTypes, c.omopTables);
        const rowsBadge = c.omopRows === 0
            ? `<span class="px-2 py-0.5 rounded text-xs font-medium bg-rose-100 text-rose-700">0 rows (negative)</span>`
            : `<span class="px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800">${c.omopRows} expected row${c.omopRows === 1 ? "" : "s"}</span>`;
        const err = c.error ? `<div class="mt-1 text-xs text-rose-600">parse error: ${esc(c.error)}</div>` : "";
        return `<a href="/cases/${enc(c.slug)}" hx-boost="true"
   class="block no-underline border border-gray-200 rounded-lg p-4 hover:border-emerald-400 hover:shadow-sm transition">
  <div class="flex items-start justify-between gap-3">
    <div class="font-semibold text-gray-900 leading-snug">${esc(c.title)}</div>
    ${rowsBadge}
  </div>
  <div class="mt-2">${flow}</div>
  <div class="mt-2 font-mono text-[11px] text-gray-400">${esc(c.file)}</div>
  ${err}
</a>`;
    }).join("");

    return `<h1>Test cases</h1>
<p class="text-gray-600 -mt-1">Golden FHIR&nbsp;→&nbsp;OMOP fixtures: a self-contained set of FHIR resources and the exact OMOP rows the pipeline must produce. Grounded in real Synthea data + the verified output.</p>
<div class="not-prose grid gap-3 sm:grid-cols-2 mt-4">${cards}</div>`;
}

// FHIR resource-type chips → arrow → OMOP table chips.
function renderFlow(fhirTypes: string[], omopTables: string[]): string {
    const fhir = fhirTypes.map((t) =>
        `<span class="px-1.5 py-0.5 rounded text-[11px] font-medium bg-sky-100 text-sky-800">${esc(t)}</span>`).join(" ");
    const omop = omopTables.length
        ? omopTables.map((t) =>
            `<span class="px-1.5 py-0.5 rounded text-[11px] font-mono bg-violet-100 text-violet-800">${esc(t)}</span>`).join(" ")
        : `<span class="text-xs text-gray-400 italic">(no rows)</span>`;
    return `<div class="flex items-center flex-wrap gap-1.5 text-xs">
  ${fhir}
  <span class="text-gray-400">→</span>
  ${omop}
</div>`;
}

function esc(s: string) {
    return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}
function enc(s: string) { return encodeURIComponent(s); }
