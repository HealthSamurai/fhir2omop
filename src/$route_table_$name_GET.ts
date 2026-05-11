export default async function (ctx: Context, _session: any, req: Request) {
    const params = (req as any).params as { name: string };
    const page = await ctx.fns.mapspec.render(ctx, { table_only: params.name });
    if (!page) return new Response("Not Found", { status: 404 });
    return { title: page.title, current: `table:${params.name}`, main: page.html };
}
