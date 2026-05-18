// Pretty-print the output of ctx.fns.diff.compareTables as a Markdown report.
//
//   ctx.fns.diff.report(ctx, { ref, ours, key }) → string (markdown)
//
// Convenience wrapper: runs compareTables and formats. Uses ctx.fns.diff to
// avoid transitive-import staleness during REPL hot-reload (see CLAUDE.md).

export default async function (
    ctx: Context,
    opts: { ref: string; ours: string; key: string | string[]; columns?: string[] },
): Promise<string> {
    const r = await ctx.fns.diff.compareTables(ctx, opts);

    const lines: string[] = [];
    lines.push(`# Diff: \`${r.ref}\` vs \`${r.ours}\``);
    lines.push("");
    lines.push(`Join key: \`${r.key}\`  ·  Compared columns: ${r.fields.length}`);
    lines.push("");
    lines.push("## Row-level");
    lines.push("");
    lines.push("| Metric | Count |");
    lines.push("|---|---:|");
    lines.push(`| Reference rows (\`${r.ref}\`)   | ${num(r.ref_rows)} |`);
    lines.push(`| Ours rows (\`${r.ours}\`)       | ${num(r.ours_rows)} |`);
    lines.push(`| In both                          | ${num(r.in_both)} |`);
    lines.push(`| Ref-only (missing from ours)     | ${num(r.ref_only)} |`);
    lines.push(`| Ours-only (extra rows in ours)   | ${num(r.ours_only)} |`);
    lines.push("");

    if (r.fields.length > 0) {
        lines.push("## Column-level (rows present in both)");
        lines.push("");
        lines.push("| Column | Match | Mismatch | Ref NULL only | Ours NULL only | Both NULL |");
        lines.push("|---|---:|---:|---:|---:|---:|");
        for (const f of r.fields) {
            const flag = f.mismatch > 0 ? " ⚠️" : "";
            lines.push(`| \`${f.column}\`${flag} | ${num(f.match)} | ${num(f.mismatch)} | ${num(f.ref_null)} | ${num(f.ours_null)} | ${num(f.both_null)} |`);
        }
        lines.push("");

        const issues = r.fields.filter((f: any) => f.mismatch > 0 || f.ref_null > 0 || f.ours_null > 0);
        if (issues.length > 0) {
            lines.push("## Columns with differences");
            lines.push("");
            for (const f of issues) {
                lines.push(`- **\`${f.column}\`** — ${f.mismatch} mismatches, ${f.ref_null} ref-NULL-only, ${f.ours_null} ours-NULL-only`);
            }
        } else {
            lines.push("## All columns match ✓");
        }
    }

    return lines.join("\n");
}

function num(n: number): string {
    return n.toLocaleString();
}
