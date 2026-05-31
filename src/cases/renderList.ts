// Render the /cases index as a simple list: one row per branch file —
// title / slug, with a pass/fail check on the right. No cards.
export default function (ctx: Context, opts: { cases: any[] }): string {
    const { cases } = opts;

    if (!cases.length) {
        return `<h1>Test cases</h1>
<p class="text-gray-500">No cases found in <code>cases/*.json</code>.</p>`;
    }

    const check = (c: any): string => {
        if (c.status === "pass") return `<span class="text-emerald-600 text-sm font-semibold whitespace-nowrap" title="pass">✓ ${c.passCount}/${c.ranCount}</span>`;
        if (c.status === "fail") return `<span class="text-rose-600 text-sm font-semibold whitespace-nowrap" title="fail">✗ ${c.passCount}/${c.ranCount}</span>`;
        return `<span class="text-gray-300 text-sm" title="not run">○</span>`;
    };

    const rows = cases.map((c) => {
        const err = c.error ? `<span class="ml-2 text-[11px] text-rose-600">parse error</span>` : "";
        return `<a href="/cases/${enc(c.slug)}" class="flex items-center justify-between gap-3 px-4 py-2 no-underline hover:bg-gray-50 border-t border-gray-100 first:border-t-0">
  <div class="min-w-0 flex-1">
    <div class="text-[13px] text-gray-800 leading-snug">${esc(c.title)}${err}</div>
    <div class="font-mono text-[11px] text-gray-400 truncate">${esc(c.slug)}</div>
  </div>
  ${check(c)}
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
<p class="text-gray-600 -mt-1">Golden FHIR&nbsp;→&nbsp;OMOP fixtures, organized by implementation branch. Each file is a feature (race, ethnicity, domain-routing, …) holding variant cases that cover its corner cases. <strong>${cases.length}</strong> branches, <strong>${totalVariants}</strong> variants. ${runLine}</p>
<div class="not-prose mt-4 border border-gray-200 rounded-lg overflow-hidden">${rows}</div>`;
}

function esc(s: string) {
    return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}
function enc(s: string) { return encodeURIComponent(s); }
