export default async function (
    ctx: Context,
    opts: { resource: string; table: string },
): Promise<types.profiles.ViewDefinition | undefined> {
    const { views } = await ctx.fns.profiles.load(ctx);
    const key = `${opts.resource}__${opts.table}`;
    return views.find((v) => v.edgeKey === key);
}
