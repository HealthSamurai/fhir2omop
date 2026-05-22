// Materialize a FHIR ConceptMap as a Postgres table in schema `cm.*`.
//
//   ctx.fns.conceptmap.materialize(ctx, { cm })
//     → { table, rows }
//
// Table shape — one row per element across all groups:
//   cm.<id>(
//     source_code        text PRIMARY KEY,
//     concept_id         integer NOT NULL,      -- target Standard Concept (Maps-to)
//     source_concept_id  integer NOT NULL DEFAULT 0,
//         Athena concept_id of the source code itself, or 0.
//         Resolved by looking up (vocabulary_id, concept_code) when the
//         group declares an `omop-source-vocabulary` extension.
//     source_display     text,
//     target_display     text,
//     equivalence        text
//   )
//
// Stage-2 SQL uses both: `<col>_concept_id := cm.concept_id`,
// `<col>_source_concept_id := cm.source_concept_id`. Per OMOP convention,
// source_concept_id is 0 unless the source code exists as a concept in
// Athena (e.g., HL7 v3 AdministrativeGender M/F/OTH/UNK live in vocab.concept
// with vocabulary_id='Gender'; but FHIR administrative-gender male/female/...
// do not, and stay 0).
//
// Multi-group ConceptMaps (e.g. gender: admin-gender + v3-AdministrativeGender)
// are flattened into one table — source codes across groups must be unique.
const SOURCE_VOCAB_EXT = "https://fhir2omop.health-samurai.io/StructureDefinition/omop-source-vocabulary";

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
    // concept_id is NULLable so the same table shape covers both
    // code-to-concept maps (race / gender / ...) and code-to-string maps
    // (e.g. FHIR Coding.system → OMOP vocabulary_id). target_code holds the
    // raw target string; concept_id is the integer parse of it when valid.
    await ctx.fns.db.query(ctx, {
        sql: `CREATE TABLE ${table} (
            source_code        text PRIMARY KEY,
            concept_id         integer,
            source_concept_id  integer NOT NULL DEFAULT 0,
            target_code        text NOT NULL,
            source_display     text,
            target_display     text,
            equivalence        text
        )`,
    });

    type Row = {
        source_code: string;
        concept_id: number | null;
        source_concept_id: number;
        target_code: string;
        source_display?: string;
        target_display?: string;
        equivalence?: string;
    };
    const rows: Row[] = [];
    const seen = new Set<string>();

    for (const g of cm.group ?? []) {
        const sourceVocab = g.extension?.find((e: any) => e.url === SOURCE_VOCAB_EXT)?.valueString as string | undefined;

        // Bulk-lookup all source_code → Athena concept_id for this group
        // (single query instead of one per row).
        const sourceConceptByCode = new Map<string, number>();
        if (sourceVocab) {
            const codes = (g.element ?? []).map((el: any) => el.code as string);
            if (codes.length > 0) {
                const placeholders = codes.map((_: any, i: number) => `$${i + 2}`).join(",");
                const matches = await ctx.fns.db.query(ctx, {
                    sql: `SELECT concept_code, concept_id FROM vocab.concept
                           WHERE vocabulary_id = $1 AND concept_code IN (${placeholders})`,
                    params: [sourceVocab, ...codes],
                });
                for (const m of matches) sourceConceptByCode.set(m.concept_code, m.concept_id);
            }
        }

        for (const el of g.element ?? []) {
            const t = (el.target ?? [])[0];
            if (!t) continue;
            const code = el.code as string;
            if (seen.has(code)) throw new Error(`duplicate source_code '${code}' in ConceptMap ${id}`);
            seen.add(code);
            const targetCode = String(t.code);
            const conceptId = /^\d+$/.test(targetCode) ? Number(targetCode) : null;
            rows.push({
                source_code: code,
                concept_id: conceptId,
                source_concept_id: sourceConceptByCode.get(code) ?? 0,
                target_code: targetCode,
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
            placeholders.push(`($${i++}, $${i++}, $${i++}, $${i++}, $${i++}, $${i++}, $${i++})`);
            params.push(
                r.source_code, r.concept_id, r.source_concept_id, r.target_code,
                r.source_display ?? null, r.target_display ?? null, r.equivalence ?? null,
            );
        }
        await ctx.fns.db.query(ctx, {
            sql: `INSERT INTO ${table} (source_code, concept_id, source_concept_id, target_code, source_display, target_display, equivalence)
                  VALUES ${placeholders.join(", ")}`,
            params,
        });
    }

    return { table, rows: rows.length };
}
