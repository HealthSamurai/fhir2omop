// GET /sample/:resource/:table — htmx fragment endpoint.
// Returns 50 rows from cdm_ours_fhir.<table> rendered as a card.

export default async function (ctx: Context, _session: any, req: Request) {
    const { resource, table } = (req as any).params as { resource: string; table: string };
    if (!resource || !table) return new Response("missing", { status: 400 });

    const html = await ctx.fns.sample.renderTable(ctx, { omop_table: table, limit: 50 });
    return new Response(html ?? "", {
        headers: { "content-type": "text/html; charset=utf-8" },
    });
}
