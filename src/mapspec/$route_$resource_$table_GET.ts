export default async function (ctx: Context, _session: any, req: Request) {
    const params = (req as any).params as { resource: string; table: string };
    const page = await ctx.fns.mapspec.render(ctx, { resource: params.resource, table: params.table });
    if (!page) return new Response("Not Found", { status: 404 });
    return {
        title: page.title,
        current: `${params.resource}/${params.table}`,
        main: page.html,
    };
}
