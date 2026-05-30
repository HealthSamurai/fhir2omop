// Render the /cases index: one card per branch file, showing the FHIR→OMOP
// flow, tables touched, and how many variant cases it covers.
export default function (ctx: Context, opts: { cases: any[] }): string {
    const { cases } = opts;

    if (!cases.length) {
        return `<h1>Test cases</h1>
<p class="text-gray-500">No cases found in <code>cases/*.json</code>.</p>`;
    }

    const borderFor = (s: string) => s === "pass" ? "border-emerald-300" : s === "fail" ? "border-rose-300" : "border-gray-200";
    const cards = cases.map((c) => {
        const flow = renderFlow(c.fhirTypes, c.omopTables);
        const variants = `<span class="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">${c.variantCount} variant${c.variantCount === 1 ? "" : "s"}</span>`;
        const status = statusBadge(c);
        const err = c.error ? `<div class="mt-1 text-xs text-rose-600">parse error: ${esc(c.error)}</div>` : "";
        return `<a href="/cases/${enc(c.slug)}" hx-boost="true"
   class="block no-underline border ${borderFor(c.status)} rounded-lg p-4 hover:shadow-sm transition">
  <div class="flex items-start justify-between gap-2">
    <div class="font-semibold text-gray-900 leading-snug">${esc(c.title)}</div>
    <div class="flex items-center gap-1.5 shrink-0">${status}${variants}</div>
  </div>
  <div class="mt-2">${flow}</div>
  <div class="mt-2 font-mono text-[11px] text-gray-400">${esc(c.file)}</div>
  ${err}
</a>`;
    }).join("");

    const totalVariants = cases.reduce((n, c) => n + (c.variantCount ?? 0), 0);
    const ran = cases.filter((c) => c.status !== "unrun");
    const totPass = cases.reduce((n, c) => n + (c.passCount ?? 0), 0);
    const totRan = cases.reduce((n, c) => n + (c.ranCount ?? 0), 0);
    const runLine = ran.length === 0
        ? `Not run yet — <code>bun script/run-cases.ts</code> to execute against the real pipeline.`
        : `Last run: <strong class="${totPass === totRan ? "text-emerald-700" : "text-rose-700"}">${totPass}/${totRan} green</strong>${cases[0]?.ranAt ? ` · ${esc(String(cases[0].ranAt).slice(0, 19).replace("T", " "))}` : ""}.`;
    return `<h1>Test cases</h1>
<p class="text-gray-600 -mt-1">Golden FHIR&nbsp;→&nbsp;OMOP fixtures, organized by implementation branch. Each file is a feature (race, ethnicity, domain-routing, …) holding variant cases that cover its corner cases — grounded in real Synthea data + the verified output. <strong>${cases.length}</strong> branches, <strong>${totalVariants}</strong> variants. ${runLine}</p>
<div class="not-prose grid gap-3 sm:grid-cols-2 mt-4">${cards}</div>`;
}

function statusBadge(c: any): string {
    if (c.status === "pass") return `<span class="px-2 py-0.5 rounded text-xs font-semibold bg-emerald-100 text-emerald-800">✓ ${c.passCount}/${c.ranCount}</span>`;
    if (c.status === "fail") return `<span class="px-2 py-0.5 rounded text-xs font-semibold bg-rose-100 text-rose-800">✗ ${c.passCount}/${c.ranCount}</span>`;
    return `<span class="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-400">not run</span>`;
}

function renderFlow(fhirTypes: string[], omopTables: string[]): string {
    const fhir = (fhirTypes ?? []).map((t) =>
        `<span class="px-1.5 py-0.5 rounded text-[11px] font-medium bg-sky-100 text-sky-800">${esc(t)}</span>`).join(" ");
    const omop = (omopTables ?? []).length
        ? omopTables.map((t) =>
            `<span class="px-1.5 py-0.5 rounded text-[11px] font-mono bg-violet-100 text-violet-800">${esc(t)}</span>`).join(" ")
        : `<span class="text-xs text-gray-400 italic">(no rows)</span>`;
    return `<div class="flex items-center flex-wrap gap-1.5 text-xs">${fhir}<span class="text-gray-400">→</span>${omop}</div>`;
}

function esc(s: string) {
    return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}
function enc(s: string) { return encodeURIComponent(s); }
