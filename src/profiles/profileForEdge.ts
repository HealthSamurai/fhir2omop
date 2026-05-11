export default async function (
    ctx: Context,
    opts: { resource: string; table: string },
): Promise<types.profiles.Profile | undefined> {
    const { profiles } = await ctx.fns.profiles.load(ctx);
    const key = `${opts.resource}__${opts.table}`;
    return profiles.find((p) => p.edgeKey === key);
}
