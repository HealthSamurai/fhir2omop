import { resolve, relative } from "node:path";

const ROOT = resolve(import.meta.dir, "..");

export default async function (ctx: Context, _session: any, req: Request) {
    const url = new URL(req.url);
    const rawPath = url.searchParams.get("path") ?? "";
    const from = Number(url.searchParams.get("from")) || 0;
    const to = Number(url.searchParams.get("to")) || 0;

    if (!rawPath) return new Response("missing ?path", { status: 400 });

    const abs = resolve(ROOT, rawPath);
    const rel = relative(ROOT, abs);
    if (rel.startsWith("..") || abs.includes("\0")) {
        return new Response("invalid path", { status: 400 });
    }

    const file = Bun.file(abs);
    if (!(await file.exists())) {
        return new Response(`Not Found: ${esc(rel)}`, { status: 404 });
    }

    const text = await file.text();
    const lines = text.split("\n");
    const total = lines.length;
    const pad = String(total).length;

    const lineHtml = lines.map((ln, i) => {
        const n = i + 1;
        const hi = from && to && n >= from && n <= to;
        const num = String(n).padStart(pad, " ");
        return `<div id="L${n}" class="${hi ? "bg-yellow-100" : ""} hover:bg-gray-50"><a href="#L${n}" class="inline-block w-12 pr-2 text-right text-gray-400 select-none">${num}</a><span class="font-mono">${esc(ln)}</span></div>`;
    }).join("");

    const lang = guessLang(rel);
    const anchor = from ? `#L${from}` : "";

    const main = `
<div class="not-prose">
  <div class="mb-3 flex items-baseline gap-3 flex-wrap">
    <h1 class="text-lg font-mono text-gray-900">${esc(rel)}</h1>
    ${from && to ? `<span class="text-xs text-gray-500">lines ${from}–${to}</span>` : ""}
    <span class="text-xs text-gray-400">${total} lines · ${lang}</span>
  </div>
  <pre hx-boost="false" class="text-xs bg-gray-50 border border-gray-200 rounded p-2 overflow-x-auto leading-5"><code>${lineHtml}</code></pre>
  ${from ? `<script>document.getElementById("L${from}")?.scrollIntoView({block:"center"});</script>` : ""}
</div>`;

    return { title: rel.split("/").pop() ?? rel, current: `source:${rel}`, main };
}

function esc(s: string) {
    return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

function guessLang(p: string) {
    const m = p.match(/\.([^./]+)$/);
    return m ? m[1] : "text";
}
