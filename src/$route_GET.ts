// No cross-imports between project files (CLAUDE.md). Edge data goes
// through ctx.fns.mapspec.* — late-bound, REPL-reloadable.

export default async function (ctx: Context, _session: any, _req: Request) {
    const edges  = ctx.fns.mapspec.loadEdges(ctx);
    const resMap = ctx.fns.mapspec.byResource(ctx, { edges });
    const tblMap = ctx.fns.mapspec.byTable(ctx, { edges });

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

    const resourcesAlpha = [...resMap.keys()].sort();
    const tablesAlpha = [...tblMap.keys()].sort();

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

    const { resources, tables } = barycenterOrder(resourcesAlpha, tablesAlpha, connections);

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
  <div class="bg-white border border-gray-200 rounded-lg p-4 mb-8">
    <div class="flex items-baseline justify-between mb-2">
      <h2 class="text-sm font-semibold text-gray-700">Resource → Table Mapping Graph</h2>
      <span class="text-[11px] text-gray-400">click a node to highlight links · double-click to open · click empty space to reset</span>
    </div>
    ${renderD3Graph(resources, tables, connections)}
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

function barycenterOrder(
    resources: string[],
    tables: string[],
    conns: Array<{ resource: string; table: string }>,
): { resources: string[]; tables: string[] } {
    const rAdj = new Map<string, string[]>();
    const tAdj = new Map<string, string[]>();
    for (const c of conns) {
        if (!rAdj.has(c.resource)) rAdj.set(c.resource, []);
        rAdj.get(c.resource)!.push(c.table);
        if (!tAdj.has(c.table)) tAdj.set(c.table, []);
        tAdj.get(c.table)!.push(c.resource);
    }
    const bary = (node: string, adj: Map<string, string[]>, pos: Map<string, number>): number => {
        const nbrs = adj.get(node) ?? [];
        if (!nbrs.length) return Number.POSITIVE_INFINITY;
        let s = 0, n = 0;
        for (const v of nbrs) {
            const p = pos.get(v);
            if (p !== undefined) { s += p; n++; }
        }
        return n ? s / n : Number.POSITIVE_INFINITY;
    };
    const eq = (a: string[], b: string[]) => a.length === b.length && a.every((x, i) => x === b[i]);

    let r = [...resources];
    let t = [...tables];
    for (let iter = 0; iter < 32; iter++) {
        const tPos = new Map(t.map((x, i) => [x, i] as [string, number]));
        const newR = [...r].sort((a, b) => {
            const ba = bary(a, rAdj, tPos);
            const bb = bary(b, rAdj, tPos);
            return ba - bb || a.localeCompare(b);
        });
        const rPos = new Map(newR.map((x, i) => [x, i] as [string, number]));
        const newT = [...t].sort((a, b) => {
            const ba = bary(a, tAdj, rPos);
            const bb = bary(b, tAdj, rPos);
            return ba - bb || a.localeCompare(b);
        });
        if (eq(newR, r) && eq(newT, t)) { r = newR; t = newT; break; }
        r = newR; t = newT;
    }
    return { resources: r, tables: t };
}

function esc(s: string) {
    return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}
function enc(s: string) {
    return encodeURIComponent(s);
}

function renderD3Graph(
    resources: string[],
    tables: string[],
    connections: Array<{ resource: string; table: string; status: string; primary: boolean }>,
): string {
    const payload = JSON.stringify({ resources, tables, connections });
    return `
<div id="d3-graph-wrap" class="relative">
  <script type="application/json" id="d3-graph-data">${payload.replace(/</g, "\\u003c")}</script>
  <svg id="d3-graph" class="block w-full" style="font-family: ui-sans-serif, system-ui, sans-serif;"></svg>
</div>
<script>
(function () {
  function load(cb) {
    if (window.d3) return cb();
    var existing = document.querySelector('script[data-d3]');
    if (existing) { existing.addEventListener('load', cb); return; }
    var s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/d3@7/dist/d3.min.js';
    s.setAttribute('data-d3', '1');
    s.onload = cb;
    document.head.appendChild(s);
  }
  function render() {
    var dataEl = document.getElementById('d3-graph-data');
    var svgEl = document.getElementById('d3-graph');
    if (!dataEl || !svgEl || svgEl.dataset.rendered) return;
    svgEl.dataset.rendered = '1';
    var data = JSON.parse(dataEl.textContent);

    var rowH = 22;
    var pad = 24;
    var leftW = 200;
    var rightW = 200;
    var gap = 360;
    var svgW = leftW + gap + rightW;
    var resCount = data.resources.length;
    var tblCount = data.tables.length;
    var contentH = Math.max(resCount, tblCount) * rowH + pad * 2;
    var svgH = contentH;

    var svg = d3.select(svgEl)
      .attr('viewBox', '0 0 ' + svgW + ' ' + svgH)
      .attr('preserveAspectRatio', 'xMidYMin meet');

    svg.selectAll('*').remove();

    var defs = svg.append('defs');
    defs.append('style').text(\`
      .link { fill: none; stroke-width: 1.1; opacity: 0.28; pointer-events: stroke; transition: opacity .15s, stroke-width .15s; }
      .link.primary { stroke-width: 1.8; opacity: 0.5; }
      .link.implemented { stroke: #22c55e; }
      .link.documented { stroke: #eab308; }
      .link.planned, .link.stub { stroke: #9ca3af; }
      .link.hl { opacity: 0.95; stroke-width: 2.6; }
      .link.dim { opacity: 0.05; }
      .node { cursor: pointer; }
      .node rect { transition: stroke .15s, stroke-width .15s, fill .15s, opacity .15s; }
      .node text { pointer-events: none; transition: opacity .15s; user-select: none; }
      .node-resource rect { fill: #eff6ff; stroke: #bfdbfe; }
      .node-resource text { fill: #1e40af; font-weight: 500; }
      .node-table rect { fill: #f0fdf4; stroke: #bbf7d0; }
      .node-table text { fill: #166534; font-weight: 500; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
      .node.sel rect { stroke: #2563eb; stroke-width: 2; fill: #dbeafe; }
      .node.hl rect { stroke: #2563eb; stroke-width: 1.5; }
      .node.dim rect { opacity: 0.25; }
      .node.dim text { opacity: 0.35; }
      .col-label { fill: #6b7280; font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; }
    \`);

    svg.append('text').attr('class', 'col-label').attr('x', leftW / 2).attr('y', 12).attr('text-anchor', 'middle').text('FHIR Resources');
    svg.append('text').attr('class', 'col-label').attr('x', leftW + gap + rightW / 2).attr('y', 12).attr('text-anchor', 'middle').text('OMOP Tables');

    // background click clears
    svg.append('rect')
      .attr('x', 0).attr('y', 0).attr('width', svgW).attr('height', svgH)
      .attr('fill', 'transparent')
      .on('click', function () { clearSelection(); });

    var resY = function (i) { return pad + i * rowH + rowH / 2; };
    var tblY = function (i) { return pad + i * rowH + rowH / 2; };

    var resIdx = new Map();
    data.resources.forEach(function (r, i) { resIdx.set(r, i); });
    var tblIdx = new Map();
    data.tables.forEach(function (t, i) { tblIdx.set(t, i); });

    // Build links
    var links = data.connections
      .filter(function (c) { return resIdx.has(c.resource) && tblIdx.has(c.table); })
      .map(function (c) {
        var x1 = leftW - 4;
        var y1 = resY(resIdx.get(c.resource));
        var x2 = leftW + gap + 4;
        var y2 = tblY(tblIdx.get(c.table));
        var cx1 = x1 + (x2 - x1) * 0.5;
        var cx2 = x2 - (x2 - x1) * 0.5;
        var d = 'M' + x1 + ',' + y1 + ' C' + cx1 + ',' + y1 + ' ' + cx2 + ',' + y2 + ' ' + x2 + ',' + y2;
        return Object.assign({}, c, { d: d });
      });

    var linksG = svg.append('g').attr('class', 'links');
    var linkSel = linksG.selectAll('path')
      .data(links)
      .enter().append('path')
      .attr('d', function (l) { return l.d; })
      .attr('class', function (l) {
        return 'link ' + l.status + (l.primary ? ' primary' : '');
      })
      .attr('data-r', function (l) { return l.resource; })
      .attr('data-t', function (l) { return l.table; });

    // Resource nodes
    var resG = svg.append('g').attr('class', 'resources');
    var resSel = resG.selectAll('g')
      .data(data.resources)
      .enter().append('g')
      .attr('class', 'node node-resource')
      .attr('data-id', function (d) { return d; })
      .attr('data-href', function (d) { return '/mapspec/' + encodeURIComponent(d); })
      .attr('transform', function (d, i) { return 'translate(0,' + (resY(i) - rowH / 2 + 2) + ')'; });
    resSel.append('rect').attr('x', 8).attr('y', 0).attr('width', leftW - 16).attr('height', rowH - 4).attr('rx', 3);
    resSel.append('text').attr('x', leftW / 2).attr('y', (rowH - 4) / 2 + 4).attr('text-anchor', 'middle').attr('font-size', 11).text(function (d) { return d; });

    // Table nodes
    var tblG = svg.append('g').attr('class', 'tables');
    var tblSel = tblG.selectAll('g')
      .data(data.tables)
      .enter().append('g')
      .attr('class', 'node node-table')
      .attr('data-id', function (d) { return d; })
      .attr('data-href', function (d) { return '/table/' + encodeURIComponent(d); })
      .attr('transform', function (d, i) { return 'translate(0,' + (tblY(i) - rowH / 2 + 2) + ')'; });
    tblSel.append('rect').attr('x', leftW + gap + 8).attr('y', 0).attr('width', rightW - 16).attr('height', rowH - 4).attr('rx', 3);
    tblSel.append('text').attr('x', leftW + gap + rightW / 2).attr('y', (rowH - 4) / 2 + 4).attr('text-anchor', 'middle').attr('font-size', 11).text(function (d) { return d; });

    var selected = null; // {kind: 'r'|'t', id}

    function clearSelection() {
      selected = null;
      linkSel.classed('hl', false).classed('dim', false);
      resSel.classed('hl', false).classed('sel', false).classed('dim', false);
      tblSel.classed('hl', false).classed('sel', false).classed('dim', false);
    }

    function selectNode(kind, id) {
      if (selected && selected.kind === kind && selected.id === id) {
        clearSelection();
        return;
      }
      selected = { kind: kind, id: id };
      var keyAttr = kind === 'r' ? 'data-r' : 'data-t';
      var neighborAttr = kind === 'r' ? 'data-t' : 'data-r';
      var neighbors = new Set();
      var touchedLinks = new Set();
      linkSel.each(function (l, i) {
        var match = (kind === 'r' ? l.resource === id : l.table === id);
        if (match) {
          touchedLinks.add(i);
          neighbors.add(kind === 'r' ? l.table : l.resource);
        }
      });
      linkSel
        .classed('hl', function (l, i) { return touchedLinks.has(i); })
        .classed('dim', function (l, i) { return !touchedLinks.has(i); });
      var nodeSelf = kind === 'r' ? resSel : tblSel;
      var nodeOther = kind === 'r' ? tblSel : resSel;
      nodeSelf
        .classed('sel', function (d) { return d === id; })
        .classed('hl', false)
        .classed('dim', function (d) { return d !== id; });
      nodeOther
        .classed('sel', false)
        .classed('hl', function (d) { return neighbors.has(d); })
        .classed('dim', function (d) { return !neighbors.has(d); });
    }

    resSel.on('click', function (event, d) { event.stopPropagation(); selectNode('r', d); })
      .on('dblclick', function (event, d) { event.stopPropagation(); window.location.href = '/mapspec/' + encodeURIComponent(d); });
    tblSel.on('click', function (event, d) { event.stopPropagation(); selectNode('t', d); })
      .on('dblclick', function (event, d) { event.stopPropagation(); window.location.href = '/table/' + encodeURIComponent(d); });
    linkSel.on('click', function (event, l) {
      event.stopPropagation();
      window.location.href = '/mapspec/' + encodeURIComponent(l.resource) + '/' + encodeURIComponent(l.table);
    });
  }

  load(render);
})();
</script>`;
}

function _unused_renderGraph(
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
