import { resolve } from "node:path";

export default async function (
    ctx: Context,
    opts: { resource: string; table?: string },
): Promise<{ html: string; title: string } | null> {
    const safeRes = sanitize(opts.resource);
    if (!safeRes) return null;
    const file = opts.table
        ? `${sanitize(opts.table)}.md`
        : "index.md";
    if (!file || file === ".md") return null;
    const path = resolve(import.meta.dir, "..", "..", "mapspec", safeRes, file);
    const f = Bun.file(path);
    if (!(await f.exists())) return null;
    const source = await f.text();
    const html = await ctx.fns.markdown.render(ctx, { source });
    const title = opts.table
        ? `${safeRes} → ${opts.table}`
        : safeRes;
    return { html, title };
}

function sanitize(s: string | undefined): string {
    if (!s) return "";
    return s.replace(/[^A-Za-z0-9_-]/g, "");
}
