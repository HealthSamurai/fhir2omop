export default async function () {
    const ctx = {
        env: { ...process.env },
        state: {},
        fns: {} as FnsRegistry,
        routes: {},
    } as Context;

    const { default: loadFns } = await import("./loadFns");
    await loadFns(ctx);
    await ctx.genTypes(ctx);
    await ctx.fns.http.loadRoutes(ctx);
    await ctx.fns.http.start(ctx);

    return ctx;
}

if (import.meta.main) {
    const main = (await import("./$main.ts")).default;
    const ctx = await main();
    (globalThis as any).ctx = ctx;
    console.log("\nctx keys:", Object.keys(ctx));
}
