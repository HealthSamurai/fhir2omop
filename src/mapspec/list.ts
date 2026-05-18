// Legacy sidebar API — returns [{ resource, tables: string[] }, ...].
// Sidebar in $layout uses ctx.fns.mapspec.loadEdges/byResource directly now;
// this remains for any old callers expecting the simplified shape.
//
// (Refactored 2026-05 — moved Edge loading into src/mapspec/loadEdges.ts
//  to fix transitive-import staleness during REPL hot-reload.)
export default function (ctx: Context): Array<{ resource: string; tables: string[] }> {
    const edges = ctx.fns.mapspec.loadEdges(ctx);
    const byRes = new Map<string, string[]>();
    for (const e of edges) {
        const arr = byRes.get(e.fhir_resource) ?? [];
        arr.push(e.omop_table);
        byRes.set(e.fhir_resource, arr);
    }
    return [...byRes.entries()]
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([resource, tables]) => ({ resource, tables: tables.sort() }));
}
