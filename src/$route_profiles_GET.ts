export default async function (ctx: Context, _session: any, _req: Request) {
    const { profiles, valuesets } = await ctx.fns.profiles.load(ctx);

    const byType = new Map<string, typeof profiles>();
    for (const p of profiles) {
        const arr = byType.get(p.type) ?? [];
        arr.push(p);
        byType.set(p.type, arr);
    }

    const profileCards = [...byType.entries()].sort().map(([type, ps]) => {
        const branchSplit = ps.length > 1;
        const branches = ps.map((p) => {
            const codeEl = p.differential?.element?.find((e: any) =>
                e.path?.endsWith(".code") && e.binding?.valueSet);
            const codeVsUrl = codeEl?.binding?.valueSet;
            const vs = codeVsUrl ? valuesets.find((v) => v.url === codeVsUrl) : undefined;
            return `
<div class="border border-gray-200 rounded-md p-3 bg-white">
  <div class="flex items-center gap-2 mb-1">
    <a href="/profiles/${enc(p.id)}" class="font-mono text-sm font-medium text-blue-700 hover:underline">${esc(p.id)}</a>
    ${p.targetTable ? `<span class="text-gray-400">→</span><a href="/table/${enc(p.targetTable)}" class="font-mono text-sm text-green-700 hover:underline">${esc(p.targetTable)}</a>` : ""}
  </div>
  ${p.description ? `<div class="text-xs text-gray-500 leading-snug mb-2">${esc(p.description.slice(0, 200))}${p.description.length > 200 ? "…" : ""}</div>` : ""}
  ${vs
                ? `<div class="text-[11px] text-gray-500 mt-1">
        <span class="text-gray-400">code ∈</span>
        <a href="/profiles/${enc(vs.id)}" class="font-mono text-purple-700 hover:underline">${esc(vs.id)}</a>
        ${vs.domain ? `<span class="ml-1 px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 text-[10px] font-medium">domain=${esc(vs.domain)}</span>` : ""}
      </div>`
                : ""}
</div>`;
        }).join("");

        return `
<div class="mb-6">
  <h3 class="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
    <span class="font-mono text-blue-800">${esc(type)}</span>
    ${branchSplit ? `<span class="text-[10px] uppercase tracking-wider text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">routes to ${ps.length}</span>` : ""}
  </h3>
  <div class="${branchSplit ? "grid grid-cols-2 gap-3" : ""}">${branches}</div>
</div>`;
    }).join("");

    const vsRows = valuesets.map((v) => {
        const sampleCount = v.compose?.include.reduce((s, inc) => s + (inc.concept?.length ?? 0), 0) ?? 0;
        const systems = (v.compose?.include ?? []).map((inc) => inc.system).join(", ");
        return `
<tr class="border-t border-gray-100">
  <td class="px-3 py-2"><a href="/profiles/${enc(v.id)}" class="font-mono text-sm text-purple-700 hover:underline">${esc(v.id)}</a></td>
  <td class="px-3 py-2">${v.domain ? `<span class="px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 text-xs font-medium">${esc(v.domain)}</span>` : ""}</td>
  <td class="px-3 py-2 text-xs text-gray-600 font-mono truncate max-w-md" title="${esc(systems)}">${esc(systems)}</td>
  <td class="px-3 py-2 text-xs text-gray-500 text-right">${sampleCount}</td>
</tr>`;
    }).join("");

    const main = `
<div class="not-prose">
  <div class="mb-6">
    <h1 class="text-3xl font-bold text-gray-900 mb-1">Profiles &amp; ValueSets</h1>
    <p class="text-gray-500 text-sm">FHIR StructureDefinitions and ValueSets that gate conversion into OMOP tables. Domain routing: a FHIR resource maps to an OMOP table iff it validates against the corresponding profile — and the profile's <code class="text-xs bg-gray-100 px-1 rounded">code</code> binding is the discriminator.</p>
  </div>

  <div class="grid grid-cols-3 gap-4 mb-8">
    <div class="bg-white border border-gray-200 rounded-lg p-4">
      <div class="text-2xl font-bold text-gray-900">${profiles.length}</div>
      <div class="text-xs text-gray-500 mt-1">Profiles (StructureDefinition)</div>
    </div>
    <div class="bg-white border border-gray-200 rounded-lg p-4">
      <div class="text-2xl font-bold text-gray-900">${valuesets.length}</div>
      <div class="text-xs text-gray-500 mt-1">ValueSets (routing keys)</div>
    </div>
    <div class="bg-white border border-gray-200 rounded-lg p-4">
      <div class="text-2xl font-bold text-amber-700">${[...byType.values()].filter((v) => v.length > 1).length}</div>
      <div class="text-xs text-gray-500 mt-1">Routing pairs (1 resource → N tables)</div>
    </div>
  </div>

  <div class="bg-white border border-gray-200 rounded-lg p-5 mb-8">
    <h2 class="text-sm font-semibold text-gray-700 mb-4">Profiles by FHIR resource → OMOP table</h2>
    ${profileCards}
  </div>

  <div class="bg-white border border-gray-200 rounded-lg p-5">
    <h2 class="text-sm font-semibold text-gray-700 mb-3">ValueSets (one per OMOP domain)</h2>
    <table class="w-full text-sm">
      <thead><tr class="border-b border-gray-200 text-xs text-gray-500 uppercase">
        <th class="px-3 py-1.5 text-left font-medium">ID</th>
        <th class="px-3 py-1.5 text-left font-medium">OMOP Domain</th>
        <th class="px-3 py-1.5 text-left font-medium">Source systems</th>
        <th class="px-3 py-1.5 text-right font-medium">Sample codes</th>
      </tr></thead>
      <tbody>${vsRows}</tbody>
    </table>
  </div>
</div>`;
    return { title: "Profiles", main };
}

function esc(s: string) { return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!)); }
function enc(s: string) { return encodeURIComponent(s); }
