export default async function (
    ctx: Context,
    opts: { id: string },
): Promise<types.profiles.Profile | types.profiles.ValueSet | types.profiles.ViewDefinition | undefined> {
    const { profiles, valuesets, views } = await ctx.fns.profiles.load(ctx);
    return profiles.find((p) => p.id === opts.id)
        ?? valuesets.find((v) => v.id === opts.id)
        ?? views.find((v) => v.id === opts.id);
}
