// GET /cases — index of FHIR→OMOP golden test cases.
export default async function (ctx: Context, _session: any, _req: Request) {
    const cases = await ctx.fns.cases.load(ctx);
    const main = ctx.fns.cases.renderList(ctx, { cases });
    return { title: "Test cases", current: "cases", main };
}
