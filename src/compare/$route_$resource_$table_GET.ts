// GET /compare/:resource/:table — htmx fragment.
// Side-by-side cdm.<table> vs cdm_ours_fhir.<table> with cell-level
// diff highlighting.

export default async function (ctx: Context, _session: any, req: Request) {
    const { resource, table } = (req as any).params as { resource: string; table: string };
    if (!resource || !table) return new Response("missing", { status: 400 });

    const html = await ctx.fns.compare.renderSideBySide(ctx, { omop_table: table, limit: 20 });
    return new Response(html ?? "", {
        headers: { "content-type": "text/html; charset=utf-8" },
    });
}
