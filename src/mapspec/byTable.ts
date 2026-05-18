// Group edges by OMOP table name.
//   ctx.fns.mapspec.byTable(ctx, { edges }) → Map<string, Edge[]>
export default function (_ctx: Context, opts: { edges: any[] }): Map<string, any[]> {
    const m = new Map<string, any[]>();
    for (const e of opts.edges) {
        const arr = m.get(e.omop_table) ?? [];
        arr.push(e);
        m.set(e.omop_table, arr);
    }
    return m;
}
