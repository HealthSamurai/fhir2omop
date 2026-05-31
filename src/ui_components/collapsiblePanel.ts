// Reusable collapsible panel (a styled <details>/<summary>).
//
// Convention: shared UI building blocks live in src/ui_components/<name>.ts and
// are called late-bound via ctx.fns.ui_components.<name>(ctx, { ... }) — never
// imported — so hot-reload picks up edits.
//
//   ctx.fns.ui_components.collapsiblePanel(ctx, {
//     summary: "Title <span>…</span>",   // left side of the header bar
//     right:   badgesHtml,               // optional right-aligned header content
//     body:    innerHtml,                // panel content (revealed when open)
//     open:    false,                    // default collapsed
//     tone:    "emerald",                // border/header color preset
//     key:     "case-foo-3",             // data-k (htmx open-state preservation)
//   })
//
// Returns an HTML string. Pure/sync — no awaiting needed by callers.
const TONES: Record<string, { border: string; bg: string; hover: string; label: string }> = {
    gray:    { border: "border-gray-200",    bg: "bg-gray-50",    hover: "hover:bg-gray-100",    label: "text-gray-500" },
    slate:   { border: "border-slate-200",   bg: "bg-slate-50",   hover: "hover:bg-slate-100",   label: "text-slate-700" },
    emerald: { border: "border-emerald-200", bg: "bg-emerald-50", hover: "hover:bg-emerald-100", label: "text-emerald-800" },
    rose:    { border: "border-rose-300",    bg: "bg-rose-50",    hover: "hover:bg-rose-100",    label: "text-rose-800" },
    amber:   { border: "border-amber-200",   bg: "bg-amber-50",   hover: "hover:bg-amber-100",   label: "text-amber-800" },
};

export default function (
    ctx: Context,
    opts: {
        summary: string;
        body: string;
        right?: string;
        open?: boolean;
        tone?: keyof typeof TONES | string;
        key?: string;
        bodyClass?: string;
        class?: string;
    },
): string {
    const t = TONES[opts.tone ?? "gray"] ?? TONES.gray!;
    const openAttr = opts.open ? " open" : "";
    const keyAttr = opts.key ? ` data-k="${opts.key}"` : "";
    const bodyClass = opts.bodyClass ?? "p-4";
    const extra = opts.class ?? "mb-3";
    // Background is always neutral gray (tone only colors the border) for
    // readability; the title spans the full width and any `right` content (badges)
    // sits on its own line below it, aligned under the title past the ▸ marker.
    const right = opts.right
        ? `<div class="mt-1.5 ml-[18px] flex items-center flex-wrap gap-1.5">${opts.right}</div>`
        : "";
    // The ▸ marker rotates via the `open` state (group-open utility on the marker).
    return `<details${openAttr}${keyAttr} class="group not-prose border ${t.border} rounded-lg overflow-hidden ${extra}">
  <summary class="px-4 py-2.5 cursor-pointer select-none bg-gray-50 hover:bg-gray-100">
    <div class="flex items-start gap-2">
      <span class="mt-0.5 text-gray-400 text-[10px] transition-transform group-open:rotate-90 shrink-0">▶</span>
      <div class="min-w-0 flex-1">${opts.summary}</div>
    </div>
    ${right}
  </summary>
  <div class="${bodyClass}">${opts.body}</div>
</details>`;
}
