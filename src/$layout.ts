import { loadEdges, byResource, byTable } from "./mapspec/list";

export default function (
    ctx: Context,
    opts: { title?: string; main: string; headExtra?: string; current?: string },
    _req?: Request,
) {
    const edges = loadEdges();
    const resMap = byResource(edges);
    const tblMap = byTable(edges);

    // Also merge legacy resources from the old list function
    const legacyList = ctx.fns.mapspec?.list ? ctx.fns.mapspec.list(ctx) : [];
    for (const item of legacyList) {
        if (!resMap.has(item.resource)) {
            // Add placeholder entries for resources not yet migrated
            resMap.set(item.resource, item.tables.map((t) => ({
                fhir_resource: item.resource,
                omop_table: t,
                direction: "fhir-to-omop",
                status: "documented",
                fields: [],
            } as any)));
            for (const t of item.tables) {
                const arr = tblMap.get(t) ?? [];
                arr.push({ fhir_resource: item.resource, omop_table: t, direction: "fhir-to-omop", status: "documented", fields: [] } as any);
                tblMap.set(t, arr);
            }
        }
    }

    const sidebar = renderSidebar(resMap, tblMap, opts.current);
    const title = opts.title ? `${opts.title} · fhir2omop` : "fhir2omop";
    return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>${esc(title)}</title>
<script src="https://cdn.tailwindcss.com?plugins=typography"></script>
<script src="https://unpkg.com/htmx.org@2.0.4"></script>
<style>
  body { font-family: ui-sans-serif, system-ui, -apple-system, sans-serif; }
  .shiki { background: transparent !important; }
  .prose pre.shiki { padding: .6em .8em; border-radius: 6px; overflow-x: auto; margin: .4em 0; font-size: 12.5px; line-height: 1.45; background: #f6f8fa !important; }
  .prose code:not(.shiki code) { background: #f6f8fa; padding: 1px 4px; border-radius: 3px; font-size: 90%; }
  .prose table { font-size: 13px; }
  .prose th, .prose td { padding: 4px 8px; border: 1px solid #e5e7eb; }
  .prose th { background: #f9fafb; }
  details summary { cursor: pointer; }
  details summary::-webkit-details-marker { display: none; }
  details summary::marker { display: none; content: ""; }
  .htmx-request #main-content { opacity: 0.55; transition: opacity 120ms; }
</style>
${opts.headExtra ?? ""}
</head>
<body class="bg-white text-gray-900 text-sm h-screen"
  hx-boost="true"
  hx-target="#main-content"
  hx-select="#main-content"
  hx-select-oob="#sidebar"
  hx-swap="outerHTML show:window:top">
<div class="flex h-screen">
  ${sidebar}
  <main class="flex-1 overflow-auto p-8">
    <div id="main-content" class="prose prose-sm max-w-6xl">
      <span hidden data-page-title>${esc(title)}</span>
      ${opts.main}
    </div>
  </main>
</div>
<script>
  document.addEventListener("htmx:afterSwap", function (e) {
    var t = document.querySelector("[data-page-title]");
    if (t) document.title = (t.textContent || "").trim();
  });
</script>
</body>
</html>`;
}

function renderSidebar(
    resMap: Map<string, any[]>,
    tblMap: Map<string, any[]>,
    current: string | undefined,
) {
    // By FHIR Resource
    const resList = [...resMap.keys()].sort();
    const resItems = resList
        .map((res) => {
            const edges = resMap.get(res) ?? [];
            const isCur = current === res;
            const tableLinks = edges
                .map((e) => {
                    const key = `${res}/${e.omop_table}`;
                    const isCurTable = current === key;
                    const statusDot = e.status === "implemented"
                        ? `<span class="inline-block w-1.5 h-1.5 rounded-full bg-green-400 mr-1"></span>`
                        : e.status === "documented"
                            ? `<span class="inline-block w-1.5 h-1.5 rounded-full bg-yellow-400 mr-1"></span>`
                            : `<span class="inline-block w-1.5 h-1.5 rounded-full bg-gray-300 mr-1"></span>`;
                    return `<li><a href="/mapspec/${enc(res)}/${enc(e.omop_table)}" class="flex items-center pl-6 pr-3 py-1 text-xs hover:bg-gray-100 ${isCurTable ? "bg-blue-50 font-medium text-blue-800" : "text-gray-600"}">${statusDot}${esc(e.omop_table)}</a></li>`;
                })
                .join("");
            return `<li>
  <a href="/mapspec/${enc(res)}" class="block px-3 py-1.5 hover:bg-gray-100 text-xs ${isCur ? "bg-blue-50 font-semibold text-blue-800" : "font-medium"}">${esc(res)}</a>
  <ul>${tableLinks}</ul>
</li>`;
        })
        .join("");

    // By OMOP Table
    const tblList = [...tblMap.keys()].sort();
    const tblItems = tblList
        .map((tbl) => {
            const edges = tblMap.get(tbl) ?? [];
            const isCurTbl = current === `table:${tbl}`;
            const resources = edges.map((e) => {
                const key = `${e.fhir_resource}/${tbl}`;
                const isCurTable = current === key;
                return `<li><a href="/mapspec/${enc(e.fhir_resource)}/${enc(tbl)}" class="block pl-6 pr-3 py-1 text-xs hover:bg-gray-100 ${isCurTable ? "bg-blue-50 font-medium text-blue-800" : "text-gray-600"}">${esc(e.fhir_resource)}</a></li>`;
            }).join("");
            return `<li>
  <a href="/table/${enc(tbl)}" class="block px-3 py-1.5 hover:bg-gray-100 text-xs font-mono ${isCurTbl ? "bg-blue-50 font-semibold text-blue-800" : "font-medium text-gray-700"}">${esc(tbl)}</a>
  <ul>${resources}</ul>
</li>`;
        })
        .join("");

    return `<aside id="sidebar" hx-swap-oob="outerHTML" class="w-60 shrink-0 border-r border-gray-200 flex flex-col bg-gray-50 overflow-y-auto">
  <a href="/" class="block px-4 py-3 border-b border-gray-200 font-semibold text-gray-900 hover:bg-gray-100">fhir2omop</a>
  <details open class="border-b border-gray-200">
    <summary class="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:bg-gray-100 flex items-center justify-between">
      FHIR Resources
      <svg class="w-3 h-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
    </summary>
    <ul class="pb-2">${resItems}</ul>
  </details>
  <details class="border-b border-gray-200">
    <summary class="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:bg-gray-100 flex items-center justify-between">
      OMOP Tables
      <svg class="w-3 h-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
    </summary>
    <ul class="pb-2">${tblItems}</ul>
  </details>
</aside>`;
}

function esc(s: string) {
    return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

function enc(s: string) {
    return encodeURIComponent(s);
}
