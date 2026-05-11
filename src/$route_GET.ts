import { loadEdges, byResource, byTable, type Edge } from "./mapspec/list";

export default async function (ctx: Context, _session: any, _req: Request) {
    const edges = loadEdges();
    const resMap = byResource(edges);
    const tblMap = byTable(edges);

    // Also merge legacy resources
    const legacyList = ctx.fns.mapspec.list(ctx);
    for (const item of legacyList) {
        if (!resMap.has(item.resource)) {
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

    const resources = [...resMap.keys()].sort();
    const tables = [...tblMap.keys()].sort();

    // Build a connection set for the SVG
    const connections: Array<{ resource: string; table: string; status: string; primary: boolean }> = [];
    for (const edge of edges) {
        connections.push({
            resource: edge.fhir_resource,
            table: edge.omop_table,
            status: edge.status,
            primary: edge.primary ?? false,
        });
    }
    // Add legacy ones
    for (const item of legacyList) {
        for (const t of item.tables) {
            if (!connections.some((c) => c.resource === item.resource && c.table === t)) {
                connections.push({ resource: item.resource, table: t, status: "documented", primary: false });
            }
        }
    }

    // Stats
    const totalEdges = connections.length;
    const implemented = edges.filter((e) => e.status === "implemented").length;
    const documented = edges.filter((e) => e.status === "documented").length;
    const totalFields = edges.reduce((sum, e) => sum + e.fields.length, 0);

    const main = `
<div class="not-prose">
  <div class="mb-8">
    <h1 class="text-3xl font-bold text-gray-900 mb-2">FHIR R4 → OMOP CDM v5.4</h1>
    <p class="text-gray-500 text-sm">Mapping specification and implementation</p>
  </div>

  <!-- Stats -->
  <div class="grid grid-cols-4 gap-4 mb-8">
    <div class="bg-white border border-gray-200 rounded-lg p-4">
      <div class="text-2xl font-bold text-gray-900">${resources.length}</div>
      <div class="text-xs text-gray-500 mt-1">FHIR Resources</div>
    </div>
    <div class="bg-white border border-gray-200 rounded-lg p-4">
      <div class="text-2xl font-bold text-gray-900">${tables.length}</div>
      <div class="text-xs text-gray-500 mt-1">OMOP Tables</div>
    </div>
    <div class="bg-white border border-gray-200 rounded-lg p-4">
      <div class="text-2xl font-bold text-gray-900">${totalEdges}</div>
      <div class="text-xs text-gray-500 mt-1">Mapping Edges</div>
    </div>
    <div class="bg-white border border-gray-200 rounded-lg p-4">
      <div class="text-2xl font-bold text-green-700">${implemented}</div>
      <div class="text-xs text-gray-500 mt-1">Implemented</div>
    </div>
  </div>

  <!-- Graph -->
  <div class="bg-white border border-gray-200 rounded-lg p-6 mb-8">
    <h2 class="text-sm font-semibold text-gray-700 mb-4">Resource → Table Mapping Graph</h2>
    <div id="graph-container" class="overflow-x-auto">
      ${renderGraph(resources, tables, connections)}
    </div>
  </div>

  <!-- Matrix -->
  <div class="bg-white border border-gray-200 rounded-lg p-6">
    <h2 class="text-sm font-semibold text-gray-700 mb-4">Edge Matrix</h2>
    <div class="overflow-x-auto">
      ${renderMatrix(resources, tables, connections)}
    </div>
  </div>

  <!-- Legend -->
  <div class="mt-4 flex items-center gap-6 text-xs text-gray-500">
    <span class="flex items-center gap-1.5"><span class="inline-block w-3 h-3 rounded-full bg-green-400"></span> Implemented</span>
    <span class="flex items-center gap-1.5"><span class="inline-block w-3 h-3 rounded-full bg-yellow-400"></span> Documented</span>
    <span class="flex items-center gap-1.5"><span class="inline-block w-3 h-3 rounded-full bg-gray-300"></span> Stub/Planned</span>
    <span class="flex items-center gap-1.5"><span class="inline-block w-2 h-0.5 bg-blue-500"></span> Primary edge</span>
    <span class="flex items-center gap-1.5"><span class="inline-block w-2 h-0.5 bg-gray-300"></span> Secondary edge</span>
  </div>
</div>`;

    return { title: "Index", main };
}

function esc(s: string) {
    return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}
function enc(s: string) {
    return encodeURIComponent(s);
}

function renderGraph(
    resources: string[],
    tables: string[],
    connections: Array<{ resource: string; table: string; status: string; primary: boolean }>,
): string {
    const rowH = 28;
    const leftCol = 200;
    const rightCol = 620;
    const svgW = 840;
    const topPad = 20;

    const lH = Math.max(resources.length, 1) * rowH + topPad * 2;
    const rH = Math.max(tables.length, 1) * rowH + topPad * 2;
    const svgH = Math.max(lH, rH);

    const resY = (i: number) => topPad + i * rowH + rowH / 2;
    const tblY = (i: number) => topPad + i * rowH + rowH / 2;

    const lines: string[] = [];

    // Draw connections
    for (const conn of connections) {
        const ri = resources.indexOf(conn.resource);
        const ti = tables.indexOf(conn.table);
        if (ri < 0 || ti < 0) continue;
        const x1 = leftCol + 10;
        const y1 = resY(ri);
        const x2 = rightCol - 10;
        const y2 = tblY(ti);
        const color = conn.status === "implemented" ? "#22c55e" : conn.status === "documented" ? "#eab308" : "#d1d5db";
        const width = conn.primary ? 2 : 1;
        const opacity = conn.primary ? 0.7 : 0.35;
        const cx1 = leftCol + 150;
        const cx2 = rightCol - 150;
        lines.push(`<path d="M${x1},${y1} C${cx1},${y1} ${cx2},${y2} ${x2},${y2}" fill="none" stroke="${color}" stroke-width="${width}" opacity="${opacity}"/>`);
    }

    // Draw resource labels
    for (let i = 0; i < resources.length; i++) {
        const y = resY(i);
        lines.push(`<a href="/mapspec/${enc(resources[i])}">`);
        lines.push(`<rect x="10" y="${y - 10}" width="${leftCol - 20}" height="20" rx="4" fill="#eff6ff" stroke="#bfdbfe" stroke-width="1"/>`);
        lines.push(`<text x="${leftCol / 2}" y="${y + 4}" text-anchor="middle" class="text-xs font-medium" fill="#1e40af">${esc(resources[i])}</text>`);
        lines.push(`</a>`);
    }

    // Draw table labels
    for (let i = 0; i < tables.length; i++) {
        const y = tblY(i);
        lines.push(`<a href="/table/${enc(tables[i])}">`);
        lines.push(`<rect x="${rightCol}" y="${y - 10}" width="${svgW - rightCol - 10}" height="20" rx="4" fill="#f0fdf4" stroke="#bbf7d0" stroke-width="1"/>`);
        lines.push(`<text x="${rightCol + (svgW - rightCol - 10) / 2}" y="${y + 4}" text-anchor="middle" class="text-xs font-medium" fill="#166534">${esc(tables[i])}</text>`);
        lines.push(`</a>`);
    }

    return `<svg width="${svgW}" height="${svgH}" viewBox="0 0 ${svgW} ${svgH}" class="mx-auto" style="font-family: ui-sans-serif, system-ui, sans-serif; font-size: 11px;">
  <!-- Labels -->
  <text x="${leftCol / 2}" y="12" text-anchor="middle" fill="#6b7280" style="font-size:10px; font-weight:600; text-transform:uppercase; letter-spacing:0.05em;">FHIR Resources</text>
  <text x="${rightCol + (svgW - rightCol - 10) / 2}" y="12" text-anchor="middle" fill="#6b7280" style="font-size:10px; font-weight:600; text-transform:uppercase; letter-spacing:0.05em;">OMOP Tables</text>
  ${lines.join("\n  ")}
</svg>`;
}

function renderMatrix(
    resources: string[],
    tables: string[],
    connections: Array<{ resource: string; table: string; status: string; primary: boolean }>,
): string {
    const connMap = new Map<string, { status: string; primary: boolean }>();
    for (const c of connections) {
        connMap.set(`${c.resource}__${c.table}`, { status: c.status, primary: c.primary });
    }

    const headerCells = tables.map((t) =>
        `<th class="px-1 py-1 border-b border-r border-gray-200 text-[10px] font-medium text-gray-600 whitespace-nowrap" style="writing-mode: vertical-lr; transform: rotate(180deg); min-width: 24px;"><a href="/table/${enc(t)}" class="hover:underline text-blue-700">${esc(t)}</a></th>`
    ).join("");

    const rows = resources.map((res) => {
        const cells = tables.map((tbl) => {
            const conn = connMap.get(`${res}__${tbl}`);
            if (!conn) return `<td class="px-1 py-1 border-b border-r border-gray-100 text-center"></td>`;
            const color = conn.status === "implemented" ? "bg-green-400" : conn.status === "documented" ? "bg-yellow-400" : "bg-gray-300";
            const ring = conn.primary ? "ring-2 ring-blue-400 ring-offset-1" : "";
            return `<td class="px-1 py-1 border-b border-r border-gray-100 text-center">
  <a href="/mapspec/${enc(res)}/${enc(tbl)}" class="inline-block w-3.5 h-3.5 rounded ${color} ${ring} hover:scale-125 transition-transform" title="${esc(res)} → ${esc(tbl)} (${esc(conn.status)})"></a>
</td>`;
        }).join("");
        return `<tr><td class="px-2 py-1 border-b border-r border-gray-200 text-xs font-medium whitespace-nowrap"><a href="/mapspec/${enc(res)}" class="hover:underline text-blue-700">${esc(res)}</a></td>${cells}</tr>`;
    }).join("");

    return `<table class="border border-gray-200 text-xs">
  <thead><tr><th class="px-2 py-1 border-b border-r border-gray-200 text-left text-[10px] font-semibold text-gray-500"></th>${headerCells}</tr></thead>
  <tbody>${rows}</tbody>
</table>`;
}
