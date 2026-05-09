export default async function (ctx: Context, _session: any, _req: Request) {
    const resources = ctx.fns.mapspec.list(ctx);
    const rows = resources
        .map((r) => {
            const tables = r.tables
                .map((t) => `<a href="/mapspec/${enc(r.resource)}/${enc(t)}" class="inline-block px-2 py-0.5 mr-1 mb-1 bg-blue-50 text-blue-700 rounded text-xs hover:bg-blue-100">${esc(t)}</a>`)
                .join("");
            return `<tr>
  <td class="align-top whitespace-nowrap"><a href="/mapspec/${enc(r.resource)}" class="font-medium text-gray-900 hover:underline">${esc(r.resource)}</a></td>
  <td class="align-top">${tables || `<span class="text-gray-400 text-xs">(index only)</span>`}</td>
</tr>`;
        })
        .join("");

    const main = `<h1>FHIR ↔ OMOP mapspec</h1>
<p class="text-gray-600">Per-resource mapping documentation. ${resources.length} FHIR resource group(s).</p>
<table class="not-prose w-full mt-6 border border-gray-200">
  <thead><tr class="bg-gray-50"><th class="text-left px-3 py-2 border-b border-gray-200 text-xs font-semibold text-gray-700">FHIR resource</th><th class="text-left px-3 py-2 border-b border-gray-200 text-xs font-semibold text-gray-700">OMOP target tables</th></tr></thead>
  <tbody>${rows}</tbody>
</table>`;

    return { title: "Index", main };
}

function esc(s: string) {
    return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}
function enc(s: string) {
    return encodeURIComponent(s);
}
