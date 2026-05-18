// Build indexes used by diff JOINs on cdm.* and cdm_ours_fhir.*.
//
// Diff helper joins by (person_id, <table>_source_value, <table>_start_date)
// or by single <table>_source_value. Without indexes Postgres does
// nested-loop hash on 100k rows × 100k rows = slow page loads.
//
//   ctx.fns.diff.createIndices(ctx)  → { created: number, ms: number }
//
// Idempotent — uses CREATE INDEX IF NOT EXISTS.
export default async function (
    ctx: Context,
): Promise<{ created: number; ms: number }> {
    const t0 = Date.now();
    const schemas = ["cdm", "cdm_ours_fhir"];

    // Per table: list of single-column AND composite indexes to create.
    // The single source_value index makes the simple equi-join fast; the
    // composite makes the (person_id, source_value, start_date) join fast.
    const plan: Array<[string, string[][]]> = [
        ["person",                  [["person_source_value"]]],
        ["location",                [["location_source_value"]]],
        ["provider",                [["provider_source_value"], ["npi"]]],
        ["care_site",               [["care_site_source_value"]]],
        ["visit_occurrence",        [["visit_source_value"], ["person_id"]]],
        ["condition_occurrence",    [["condition_source_value"], ["person_id"],
                                     ["person_id", "condition_source_value", "condition_start_date"]]],
        ["measurement",             [["measurement_source_value"], ["person_id"],
                                     ["person_id", "measurement_source_value", "measurement_date"]]],
        ["observation",             [["observation_source_value"], ["person_id"],
                                     ["person_id", "observation_source_value", "observation_date"]]],
        ["procedure_occurrence",    [["procedure_source_value"], ["person_id"],
                                     ["person_id", "procedure_source_value", "procedure_date"]]],
        ["drug_exposure",           [["drug_source_value"], ["person_id"],
                                     ["person_id", "drug_source_value", "drug_exposure_start_date"]]],
        ["death",                   [["person_id"]]],
        ["device_exposure",         [["device_source_value"], ["person_id"]]],
    ];

    let created = 0;
    for (const schema of schemas) {
        for (const [tbl, indices] of plan) {
            // skip if table doesn't exist (cdm_ours_fhir may not have all)
            const rows = await ctx.fns.db.query(ctx, {
                sql: `SELECT 1 FROM information_schema.tables WHERE table_schema=$1 AND table_name=$2`,
                params: [schema, tbl],
            });
            if (rows.length === 0) continue;

            for (const cols of indices) {
                // also skip if any column is missing
                const inList = cols.map((c) => `'${c.replace(/'/g, "''")}'`).join(",");
                const colsRows = await ctx.fns.db.query(ctx, {
                    sql: `SELECT count(*)::int AS n FROM information_schema.columns
                            WHERE table_schema=$1 AND table_name=$2 AND column_name IN (${inList})`,
                    params: [schema, tbl],
                });
                if (colsRows[0].n !== cols.length) continue;

                const name = `ix_${schema}_${tbl}_${cols.map((c) => c.slice(0, 8)).join("_")}`.slice(0, 63);
                await ctx.fns.db.query(ctx, {
                    sql: `CREATE INDEX IF NOT EXISTS "${name}" ON "${schema}"."${tbl}" (${cols.map((c) => `"${c}"`).join(", ")})`,
                });
                created++;
            }
        }
    }

    // Postgres won't use new indexes for plan estimation without ANALYZE.
    for (const schema of schemas) {
        await ctx.fns.db.query(ctx, { sql: `ANALYZE "${schema}".person` }).catch(() => {});
    }

    const ms = Date.now() - t0;
    console.log(`[diff.createIndices] ${created} indexes in ${(ms/1000).toFixed(1)}s`);
    return { created, ms };
}
