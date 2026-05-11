export default async function (
    ctx: Context,
    opts: { url: string },
): Promise<types.profiles.ValueSet | undefined> {
    const { valuesets } = await ctx.fns.profiles.load(ctx);
    return valuesets.find((v) => v.url === opts.url);
}
