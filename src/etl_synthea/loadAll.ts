// Full pipeline: Synthea CSV → OMOP CDM v5.3.
//
// All sibling fns are invoked through ctx.fns.etl_synthea.* (late-bound)
// instead of `import` — see CLAUDE.md "Transitive-import staleness" — so
// editing runStep.ts and `repl.load`-ing it actually takes effect here.
// Mirrors LoadEventTables.r + CreateMapAndRollupTables.r combined.
//
// Step order (locked by ETL-Synthea):
//   1. createCdm                  — DROP+CREATE cdm_schema with empty tables + vocab views
//   2. createSyntheaTables        — synthea_schema with staging tables
//   3. loadSyntheaCsv             — \copy all 18 CSV files
//   4. CreateVocabMapTables:
//        create_source_to_standard_vocab_map.sql   (~4.5M rows, heaviest helper)
//        create_source_to_source_vocab_map.sql
//        create_states_map.sql
//   5. CreateVisitRollupTables:
//        AllVisitTable.sql
//        AAVITable.sql
//        final_visit_ids.sql
//   6. LoadEventTables — 19 inserts in dependency order
export default async function (
    ctx: Context,
    opts: {
        cdm_schema?: string;
        synthea_schema?: string;
        csv_dir?: string;
    },
): Promise<{ rows: Record<string, number>; ms: number }> {
    const cdm_schema     = opts.cdm_schema     ?? "cdm_ours";
    const synthea_schema = opts.synthea_schema ?? "native_ours";
    const csv_dir        = opts.csv_dir        ?? "synthea2omop/output/csv";
    const params = { cdm_schema, synthea_schema, synthea_version: "3.2.0", cdm_version: "5.3" };
    const t0 = Date.now();

    const log = (s: string) => console.log(`[etl_synthea] ${s}`);

    log(`config:  cdm=${cdm_schema}  native=${synthea_schema}  csv=${csv_dir}`);

    log("1. createCdm");
    await ctx.fns.etl_synthea.createCdm(ctx, { cdm_schema });

    log("2. createSyntheaTables");
    await ctx.fns.etl_synthea.createSyntheaTables(ctx, { synthea_schema });

    log("3. loadSyntheaCsv (all 18 tables)");
    await ctx.fns.etl_synthea.loadSyntheaCsv(ctx, { synthea_schema, csv_dir });

    const v531 = "v531";

    log("4. CreateVocabMapTables");
    // Reuse already-materialized maps from `cdm.*` (built by the reference run).
    // Both depend purely on vocab.* which is the same for all ETL runs —
    // no need to spend ~30s re-materializing 4.5M rows.
    const reuse = await ctx.fns.db.query(ctx, {
        sql: `SELECT to_regclass('cdm.source_to_standard_vocab_map') AS t`,
    });
    if (reuse[0]?.t) {
        log("   reusing cdm.source_to_standard_vocab_map / source_to_source_vocab_map via VIEW");
        for (const t of ["source_to_standard_vocab_map", "source_to_source_vocab_map"]) {
            await ctx.fns.db.query(ctx, {
                sql: `CREATE OR REPLACE VIEW ${cdm_schema}.${t} AS SELECT * FROM cdm.${t}`,
            });
        }
    } else {
        log("   no existing maps — building from scratch (~30s)");
        for (const file of [
            `${v531}/create_source_to_standard_vocab_map.sql`,
            `${v531}/create_source_to_source_vocab_map.sql`,
        ]) {
            await ctx.fns.etl_synthea.runStep(ctx, { file, params, verbose: true });
        }
    }
    await ctx.fns.etl_synthea.runStep(ctx, { file: `${v531}/create_states_map.sql`, params, verbose: true });

    log("5. CreateVisitRollupTables");
    for (const file of [
        `${v531}/AllVisitTable.sql`,
        `${v531}/AAVITable.sql`,
        `${v531}/final_visit_ids.sql`,
    ]) {
        await ctx.fns.etl_synthea.runStep(ctx, { file, params, verbose: true });
    }

    log("6. LoadEventTables (19 inserts)");
    for (const file of [
        `${v531}/insert_location.sql`,
        `${v531}/insert_care_site.sql`,
        `${v531}/insert_person.sql`,
        `${v531}/insert_observation_period.sql`,
        `${v531}/insert_provider.sql`,
        `${v531}/insert_visit_occurrence.sql`,
        `${v531}/insert_visit_detail.sql`,
        `${v531}/insert_condition_occurrence.sql`,
        `${v531}/insert_observation.sql`,
        `${v531}/insert_measurement.sql`,
        `${v531}/insert_procedure_occurrence.sql`,
        `${v531}/insert_drug_exposure.sql`,
        `${v531}/insert_condition_era.sql`,
        `${v531}/insert_drug_era.sql`,
        `${v531}/insert_cdm_source.sql`,
        `${v531}/insert_device_exposure.sql`,
        `${v531}/insert_death.sql`,
        `${v531}/insert_payer_plan_period.sql`,
        `${v531}/insert_cost_v300.sql`,
    ]) {
        await ctx.fns.etl_synthea.runStep(ctx, { file, params, verbose: true });
    }

    // Final counts
    const counts = await ctx.fns.db.query(ctx, {
        sql: `
            SELECT 'person'            AS tbl, count(*)::int AS n FROM ${cdm_schema}.person
            UNION ALL SELECT 'observation_period', count(*)::int FROM ${cdm_schema}.observation_period
            UNION ALL SELECT 'visit_occurrence',   count(*)::int FROM ${cdm_schema}.visit_occurrence
            UNION ALL SELECT 'visit_detail',       count(*)::int FROM ${cdm_schema}.visit_detail
            UNION ALL SELECT 'condition_occurrence', count(*)::int FROM ${cdm_schema}.condition_occurrence
            UNION ALL SELECT 'condition_era',      count(*)::int FROM ${cdm_schema}.condition_era
            UNION ALL SELECT 'drug_exposure',      count(*)::int FROM ${cdm_schema}.drug_exposure
            UNION ALL SELECT 'drug_era',           count(*)::int FROM ${cdm_schema}.drug_era
            UNION ALL SELECT 'procedure_occurrence', count(*)::int FROM ${cdm_schema}.procedure_occurrence
            UNION ALL SELECT 'measurement',        count(*)::int FROM ${cdm_schema}.measurement
            UNION ALL SELECT 'observation',        count(*)::int FROM ${cdm_schema}.observation
            UNION ALL SELECT 'device_exposure',    count(*)::int FROM ${cdm_schema}.device_exposure
            UNION ALL SELECT 'death',              count(*)::int FROM ${cdm_schema}.death
            UNION ALL SELECT 'location',           count(*)::int FROM ${cdm_schema}.location
            UNION ALL SELECT 'care_site',          count(*)::int FROM ${cdm_schema}.care_site
            UNION ALL SELECT 'provider',           count(*)::int FROM ${cdm_schema}.provider
            UNION ALL SELECT 'payer_plan_period',  count(*)::int FROM ${cdm_schema}.payer_plan_period
            UNION ALL SELECT 'cost',               count(*)::int FROM ${cdm_schema}.cost
            ORDER BY 1`,
    });
    const rows: Record<string, number> = {};
    for (const r of counts) rows[r.tbl] = r.n;

    const ms = Date.now() - t0;
    log(`done in ${(ms / 1000).toFixed(1)}s`);
    return { rows, ms };
}
