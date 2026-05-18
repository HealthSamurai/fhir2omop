// Create indices that speed up the per-table INSERT joins.
//
// ETL-Synthea's extra_indices.sql targets vocab_map (which we VIEW into cdm.*
// where those indexes already exist) — so we only need indices on the tables
// produced inside cdm_ours/native_ours during our run.
//
// Hot joins covered:
//   • person(person_source_value)              — every clinical insert
//   • provider(provider_source_value)          — provider FK
//   • visit_occurrence(visit_source_value)     — visit FK fallback
//   • final_visit_ids(encounter_id)            — every clinical insert
//   • native.patients(id), native.encounters(id, patient)
export default async function (
    ctx: Context,
    opts: { cdm_schema?: string; synthea_schema?: string },
): Promise<{ created: number; ms: number }> {
    const cdm_schema     = opts.cdm_schema     ?? "cdm_ours";
    const synthea_schema = opts.synthea_schema ?? "native_ours";
    const t0 = Date.now();

    const idx: Array<[string, string]> = [
        [`${cdm_schema}.person`,            "person_source_value"],
        [`${cdm_schema}.provider`,          "provider_source_value"],
        [`${cdm_schema}.visit_occurrence`,  "visit_source_value"],
        [`${cdm_schema}.final_visit_ids`,   "encounter_id"],
        [`${synthea_schema}.patients`,      "id"],
        [`${synthea_schema}.encounters`,    "id"],
        [`${synthea_schema}.encounters`,    "patient"],
        [`${synthea_schema}.observations`,  "patient"],
        [`${synthea_schema}.observations`,  "encounter"],
        [`${synthea_schema}.procedures`,    "patient"],
        [`${synthea_schema}.procedures`,    "encounter"],
        [`${synthea_schema}.medications`,   "patient"],
        [`${synthea_schema}.medications`,   "encounter"],
        [`${synthea_schema}.conditions`,    "patient"],
        [`${synthea_schema}.conditions`,    "encounter"],
        [`${synthea_schema}.claims_transactions`, "claimid"],
    ];

    let created = 0;
    for (const [tbl, col] of idx) {
        const name = `ix_${tbl.replace(".", "_")}_${col}`.slice(0, 63);
        await ctx.fns.db.query(ctx, {
            sql: `CREATE INDEX IF NOT EXISTS ${name} ON ${tbl} (${col})`,
        });
        created++;
    }

    const ms = Date.now() - t0;
    console.log(`[etl_synthea] created ${created} indices in ${(ms/1000).toFixed(1)}s`);
    return { created, ms };
}
