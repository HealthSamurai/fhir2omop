// Server-side syntax highlighting via Shiki. The highlighter is created once
// and cached on ctx.state (survives REPL reloads). Output is Shiki's
// <pre class="shiki min-light">…<span style="color:…"> markup; the layout's
// .shiki / .prose pre.shiki CSS gives it the page's code-block chrome.
import { createHighlighter } from "shiki";

const LANGS = [
    "json", "yaml", "sql", "bash", "shell", "typescript", "javascript",
    "http", "xml", "html", "css", "diff", "markdown", "ini",
];
const ALIASES: Record<string, string> = {
    yml: "yaml", js: "javascript", ts: "typescript", sh: "bash", zsh: "bash",
    text: "plaintext", txt: "plaintext", plain: "plaintext", "": "plaintext",
};

export default async function (ctx: Context, opts: { code: string; lang: string }): Promise<string> {
    const code = String(opts.code ?? "");
    const raw = String(opts.lang ?? "text").toLowerCase().trim();
    let lang = ALIASES[raw] ?? raw;

    if (!ctx.state) (ctx as any).state = {};
    if (!ctx.state.shikiHighlighter) {
        // store the promise so concurrent callers share one init
        ctx.state.shikiHighlighter = createHighlighter({ themes: ["min-light"], langs: LANGS })
            .catch((e: any) => { ctx.state.shikiHighlighter = null; throw e; });
    }

    let hl: any;
    try {
        hl = await ctx.state.shikiHighlighter;
    } catch {
        return `<pre class="shiki"><code>${escapeHtml(code)}</code></pre>`;
    }

    if (!hl.getLoadedLanguages().includes(lang)) lang = "plaintext";
    try {
        return hl.codeToHtml(code, { lang, theme: "min-light" });
    } catch {
        return `<pre class="shiki"><code>${escapeHtml(code)}</code></pre>`;
    }
}

function escapeHtml(s: string) {
    return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}
