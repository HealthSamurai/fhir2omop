export default async function (_ctx: Context, opts: { code: string; lang: string }): Promise<string> {
    const code = String(opts.code ?? "");
    const lang = String(opts.lang ?? "text");
    const escaped = code
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
    return `<pre><code class="language-${escapeAttr(lang)}">${escaped}</code></pre>`;
}

function escapeAttr(s: string) {
    return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}
