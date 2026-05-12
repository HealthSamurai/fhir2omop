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
    return { title: resource.id, main: await renderValueSet(resource) };
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

async function renderValueSet(v: types.profiles.ValueSet): Promise<string> {
    const includes = v.compose?.include ?? [];
    const aliases = await loadAliases();

    const includeCards = includes.map((inc) => {
        const short = shortSystem(inc.system);
        const vocabId = aliases.aliases?.[inc.system];
        const loaded = vocabId ? aliases.loaded?.[vocabId] : undefined;
        const n = inc.concept?.length ?? 0;
        const filters = (inc as any).filter as Array<{ property: string; op: string; value: string }> | undefined;

        const loadedBadge = loaded === true
            ? `<span class="px-1.5 py-0.5 rounded bg-green-50 text-green-700 text-[10px] font-medium">loaded ✓</span>`
            : loaded === false
                ? `<span class="px-1.5 py-0.5 rounded bg-red-50 text-red-700 text-[10px] font-medium">not loaded</span>`
                : "";
        const vocabBadge = vocabId
            ? `<span class="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 text-[10px] font-medium font-mono">vocab: ${esc(vocabId)}</span>`
            : `<span class="px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 text-[10px] font-medium">no OMOP alias</span>`;

        const conceptRows = (inc.concept ?? []).map((c) => `
<tr class="border-t border-gray-100">
  <td class="px-3 py-1 text-xs font-mono text-purple-700 whitespace-nowrap">${esc(c.code)}</td>
  <td class="px-3 py-1 text-xs text-gray-700">${esc(c.display ?? "")}</td>
</tr>`).join("");

        const filtersHtml = filters?.length
            ? `<div class="px-4 py-2 bg-amber-50 border-b border-amber-200 text-xs">
                <span class="text-[10px] uppercase tracking-wider text-amber-800 font-medium mr-2">filters</span>
                ${filters.map((f) => `<code class="font-mono text-amber-900">${esc(f.property)} ${esc(f.op)} ${esc(f.value)}</code>`).join(" · ")}
              </div>`
            : "";

        const conceptTable = n > 0
            ? `<table class="w-full">
                 <thead class="bg-gray-50 text-[10px] uppercase tracking-wider text-gray-500 border-b border-gray-200">
                   <tr>
                     <th class="px-3 py-1.5 text-left font-medium w-32">Code</th>
                     <th class="px-3 py-1.5 text-left font-medium">Display</th>
                   </tr>
                 </thead>
                 <tbody>${conceptRows}</tbody>
               </table>`
            : `<div class="px-4 py-3 text-xs text-gray-500 italic">No enumerated concepts in this include (intensional / open subset — see expansion SQL).</div>`;

        return `
<div class="mb-5 border border-gray-200 rounded-lg overflow-hidden">
  <div class="px-4 py-2 bg-white border-b border-gray-200">
    <div class="flex items-baseline justify-between gap-3 flex-wrap">
      <div>
        <span class="text-sm font-semibold text-gray-900">include</span>
        <span class="mx-2 text-gray-400">·</span>
        <span class="text-sm font-mono font-medium text-blue-800">${esc(short)}</span>
      </div>
      <div class="flex items-center gap-1.5">
        ${vocabBadge}${loadedBadge}
        ${n > 0 ? `<span class="px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 text-[10px] font-mono">${n} code${n === 1 ? "" : "s"}</span>` : ""}
      </div>
    </div>
    <div class="text-[11px] font-mono text-gray-500 mt-0.5 break-all">${esc(inc.system)}</div>
  </div>
  ${filtersHtml}
  ${conceptTable}
</div>`;
    }).join("");

    return `
<div class="not-prose">
  <div class="mb-6">
    <div class="text-xs text-gray-500 mb-1"><a href="/profiles" class="hover:underline">profiles</a> / ValueSet</div>
    <h1 class="text-2xl font-bold text-gray-900">${esc(v.title ?? v.name ?? v.id)}</h1>
    <div class="mt-1 flex items-center gap-2 text-sm">
      <span class="font-mono text-purple-700">${esc(v.id)}</span>
      ${v.domain ? `<span class="ml-1 px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 text-xs font-medium">OMOP domain: ${esc(v.domain)}</span>` : ""}
      <span class="ml-1 px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 text-[10px] font-mono">${includes.length} include${includes.length === 1 ? "" : "s"}</span>
    </div>
    ${v.description ? `<p class="mt-3 text-sm text-gray-600 leading-relaxed">${esc(v.description)}</p>` : ""}
  </div>

  <h2 class="text-sm font-semibold text-gray-700 mb-2">compose.include</h2>
  ${includeCards}

  ${v.expansionSql ? `
  <div class="bg-gray-900 text-green-300 rounded-lg p-4 mb-6 overflow-x-auto">
    <div class="text-[10px] uppercase tracking-wider text-gray-400 mb-2">Authoritative expansion (run against the loaded Athena vocab)</div>
    <pre class="text-xs font-mono leading-relaxed">${esc(v.expansionSql)}</pre>
  </div>` : ""}

  <details class="mt-6 border border-gray-200 rounded-lg overflow-hidden">
    <summary class="px-4 py-2 bg-gray-50 text-xs font-medium text-gray-700 hover:bg-gray-100">Raw JSON</summary>
    <pre class="px-4 py-3 text-[11px] font-mono overflow-x-auto bg-white">${esc(JSON.stringify(v, null, 2))}</pre>
  </details>
</div>`;
}

let _aliasesCache: any = null;
async function loadAliases(): Promise<any> {
    if (_aliasesCache) return _aliasesCache;
    try {
        const path = new URL("../mapspec/profiles/system-aliases.json", import.meta.url).pathname;
        _aliasesCache = JSON.parse(await Bun.file(path).text());
    } catch {
        _aliasesCache = {};
    }
    return _aliasesCache;
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
        "http://snomed.info/sct": "SNOMED CT",
        "http://loinc.org": "LOINC",
        "http://www.nlm.nih.gov/research/umls/rxnorm": "RxNorm",
        "http://hl7.org/fhir/sid/icd-10-cm": "ICD-10-CM",
        "http://hl7.org/fhir/sid/icd-9-cm": "ICD-9-CM",
        "http://hl7.org/fhir/sid/icd-10-pcs": "ICD-10-PCS",
        "http://hl7.org/fhir/sid/ndc": "NDC",
        "http://hl7.org/fhir/sid/cvx": "CVX",
        "http://www.ama-assn.org/go/cpt": "CPT-4",
        "http://unitsofmeasure.org": "UCUM",
        "http://terminology.hl7.org/CodeSystem/v3-ActCode": "v3 ActCode",
        "https://www.cms.gov/Medicare/Coding/place-of-service-codes": "CMS POS",
    } as Record<string, string>)[s] ?? s;
}
function esc(s: string) { return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!)); }
function enc(s: string) { return encodeURIComponent(s); }
