export default function (
    ctx: Context,
    opts: { title?: string; main: string; headExtra?: string; current?: string },
    _req?: Request,
) {
    const resources = ctx.fns.mapspec?.list ? ctx.fns.mapspec.list(ctx) : [];
    const sidebar = renderSidebar(resources, opts.current);
    const title = opts.title ? `${opts.title} · fhir2omop` : "fhir2omop";
    return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>${esc(title)}</title>
<script src="https://cdn.tailwindcss.com?plugins=typography"></script>
<style>
  body { font-family: ui-sans-serif, system-ui, -apple-system, sans-serif; }
  .shiki { background: transparent !important; }
  .prose pre.shiki { padding: .6em .8em; border-radius: 6px; overflow-x: auto; margin: .4em 0; font-size: 12.5px; line-height: 1.45; background: #f6f8fa !important; }
  .prose code:not(.shiki code) { background: #f6f8fa; padding: 1px 4px; border-radius: 3px; font-size: 90%; }
  .prose table { font-size: 13px; }
  .prose th, .prose td { padding: 4px 8px; border: 1px solid #e5e7eb; }
  .prose th { background: #f9fafb; }
</style>
${opts.headExtra ?? ""}
</head>
<body class="bg-white text-gray-900 text-sm h-screen">
<div class="flex h-screen">
  ${sidebar}
  <main class="flex-1 overflow-auto p-8">
    <div class="prose max-w-4xl">${opts.main}</div>
  </main>
</div>
</body>
</html>`;
}

function renderSidebar(
    resources: Array<{ resource: string; tables: string[] }>,
    current: string | undefined,
) {
    const items = resources
        .map((r) => {
            const isCur = current === r.resource;
            const tableLinks = r.tables
                .map((t) => {
                    const isCurTable = current === `${r.resource}/${t}`;
                    return `<li><a href="/mapspec/${enc(r.resource)}/${enc(t)}" class="block pl-6 pr-3 py-1 text-xs hover:bg-gray-100 ${isCurTable ? "bg-gray-200 font-medium" : "text-gray-600"}">${esc(t)}</a></li>`;
                })
                .join("");
            return `<li>
  <a href="/mapspec/${enc(r.resource)}" class="block px-3 py-1.5 hover:bg-gray-100 ${isCur ? "bg-gray-200 font-semibold" : "font-medium"}">${esc(r.resource)}</a>
  <ul>${tableLinks}</ul>
</li>`;
        })
        .join("");
    return `<aside class="w-64 shrink-0 border-r border-gray-200 flex flex-col bg-gray-50 overflow-y-auto">
  <a href="/" class="block px-4 py-3 border-b border-gray-200 font-semibold text-gray-900 hover:bg-gray-100">fhir2omop</a>
  <ul class="py-1">${items}</ul>
</aside>`;
}

function esc(s: string) {
    return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

function enc(s: string) {
    return encodeURIComponent(s);
}
