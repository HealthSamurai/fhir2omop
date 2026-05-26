// GET /concept/:id — htmx fragment endpoint.
// Returns a small inline pill with the concept's name, vocabulary, domain,
// and standard flag, looked up from vocab.concept. Used by sample cards
// and ETL SQL views to expand bare integers (8507, 32827, …) into something
// meaningful on hover/click.
//
// Renders 200 with a single span fragment; on miss returns the same shape
// with placeholder text.

export default async function (ctx: Context, _session: any, req: Request) {
    const { id } = (req as any).params as { id: string };
    if (!id || !/^\d+$/.test(id)) {
        return new Response(`<span class="text-xs text-gray-400">invalid id</span>`, {
            headers: { "content-type": "text/html; charset=utf-8" },
        });
    }

    const rows = await ctx.fns.db.query(ctx, {
        sql: `SELECT concept_name, vocabulary_id, domain_id, concept_class_id,
                     standard_concept, concept_code
              FROM vocab.concept WHERE concept_id = $1`,
        params: [Number(id)],
    });

    if (rows.length === 0) {
        return new Response(
            `<span class="text-xs text-gray-400 ml-1" title="concept_id ${esc(id)} not in vocab.concept">· not found</span>`,
            { headers: { "content-type": "text/html; charset=utf-8" } },
        );
    }
    const c = rows[0] as any;
    const isStd = c.standard_concept === "S";

    const html = `<span class="text-xs ml-1 inline-flex items-baseline gap-1 align-baseline"
        title="${esc(c.concept_name)} — ${esc(c.vocabulary_id)} / ${esc(c.domain_id)}${isStd ? " (Standard)" : ""}">
  <span class="text-gray-400">·</span>
  <span class="text-gray-700">${esc(c.concept_name)}</span>
  <span class="text-[10px] text-gray-400">${esc(c.vocabulary_id)} / ${esc(c.domain_id)}${isStd ? " · S" : ""}</span>
</span>`;

    return new Response(html, {
        headers: { "content-type": "text/html; charset=utf-8" },
    });
}

function esc(s: string): string {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;")
                    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
