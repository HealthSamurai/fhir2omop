// GET /diff/:resource/:table — htmx fragment endpoint.
// Returns ONLY the diff card HTML for one edge, without page chrome.
// Used by the lazy <div hx-get="…"> placeholder in the edge page.

export default async function (ctx: Context, _session: any, req: Request) {
    const { resource, table } = (req as any).params as { resource: string; table: string };
    if (!resource || !table) return new Response("missing", { status: 400 });

    const html = await ctx.fns.mapspec.renderDiffCard(ctx, {
        omop_table: table,
    });
    return new Response(html ?? "", {
        headers: { "content-type": "text/html; charset=utf-8" },
    });
}
