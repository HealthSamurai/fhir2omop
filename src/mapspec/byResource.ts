// Group edges by FHIR resource name.
//   ctx.fns.mapspec.byResource(ctx, { edges }) → Map<string, Edge[]>
export default function (_ctx: Context, opts: { edges: any[] }): Map<string, any[]> {
    const m = new Map<string, any[]>();
    for (const e of opts.edges) {
        const arr = m.get(e.fhir_resource) ?? [];
        arr.push(e);
        m.set(e.fhir_resource, arr);
    }
    return m;
}
