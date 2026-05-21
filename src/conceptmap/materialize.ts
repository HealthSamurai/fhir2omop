// Materialize a FHIR ConceptMap as a Postgres table in schema `cm.*`.
//
//   ctx.fns.conceptmap.materialize(ctx, { cm })
//     → { table, rows }
//
// Table shape (one row per element across all groups):
//   cm.<id>(
//     source_code     text PRIMARY KEY,
//     concept_id      integer NOT NULL,
//     source_display  text,
//     target_display  text,
//     equivalence     text
//   )
//
// Stage-2 SQL then resolves source codes via a simple LEFT JOIN:
//   LEFT JOIN cm.race_omb_to_omop r ON r.source_code = v.race_omb_code
//
// Multi-group ConceptMaps (e.g. gender: admin-gender + v3-AdministrativeGender)
// are flattened into one table — source codes across groups are assumed
// unique (different vocabularies use different code shapes). If a clash
// is detected, the loader throws.
export default async function (
    ctx: Context,
    opts: { cm: any },
): Promise<{ table: string; rows: number }> {
    const cm = opts.cm;
    if (cm.resourceType !== "ConceptMap") throw new Error(`not a ConceptMap: ${cm?.resourceType}`);
    const id = cm.id;
    if (!id) throw new Error("ConceptMap missing id");

    const table = `cm.${id.replace(/-/g, "_")}`;
    await ctx.fns.db.query(ctx, { sql: `CREATE SCHEMA IF NOT EXISTS cm` });
    await ctx.fns.db.query(ctx, { sql: `DROP TABLE IF EXISTS ${table}` });
    await ctx.fns.db.query(ctx, {
        sql: `CREATE TABLE ${table} (
            source_code     text PRIMARY KEY,
            concept_id      integer NOT NULL,
            source_display  text,
            target_display  text,
            equivalence     text
        )`,
    });

    type Row = { source_code: string; concept_id: number; source_display?: string; target_display?: string; equivalence?: string };
    const rows: Row[] = [];
    const seen = new Set<string>();
    for (const g of cm.group ?? []) {
        for (const el of g.element ?? []) {
            const t = (el.target ?? [])[0];
            if (!t) continue;
            const code = el.code as string;
            if (seen.has(code)) throw new Error(`duplicate source_code '${code}' in ConceptMap ${id}`);
            seen.add(code);
            rows.push({
                source_code: code,
                concept_id: Number(t.code),
                source_display: el.display ?? undefined,
                target_display: t.display ?? undefined,
                equivalence: t.equivalence ?? undefined,
            });
        }
    }

    if (rows.length > 0) {
        const placeholders: string[] = [];
        const params: any[] = [];
        let i = 1;
        for (const r of rows) {
            placeholders.push(`($${i++}, $${i++}, $${i++}, $${i++}, $${i++})`);
            params.push(r.source_code, r.concept_id, r.source_display ?? null, r.target_display ?? null, r.equivalence ?? null);
        }
        await ctx.fns.db.query(ctx, {
            sql: `INSERT INTO ${table} (source_code, concept_id, source_display, target_display, equivalence) VALUES ${placeholders.join(", ")}`,
            params,
        });
    }

    return { table, rows: rows.length };
}
