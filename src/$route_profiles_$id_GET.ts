export default async function (ctx: Context, _session: any, req: Request) {
    const url = new URL(req.url);
    const id = decodeURIComponent(url.pathname.split("/").filter(Boolean)[1] ?? "");
    const resource = await ctx.fns.profiles.byId(ctx, { id });
    if (!resource) {
        return { title: id, main: `<div class="text-red-600">Not found: ${esc(id)}</div>`, status: 404 };
    }
    if (resource.resourceType === "StructureDefinition") {
        return { title: resource.id, main: await renderProfile(ctx, resource) };
    }
    return { title: resource.id, main: renderValueSet(resource) };
}

async function renderProfile(ctx: Context, p: types.profiles.Profile): Promise<string> {
    const elements = p.differential?.element ?? [];
    const codeEl = elements.find((e: any) =>
        (e.path === `${p.type}.code` || e.path === `${p.type}.medication[x]`) && e.binding?.valueSet);
    const codeVsUrl = codeEl?.binding?.valueSet;
    const codeVs = codeVsUrl ? await ctx.fns.profiles.valueSetByUrl(ctx, { url: codeVsUrl }) : undefined;

    const rows = elements.map((el: any) => {
        const card = formatCardinality(el);
        const types = (el.type ?? []).map((t: any) => t.code).join(" | ");
        const binding = el.binding
            ? `<a href="${el.binding.valueSet.startsWith("https://fhir2omop") ? `/profiles/${enc(valueSetIdFromUrl(el.binding.valueSet))}` : el.binding.valueSet}" class="text-purple-700 hover:underline">${esc(shortUrl(el.binding.valueSet))}</a>
               <span class="text-[10px] uppercase ml-1 text-gray-500">${esc(el.binding.strength)}</span>`
            : "";
        const fixed = el.fixedCode || el.fixedUri ? `<span class="text-xs font-mono text-amber-700">fixed: ${esc(el.fixedCode || el.fixedUri)}</span>` : "";
        const ms = el.mustSupport ? `<span class="px-1 py-0.5 rounded bg-blue-50 text-blue-700 text-[10px] font-medium">MS</span>` : "";

        return `
<tr class="border-t border-gray-100 align-top">
  <td class="px-3 py-2 font-mono text-xs text-gray-800">${esc(el.path)}</td>
  <td class="px-3 py-2 text-xs">${card} ${ms}</td>
  <td class="px-3 py-2 font-mono text-xs text-gray-600">${esc(types)}</td>
  <td class="px-3 py-2 text-xs">${binding}${fixed}</td>
  <td class="px-3 py-2 text-xs text-gray-500 leading-snug">${esc(el.comment ?? el.short ?? "")}</td>
</tr>`;
    }).join("");

    return `
<div class="not-prose">
  <div class="mb-6">
    <div class="text-xs text-gray-500 mb-1"><a href="/profiles" class="hover:underline">profiles</a> / StructureDefinition</div>
    <h1 class="text-2xl font-bold text-gray-900">${esc(p.title ?? p.name ?? p.id)}</h1>
    <div class="mt-1 flex items-center gap-2 text-sm">
      <span class="font-mono text-blue-700">${esc(p.type)}</span>
      ${p.targetTable ? `<span class="text-gray-400">→</span><a href="/table/${enc(p.targetTable)}" class="font-mono text-green-700 hover:underline">${esc(p.targetTable)}</a>` : ""}
      ${p.edgeKey ? `<a href="/mapspec/${enc(p.edgeKey.replace("__", "/"))}" class="text-[10px] uppercase tracking-wider text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded hover:bg-gray-200">edge mapspec</a>` : ""}
    </div>
    ${p.description ? `<p class="mt-3 text-sm text-gray-600 leading-relaxed">${esc(p.description)}</p>` : ""}
  </div>

  ${codeVs ? `
  <div class="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
    <div class="text-xs text-purple-800 font-medium uppercase tracking-wider mb-1">Routing key — code binding</div>
    <a href="/profiles/${enc(codeVs.id)}" class="font-mono text-sm text-purple-900 hover:underline">${esc(codeVs.id)}</a>
    ${codeVs.domain ? `<span class="ml-2 text-xs text-purple-700">OMOP domain: <strong>${esc(codeVs.domain)}</strong></span>` : ""}
    <p class="text-xs text-purple-700 mt-1 leading-snug">If <code class="bg-white px-1 rounded">${esc(p.type)}.code</code> resolves to a concept in this ValueSet, the resource converts to <strong>${esc(p.targetTable ?? "")}</strong>.</p>
  </div>` : ""}

  <div class="bg-white border border-gray-200 rounded-lg overflow-hidden">
    <table class="w-full">
      <thead class="bg-gray-50 text-[10px] uppercase tracking-wider text-gray-500 border-b border-gray-200">
        <tr>
          <th class="px-3 py-2 text-left font-medium">Path</th>
          <th class="px-3 py-2 text-left font-medium">Card</th>
          <th class="px-3 py-2 text-left font-medium">Type</th>
          <th class="px-3 py-2 text-left font-medium">Binding / Fixed</th>
          <th class="px-3 py-2 text-left font-medium">Comment</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  </div>

  <details class="mt-6 border border-gray-200 rounded-lg overflow-hidden">
    <summary class="px-4 py-2 bg-gray-50 text-xs font-medium text-gray-700 hover:bg-gray-100">Raw JSON</summary>
    <pre class="px-4 py-3 text-[11px] font-mono overflow-x-auto bg-white">${esc(JSON.stringify(p, null, 2))}</pre>
  </details>
</div>`;
}

function renderValueSet(v: types.profiles.ValueSet): string {
    const includes = v.compose?.include ?? [];
    const rows = includes.flatMap((inc) =>
        (inc.concept ?? []).map((c) => `
<tr class="border-t border-gray-100">
  <td class="px-3 py-1.5 text-xs font-mono text-gray-700">${esc(shortSystem(inc.system))}</td>
  <td class="px-3 py-1.5 text-xs font-mono text-purple-700">${esc(c.code)}</td>
  <td class="px-3 py-1.5 text-xs text-gray-700">${esc(c.display ?? "")}</td>
</tr>`)
    ).join("");
    const sourceSystems = [...new Set(includes.map((i) => i.system))];

    return `
<div class="not-prose">
  <div class="mb-6">
    <div class="text-xs text-gray-500 mb-1"><a href="/profiles" class="hover:underline">profiles</a> / ValueSet</div>
    <h1 class="text-2xl font-bold text-gray-900">${esc(v.title ?? v.name ?? v.id)}</h1>
    <div class="mt-1 flex items-center gap-2 text-sm">
      <span class="font-mono text-purple-700">${esc(v.id)}</span>
      ${v.domain ? `<span class="ml-1 px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 text-xs font-medium">OMOP domain: ${esc(v.domain)}</span>` : ""}
    </div>
    ${v.description ? `<p class="mt-3 text-sm text-gray-600 leading-relaxed">${esc(v.description)}</p>` : ""}
  </div>

  ${v.expansionSql ? `
  <div class="bg-gray-900 text-green-300 rounded-lg p-4 mb-6 overflow-x-auto">
    <div class="text-[10px] uppercase tracking-wider text-gray-400 mb-2">Authoritative expansion (run against the loaded Athena vocab)</div>
    <pre class="text-xs font-mono leading-relaxed">${esc(v.expansionSql)}</pre>
  </div>` : ""}

  <div class="bg-white border border-gray-200 rounded-lg p-4 mb-4">
    <div class="text-xs text-gray-500 mb-2">Source code systems</div>
    <ul class="text-sm font-mono text-gray-700 space-y-1">
      ${sourceSystems.map((s) => `<li>${esc(s)}</li>`).join("")}
    </ul>
  </div>

  <div class="bg-white border border-gray-200 rounded-lg overflow-hidden">
    <div class="px-4 py-2 bg-gray-50 border-b border-gray-200 text-xs font-medium text-gray-700">Example concepts</div>
    <table class="w-full">
      <thead class="text-[10px] uppercase tracking-wider text-gray-500 border-b border-gray-200">
        <tr>
          <th class="px-3 py-2 text-left font-medium">System</th>
          <th class="px-3 py-2 text-left font-medium">Code</th>
          <th class="px-3 py-2 text-left font-medium">Display</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  </div>

  <details class="mt-6 border border-gray-200 rounded-lg overflow-hidden">
    <summary class="px-4 py-2 bg-gray-50 text-xs font-medium text-gray-700 hover:bg-gray-100">Raw JSON</summary>
    <pre class="px-4 py-3 text-[11px] font-mono overflow-x-auto bg-white">${esc(JSON.stringify(v, null, 2))}</pre>
  </details>
</div>`;
}

function formatCardinality(el: any): string {
    const min = el.min ?? "";
    const max = el.max ?? "";
    if (min === "" && max === "") return "";
    return `<span class="font-mono text-xs">${min}..${max || "*"}</span>`;
}
function shortUrl(u: string): string {
    if (u.startsWith("http://hl7.org/fhir/ValueSet/")) return "fhir/" + u.split("/").pop();
    if (u.startsWith("https://fhir2omop.health-samurai.io/ValueSet/")) return u.split("/").pop()!;
    return u;
}
function valueSetIdFromUrl(u: string): string { return u.split("/").pop() ?? u; }
function shortSystem(s: string): string {
    return ({
        "http://snomed.info/sct": "SNOMED",
        "http://loinc.org": "LOINC",
        "http://www.nlm.nih.gov/research/umls/rxnorm": "RxNorm",
        "http://hl7.org/fhir/sid/icd-10-cm": "ICD-10-CM",
        "http://hl7.org/fhir/sid/ndc": "NDC",
        "http://hl7.org/fhir/sid/cvx": "CVX",
        "http://unitsofmeasure.org": "UCUM",
    } as Record<string, string>)[s] ?? s;
}
function esc(s: string) { return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!)); }
function enc(s: string) { return encodeURIComponent(s); }
