export default async function (_ctx: Context, opts: { source: string }): Promise<string> {
    const escaped = String(opts.source ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
    return `<pre class="mermaid"><code>${escaped}</code></pre>`;
}
