import { resolve } from "node:path";
import { loadEdges, byResource, byTable, type Edge } from "./list";

export default async function (
    ctx: Context,
    opts: { resource?: string; table?: string; table_only?: string },
): Promise<{ html: string; title: string } | null> {
    // Table-only mode: list of FHIR sources for an OMOP table
    if (opts.table_only) {
        const safeTable = sanitize(opts.table_only);
        if (!safeTable) return null;
        const edges = loadEdges();
        const byT = byTable(edges);
        const sources = byT.get(safeTable) ?? [];
        if (sources.length === 0) return null;
        return {
            html: renderTablePage(safeTable, sources),
            title: safeTable,
        };
    }

    const safeRes = sanitize(opts.resource);
    if (!safeRes) return null;

    // Resource + table: edge detail page
    if (opts.table) {
        const safeTable = sanitize(opts.table);
        if (!safeTable) return null;

        const edge = loadEdges().find(
            (e) => e.fhir_resource === safeRes && e.omop_table === safeTable,
        );
        if (edge) {
            return {
                html: renderEdge(edge),
                title: `${safeRes} → ${safeTable}`,
            };
        }

        // Fall back to legacy markdown
        const mdPath = resolve(import.meta.dir, "..", "..", "mapspec", safeRes, `${safeTable}.md`);
        const f = Bun.file(mdPath);
        if (await f.exists()) {
            const source = await f.text();
            const html = await ctx.fns.markdown.render(ctx, { source });
            return { html, title: `${safeRes} → ${safeTable}` };
        }
        return null;
    }

    // Resource index: destinations panel + narrative markdown
    const edges = loadEdges();
    const byR = byResource(edges);
    const dests = byR.get(safeRes) ?? [];
    const destsHtml = dests.length ? renderResourceDestinations(safeRes, dests) : "";

    const resourceMdPath = resolve(import.meta.dir, "..", "..", "mapspec", "resources", `${safeRes}.md`);
    const rf = Bun.file(resourceMdPath);
    if (await rf.exists()) {
        const source = await rf.text();
        const md = await ctx.fns.markdown.render(ctx, { source });
        return { html: destsHtml + md, title: safeRes };
    }

    const legacyPath = resolve(import.meta.dir, "..", "..", "mapspec", safeRes, "index.md");
    const lf = Bun.file(legacyPath);
    if (await lf.exists()) {
        const source = await lf.text();
        const md = await ctx.fns.markdown.render(ctx, { source });
        return { html: destsHtml + md, title: safeRes };
    }

    if (destsHtml) return { html: destsHtml, title: safeRes };
    return null;
}

function sanitize(s: string | undefined): string {
    if (!s) return "";
    return s.replace(/[^A-Za-z0-9_-]/g, "");
}

function esc(s: string) {
    return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

function enc(s: string) {
    return encodeURIComponent(s);
}

function renderReference(r: {
    project: string;
    kind?: string;
    path?: string;
    lines?: [number, number];
    notes?: string;
}): string {
    const kindBadge = r.kind ? `<span class="text-[10px] text-gray-400 ml-1">(${esc(r.kind)})</span>` : "";
    let pathLink = "";
    if (r.path) {
        const linesStr = r.lines ? `:${r.lines[0]}-${r.lines[1]}` : "";
        const q = new URLSearchParams({ path: r.path });
        if (r.lines) {
            q.set("from", String(r.lines[0]));
            q.set("to", String(r.lines[1]));
        }
        pathLink = ` <a href="/source?${q.toString()}" class="font-mono text-[10px] text-blue-600 hover:underline">${esc(r.path)}${linesStr}</a>`;
    }
    const note = r.notes ? ` <span class="text-gray-500">— ${esc(r.notes)}</span>` : "";
    return `<strong class="text-gray-800">${esc(r.project)}</strong>${kindBadge}${pathLink}${note}`;
}

const STATUS_DOT: Record<string, string> = {
    implemented: "bg-green-400",
    documented: "bg-yellow-400",
    stub: "bg-gray-300",
    planned: "bg-blue-300",
};

const STATUS_PILL: Record<string, string> = {
    implemented: "bg-green-100 text-green-800",
    documented: "bg-yellow-100 text-yellow-800",
    stub: "bg-gray-100 text-gray-600",
    planned: "bg-blue-100 text-blue-800",
};

function renderResourceDestinations(resource: string, edges: Edge[]): string {
    const rows = edges
        .slice()
        .sort((a, b) => (Number(b.primary ?? false) - Number(a.primary ?? false)) || a.omop_table.localeCompare(b.omop_table))
        .map((e) => {
            const dot = STATUS_DOT[e.status] ?? "bg-gray-300";
            const pill = STATUS_PILL[e.status] ?? "bg-gray-100 text-gray-600";
            const primary = e.primary
                ? `<span class="ml-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-100 text-purple-800">primary</span>`
                : "";
            const fields = e.fields?.length ?? 0;
            const narr = e.narrative_md
                ? `<div class="text-xs text-gray-500 mt-0.5">${esc(e.narrative_md)}</div>`
                : "";
            return `<tr class="border-b border-gray-100 hover:bg-gray-50">
  <td class="px-2 py-1.5 whitespace-nowrap">
    <span class="inline-block w-1.5 h-1.5 rounded-full ${dot} mr-1 align-middle"></span>
    <a href="/table/${enc(e.omop_table)}" class="font-mono text-sm text-blue-700 hover:underline">${esc(e.omop_table)}</a>
    ${primary}
    ${narr}
  </td>
  <td class="px-2 py-1.5 text-xs"><span class="px-1.5 py-0.5 rounded ${pill}">${esc(e.status)}</span></td>
  <td class="px-2 py-1.5 text-xs text-gray-500">${fields} field${fields === 1 ? "" : "s"}</td>
  <td class="px-2 py-1.5 text-xs"><a href="/mapspec/${enc(resource)}/${enc(e.omop_table)}" class="text-blue-600 hover:underline">detail →</a></td>
</tr>`;
        })
        .join("");

    return `<div class="not-prose mb-6">
  <div class="flex items-baseline gap-2 mb-3">
    <h1 class="text-2xl font-bold text-gray-900">${esc(resource)}</h1>
    <span class="text-gray-400 text-sm">— maps to ${edges.length} OMOP table${edges.length === 1 ? "" : "s"}</span>
  </div>
  <div class="overflow-x-auto border border-gray-200 rounded-lg">
    <table class="w-full">
      <thead><tr class="bg-gray-50 border-b border-gray-200">
        <th class="text-left px-2 py-1.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">OMOP Table</th>
        <th class="text-left px-2 py-1.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Status</th>
        <th class="text-left px-2 py-1.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Mapped</th>
        <th class="text-left px-2 py-1.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider"></th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </div>
</div>`;
}

function renderTablePage(table: string, sources: Edge[]): string {
    const rows = sources
        .slice()
        .sort((a, b) => (Number(b.primary ?? false) - Number(a.primary ?? false)) || a.fhir_resource.localeCompare(b.fhir_resource))
        .map((e) => {
            const dot = STATUS_DOT[e.status] ?? "bg-gray-300";
            const pill = STATUS_PILL[e.status] ?? "bg-gray-100 text-gray-600";
            const primary = e.primary
                ? `<span class="ml-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-100 text-purple-800">primary</span>`
                : "";
            const cond = e.condition
                ? `<div class="text-[11px] text-amber-700 mt-0.5"><strong>when:</strong> ${esc(e.condition)}</div>`
                : "";
            const narr = e.narrative_md
                ? `<div class="text-xs text-gray-500 mt-0.5">${esc(e.narrative_md)}</div>`
                : "";
            const fields = e.fields?.length ?? 0;
            return `<tr class="border-b border-gray-100 hover:bg-gray-50">
  <td class="px-2 py-1.5 whitespace-nowrap">
    <span class="inline-block w-1.5 h-1.5 rounded-full ${dot} mr-1 align-middle"></span>
    <a href="/mapspec/${enc(e.fhir_resource)}" class="font-medium text-sm text-blue-700 hover:underline">${esc(e.fhir_resource)}</a>
    ${primary}
    ${cond}
    ${narr}
  </td>
  <td class="px-2 py-1.5 text-xs"><span class="px-1.5 py-0.5 rounded ${pill}">${esc(e.status)}</span></td>
  <td class="px-2 py-1.5 text-xs text-gray-500">${fields} field${fields === 1 ? "" : "s"}</td>
  <td class="px-2 py-1.5 text-xs"><a href="/mapspec/${enc(e.fhir_resource)}/${enc(table)}" class="text-blue-600 hover:underline">detail →</a></td>
</tr>`;
        })
        .join("");

    return `<div class="not-prose">
  <div class="flex items-baseline gap-2 mb-3">
    <h1 class="text-2xl font-bold text-gray-900 font-mono">${esc(table)}</h1>
    <span class="text-gray-400 text-sm">— sourced from ${sources.length} FHIR resource${sources.length === 1 ? "" : "s"}</span>
  </div>
  <div class="overflow-x-auto border border-gray-200 rounded-lg">
    <table class="w-full">
      <thead><tr class="bg-gray-50 border-b border-gray-200">
        <th class="text-left px-2 py-1.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">FHIR Resource</th>
        <th class="text-left px-2 py-1.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Status</th>
        <th class="text-left px-2 py-1.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Mapped</th>
        <th class="text-left px-2 py-1.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider"></th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </div>
</div>`;
}

function renderEdge(edge: Edge): string {
    const parts: string[] = [];

    // Header
    parts.push(`<div class="not-prose">`);
    parts.push(`<div class="flex items-center gap-3 mb-4">`);
    parts.push(`<span class="text-2xl font-bold">${esc(edge.fhir_resource)}</span>`);
    parts.push(`<span class="text-gray-400 text-2xl">→</span>`);
    parts.push(`<span class="text-2xl font-bold text-blue-700">${esc(edge.omop_table)}</span>`);
    const statusColors: Record<string, string> = {
        implemented: "bg-green-100 text-green-800",
        documented: "bg-yellow-100 text-yellow-800",
        stub: "bg-gray-100 text-gray-600",
        planned: "bg-blue-100 text-blue-800",
    };
    const sc = statusColors[edge.status] ?? "bg-gray-100 text-gray-600";
    parts.push(`<span class="ml-2 px-2 py-0.5 rounded text-xs font-medium ${sc}">${esc(edge.status)}</span>`);
    if (edge.primary) parts.push(`<span class="px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">primary</span>`);
    parts.push(`</div>`);

    // Narrative
    if (edge.narrative_md) {
        parts.push(`<p class="text-gray-600 mb-4 text-sm">${esc(edge.narrative_md)}</p>`);
    }

    // Condition
    if (edge.condition) {
        parts.push(`<div class="mb-4 px-3 py-2 bg-amber-50 border border-amber-200 rounded text-xs"><strong>Condition:</strong> ${esc(edge.condition)}</div>`);
    }

    // Implementation
    if (edge.implementation_in_project) {
        parts.push(`<div class="mb-4 px-3 py-2 bg-gray-50 border border-gray-200 rounded text-xs"><strong>Implementation:</strong> <code>${esc(edge.implementation_in_project)}</code></div>`);
    }

    // Fields list (one card per field)
    parts.push(`<h3 class="text-sm font-semibold mt-6 mb-2 text-gray-700">Fields <span class="text-gray-400 font-normal">(${edge.fields.length})</span></h3>`);
    parts.push(`<ul class="space-y-2">`);
    for (const f of edge.fields) {
        const badges: string[] = [];
        if (f.pk) badges.push(`<span class="px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-800 text-[10px] font-medium">PK</span>`);
        if (f.fk) badges.push(`<span class="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 text-[10px] font-medium">FK→${esc(f.fk)}</span>`);
        if (f.required) badges.push(`<span class="px-1.5 py-0.5 rounded bg-green-50 text-green-700 text-[10px] font-medium">required</span>`);
        if (f.concept_map) badges.push(`<span class="px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 text-[10px] font-medium">map:${esc(f.concept_map)}</span>`);
        if (f.constant !== undefined) badges.push(`<span class="px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 text-[10px] font-medium">=${esc(String(f.constant))}</span>`);

        const fhirPathHtml = f.fhir_path
            ? `<code class="font-mono text-gray-600">${esc(f.fhir_path)}</code>`
            : (f.constant !== undefined ? `<span class="text-gray-400 italic">constant</span>` : `<span class="text-gray-400">—</span>`);

        parts.push(`<li class="border border-gray-200 rounded-lg p-3 bg-white hover:bg-gray-50">`);

        // Header: OMOP column ← FHIR path + type + badges
        parts.push(`<div class="flex items-baseline gap-2 flex-wrap mb-1">`);
        parts.push(`<code class="font-mono font-semibold text-gray-900 text-sm">${esc(f.omop_column)}</code>`);
        parts.push(`<span class="text-gray-300 text-xs">←</span>`);
        parts.push(`<span class="text-xs">${fhirPathHtml}</span>`);
        parts.push(`<span class="text-[10px] text-gray-400 ml-auto">${esc(f.omop_type)}${f.fhir_type ? ` <span class="text-gray-300">·</span> ${esc(f.fhir_type)}` : ""}</span>`);
        parts.push(`</div>`);

        if (badges.length) {
            parts.push(`<div class="mb-1.5 flex flex-wrap gap-1">${badges.join("")}</div>`);
        }
        if (f.transform) {
            parts.push(`<div class="mb-1 text-xs"><span class="text-gray-400 mr-1">transform:</span><code class="text-[11px] bg-gray-50 px-1.5 py-0.5 rounded">${esc(f.transform)}</code></div>`);
        }
        if (f.notes) {
            parts.push(`<div class="text-xs text-gray-700 mb-1">${esc(f.notes)}</div>`);
        }

        if (f.sources?.length) {
            parts.push(`<details class="mt-2"><summary class="text-[11px] text-blue-700 cursor-pointer hover:underline select-none">${f.sources.length} source${f.sources.length === 1 ? "" : "s"} ▾</summary>`);
            parts.push(`<ul class="mt-1.5 pl-3 border-l-2 border-gray-200 space-y-2">`);
            for (const s of f.sources) {
                parts.push(`<li>`);
                parts.push(`<div class="text-xs text-gray-800 font-medium">${esc(s.comment)}</div>`);
                parts.push(`<ul class="pl-3 mt-0.5 space-y-0.5">`);
                for (const r of s.references) {
                    parts.push(`<li class="text-[11px]">${renderReference(r)}</li>`);
                }
                parts.push(`</ul>`);
                parts.push(`</li>`);
            }
            parts.push(`</ul></details>`);
        }
        parts.push(`</li>`);
    }
    parts.push(`</ul>`);

    // Vocabularies
    if (edge.vocabularies?.length) {
        parts.push(`<h3 class="text-sm font-semibold mt-6 mb-2 text-gray-700">Vocabularies</h3>`);
        for (const vocab of edge.vocabularies) {
            parts.push(`<div class="mb-4">`);
            parts.push(`<h4 class="text-xs font-semibold text-gray-600 mb-1">${esc(vocab.name)}</h4>`);
            parts.push(`<table class="w-full text-xs border border-gray-200"><thead><tr class="bg-gray-50">`);
            parts.push(`<th class="text-left px-2 py-1 border-b">Source</th>`);
            parts.push(`<th class="text-left px-2 py-1 border-b">Display</th>`);
            parts.push(`<th class="text-left px-2 py-1 border-b">Concept ID</th>`);
            parts.push(`<th class="text-left px-2 py-1 border-b">Concept Name</th>`);
            parts.push(`</tr></thead><tbody>`);
            for (const entry of vocab.entries) {
                parts.push(`<tr class="border-b border-gray-100">`);
                parts.push(`<td class="px-2 py-1 font-mono">${esc(entry.source_code)}</td>`);
                parts.push(`<td class="px-2 py-1">${esc(entry.source_display ?? "")}</td>`);
                parts.push(`<td class="px-2 py-1 font-mono">${entry.target_concept_id ?? "-"}</td>`);
                parts.push(`<td class="px-2 py-1">${esc(entry.target_concept_name ?? "")}</td>`);
                parts.push(`</tr>`);
            }
            parts.push(`</tbody></table></div>`);
        }
    }

    // Edge cases
    if (edge.edge_cases?.length) {
        parts.push(`<h3 class="text-sm font-semibold mt-6 mb-2 text-gray-700">Edge Cases</h3>`);
        parts.push(`<div class="space-y-2">`);
        for (const ec of edge.edge_cases) {
            parts.push(`<div class="px-3 py-2 bg-gray-50 border border-gray-200 rounded text-xs">`);
            parts.push(`<div class="font-medium text-gray-800">${esc(ec.case)}</div>`);
            parts.push(`<div class="text-gray-600 mt-0.5">${esc(ec.handling)}</div>`);
            parts.push(`</div>`);
        }
        parts.push(`</div>`);
    }

    // References (edge-level)
    if (edge.references?.length) {
        parts.push(`<h3 class="text-sm font-semibold mt-6 mb-2 text-gray-700">Reference Implementations</h3>`);
        parts.push(`<ul class="text-xs space-y-1">`);
        for (const ref of edge.references) {
            parts.push(`<li>${renderReference(ref)}</li>`);
        }
        parts.push(`</ul>`);
    }

    parts.push(`</div>`);
    return parts.join("\n");
}
