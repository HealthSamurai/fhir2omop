// Render the Live-diff card for one OMOP table. Heavy: hits Postgres for
// row counts + per-column FILTER aggregates. Cached for 60s server-side.
// Mounted as an htmx fragment at GET /diff/:resource/:table.

export default async function (
    ctx: Context,
    opts: { omop_table: string },
): Promise<string | null> {
    const omopTable = opts.omop_table;
    const refSchema = "cdm";
    const oursSchema = "cdm_ours_fhir";

    const candidates = [
        `${omopTable}_source_value`,
        `${omopTable.replace(/_occurrence$/, "")}_source_value`,
        `${omopTable.replace(/_exposure$/,   "")}_source_value`,
        `${omopTable.replace(/_period$/,     "")}_source_value`,
        `${omopTable.replace(/_era$/,        "")}_source_value`,
    ];
    const inList = candidates.map((c) => `'${c}'`).join(",");

    const exists = await ctx.fns.db.query(ctx, {
        sql: `
            SELECT
                EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema=$1 AND table_name=$2) AS ref_ok,
                EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema=$3 AND table_name=$2) AS ours_ok,
                (SELECT column_name FROM information_schema.columns
                  WHERE table_schema=$1 AND table_name=$2 AND column_name IN (${inList}) LIMIT 1) AS key_col
        `,
        params: [refSchema, omopTable, oursSchema],
    });
    if (!exists[0]?.ref_ok || !exists[0]?.ours_ok) return null;
    const keyCol: string | null = exists[0].key_col;
    if (!keyCol) return null;

    const dateCandidate = `${omopTable.replace(/_occurrence$|_era$/, "")}_start_date`;
    const dateExists = await ctx.fns.db.query(ctx, {
        sql: `SELECT 1 FROM information_schema.columns WHERE table_schema=$1 AND table_name=$2 AND column_name=$3`,
        params: [refSchema, omopTable, dateCandidate],
    });
    const uniq = await ctx.fns.db.query(ctx, {
        sql: `SELECT count(*)::int AS rows, count(distinct "${keyCol}")::int AS distinct_keys FROM ${refSchema}.${omopTable}`,
    });
    const isUnique = uniq[0].rows === uniq[0].distinct_keys;
    const useKey: string | string[] =
        isUnique || dateExists.length === 0
            ? keyCol
            : ["person_id", keyCol, dateCandidate];

    const r = await ctx.fns.diff.compareTables(ctx, {
        ref:  `${refSchema}.${omopTable}`,
        ours: `${oursSchema}.${omopTable}`,
        key:  useKey,
    });

    if (r.ref_rows === 0 && r.ours_rows === 0) return null;

    const fields = r.fields ?? [];
    const concept_diffs = fields.filter((f: any) =>
        f.column.endsWith("concept_id") && (f.mismatch > 0 || f.ours_null > 0));

    const status =
        r.ref_rows === 0  ? `<span class="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">reference empty</span>`
      : r.ours_rows === 0 ? `<span class="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">not loaded yet</span>`
      : concept_diffs.length === 0
          ? `<span class="px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">concept match 100%</span>`
          : `<span class="px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">${concept_diffs.length} concept_id diff${concept_diffs.length > 1 ? "s" : ""}</span>`;

    const totalsRow = `
        <tr>
          <td class="px-2 py-1 text-[12px] text-gray-700">rows</td>
          <td class="px-2 py-1 font-mono text-[12px] text-right">${num(r.ref_rows)}</td>
          <td class="px-2 py-1 font-mono text-[12px] text-right">${num(r.ours_rows)}</td>
          <td class="px-2 py-1 font-mono text-[12px] text-right">${num(r.in_both)}</td>
          <td class="px-2 py-1 font-mono text-[12px] text-right">${r.ref_only > 0  ? `<span class="text-red-700">${num(r.ref_only)}</span>`  : "0"}</td>
          <td class="px-2 py-1 font-mono text-[12px] text-right">${r.ours_only > 0 ? `<span class="text-amber-700">${num(r.ours_only)}</span>` : "0"}</td>
        </tr>`;

    const fieldRows = fields
        .map((f: any) => {
            const flag = f.mismatch > 0 ? " ⚠️" : (f.ours_null > 0 ? " ∅" : "");
            const colorMismatch = f.mismatch > 0 ? "text-yellow-700 font-medium" : "text-gray-500";
            const colorOursNull = f.ours_null > 0 ? "text-amber-700" : "text-gray-400";
            return `<tr>
              <td class="px-2 py-1 font-mono text-[11px] text-gray-800">${esc(f.column)}${flag}</td>
              <td class="px-2 py-1 font-mono text-[11px] text-right text-gray-700">${num(f.match)}</td>
              <td class="px-2 py-1 font-mono text-[11px] text-right ${colorMismatch}">${num(f.mismatch)}</td>
              <td class="px-2 py-1 font-mono text-[11px] text-right ${colorOursNull}">${num(f.ours_null)}</td>
            </tr>`;
        })
        .join("");

    return `
<div class="mb-6 border border-sky-200 rounded-lg overflow-hidden">
  <div class="flex items-center justify-between px-4 py-2 bg-sky-50 border-b border-sky-200">
    <div class="flex items-center gap-2 text-xs">
      <span class="text-[10px] uppercase tracking-wider text-sky-800 font-semibold">Live diff</span>
      <code class="font-mono text-sm text-sky-900">${esc(refSchema)}.${esc(omopTable)}</code>
      <span class="text-gray-400">vs</span>
      <code class="font-mono text-sm text-sky-900">${esc(oursSchema)}.${esc(omopTable)}</code>
      ${status}
    </div>
    <span class="text-[11px] text-sky-700">
      join key: <code class="bg-white px-1 rounded">${Array.isArray(useKey) ? useKey.map(esc).join(", ") : esc(useKey)}</code>
      ${r.cached ? `<span class="ml-2 text-[10px] text-gray-500" title="served from cache, TTL 60s">cached</span>` : `<span class="ml-2 text-[10px] text-gray-500">${r.ms}ms</span>`}
    </span>
  </div>
  <table class="w-full bg-white text-xs">
    <thead class="bg-gray-50 text-[10px] uppercase tracking-wider text-gray-500 border-b border-gray-200">
      <tr>
        <th class="text-left  px-2 py-1.5 font-medium">metric</th>
        <th class="text-right px-2 py-1.5 font-medium">reference</th>
        <th class="text-right px-2 py-1.5 font-medium">ours</th>
        <th class="text-right px-2 py-1.5 font-medium">in both</th>
        <th class="text-right px-2 py-1.5 font-medium">ref only</th>
        <th class="text-right px-2 py-1.5 font-medium">ours only</th>
      </tr>
    </thead>
    <tbody>${totalsRow}</tbody>
  </table>
  ${fields.length > 0 ? `
  <details class="bg-white border-t border-sky-100">
    <summary class="px-4 py-2 cursor-pointer text-[11px] text-sky-700 hover:bg-sky-25 select-none">${fields.length} columns compared ▾</summary>
    <table class="w-full bg-white text-xs">
      <thead class="bg-gray-50 text-[10px] uppercase tracking-wider text-gray-500 border-y border-gray-200">
        <tr>
          <th class="text-left  px-2 py-1.5 font-medium">column</th>
          <th class="text-right px-2 py-1.5 font-medium">match</th>
          <th class="text-right px-2 py-1.5 font-medium">mismatch</th>
          <th class="text-right px-2 py-1.5 font-medium">ours NULL only</th>
        </tr>
      </thead>
      <tbody>${fieldRows}</tbody>
    </table>
  </details>` : ""}
</div>`;
}

function num(n: number): string {
    return n.toLocaleString();
}

function esc(s: string): string {
    return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}
