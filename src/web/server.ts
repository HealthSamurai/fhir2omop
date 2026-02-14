import { readdir, stat } from "fs/promises";
import { join, dirname } from "path";

const ROOT = join(import.meta.dir, "../..");
const PORT = process.env.PORT || 4321;
const IGNORE = new Set(["node_modules", ".git", ".github", "fhir-core", "CommonDataModel", "refs"]);

function layout(title: string, body: string, breadcrumb?: string) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title} — fhir2omop</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.6; color: #1a1a1a; background: #fafafa; }
    .container { max-width: 960px; margin: 0 auto; padding: 2rem 1.5rem; }
    nav { background: #1a1a1a; color: #fff; padding: 0.75rem 1.5rem; }
    nav a { color: #8bb4ff; text-decoration: none; }
    nav a:hover { text-decoration: underline; }
    h1 { margin-bottom: 1.5rem; font-size: 1.75rem; }
    .listing { list-style: none; }
    .listing li { margin: 0.2rem 0; }
    .listing a { text-decoration: none; font-family: monospace; font-size: 0.95rem; }
    .listing a:hover { text-decoration: underline; }
    .listing .dir a { color: #b45309; }
    .listing .file a { color: #2563eb; }
    .listing .md a { color: #059669; }
    article { background: #fff; border: 1px solid #e5e5e5; border-radius: 8px; padding: 2rem; }
    article h1 { font-size: 1.75rem; border-bottom: 2px solid #e5e5e5; padding-bottom: 0.5rem; }
    article h2 { font-size: 1.4rem; margin-top: 2rem; margin-bottom: 0.75rem; }
    article h3 { font-size: 1.15rem; margin-top: 1.5rem; margin-bottom: 0.5rem; }
    article p { margin-bottom: 1rem; }
    article ul, article ol { margin-bottom: 1rem; padding-left: 1.5rem; }
    article li { margin-bottom: 0.25rem; }
    article code { background: #f0f0f0; padding: 0.15rem 0.4rem; border-radius: 3px; font-size: 0.9em; }
    article pre { background: #1a1a1a; color: #e5e5e5; padding: 1rem; border-radius: 6px; overflow-x: auto; margin-bottom: 1rem; }
    article pre code { background: none; padding: 0; color: inherit; }
    article table { border-collapse: collapse; width: 100%; margin-bottom: 1rem; font-size: 0.9rem; }
    article th, article td { border: 1px solid #ddd; padding: 0.5rem 0.75rem; text-align: left; }
    article th { background: #f5f5f5; font-weight: 600; }
    article tr:nth-child(even) { background: #fafafa; }
    article blockquote { border-left: 4px solid #ddd; padding-left: 1rem; color: #555; margin-bottom: 1rem; }
    article a { color: #2563eb; }
    article hr { border: none; border-top: 1px solid #e5e5e5; margin: 2rem 0; }
    article strong { font-weight: 600; }
    article img { max-width: 100%; }
  </style>
</head>
<body>
  <nav>${breadcrumb ?? '<a href="/">fhir2omop</a>'}</nav>
  <div class="container">${body}</div>
</body>
</html>`;
}

function makeBreadcrumb(path: string): string {
  const parts = path.split("/");
  let crumbs = '<a href="/">fhir2omop</a>';
  let href = "";
  for (let i = 0; i < parts.length; i++) {
    href += (i > 0 ? "/" : "") + parts[i];
    const isLast = i === parts.length - 1;
    if (isLast) {
      crumbs += ` / <span style="color:#ccc">${parts[i]}</span>`;
    } else {
      crumbs += ` / <a href="/${href}/">${parts[i]}</a>`;
    }
  }
  return crumbs;
}

async function handleDir(path: string): Promise<Response> {
  const full = path ? join(ROOT, path) : ROOT;
  const entries = await readdir(full, { withFileTypes: true });

  const dirs: string[] = [];
  const files: string[] = [];
  for (const e of entries) {
    if (e.name.startsWith(".") || IGNORE.has(e.name)) continue;
    if (e.isDirectory()) dirs.push(e.name);
    else files.push(e.name);
  }
  dirs.sort();
  files.sort();

  const title = path || "fhir2omop";
  let body = `<h1>${title || "fhir2omop"}/</h1><ul class="listing">`;

  if (path) {
    const parent = dirname(path);
    body += `<li class="dir"><a href="/${parent === "." ? "" : parent + "/"}">../</a></li>`;
  }

  for (const d of dirs) {
    const href = path ? `${path}/${d}` : d;
    body += `<li class="dir"><a href="/${href}/">${d}/</a></li>`;
  }
  for (const f of files) {
    const href = path ? `${path}/${f}` : f;
    const cls = f.endsWith(".md") ? "md" : "file";
    body += `<li class="${cls}"><a href="/${href}">${f}</a></li>`;
  }
  body += "</ul>";

  const breadcrumb = path ? makeBreadcrumb(path) : undefined;
  return new Response(layout(title, body, breadcrumb), { headers: { "content-type": "text/html; charset=utf-8" } });
}

async function handleMarkdown(path: string): Promise<Response> {
  const full = join(ROOT, path);
  const md = await Bun.file(full).text();
  const html = Bun.markdown.html(md, { headings: true });
  const body = `<article>${html}</article>`;
  return new Response(layout(path, body, makeBreadcrumb(path)), { headers: { "content-type": "text/html; charset=utf-8" } });
}

Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);
    let path = decodeURIComponent(url.pathname).replace(/^\/+/, "").replace(/\/+$/, "");
    let full = join(ROOT, path);
    let info;
    try {
      info = await stat(full);
    } catch {
      if (!path.endsWith(".md")) {
        const mdPath = `${path}.md`;
        const mdFull = join(ROOT, mdPath);
        try {
          info = await stat(mdFull);
          path = mdPath;
          full = mdFull;
        } catch {
          return new Response("Not found", { status: 404 });
        }
      } else {
        return new Response("Not found", { status: 404 });
      }
    }

    if (info.isDirectory()) return handleDir(path);
    if (path.endsWith(".md")) return handleMarkdown(path);

    return new Response(Bun.file(full));
  },
});

console.log(`http://localhost:${PORT}`);
