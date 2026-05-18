import runStep from "./runStep";
import createCdm from "./createCdm";
import createSyntheaTables from "./createSyntheaTables";
import loadSyntheaCsv from "./loadSyntheaCsv";

// End-to-end: Patient → person + location.
// Equivalent slice of LoadEventTables.r, but only the bits Person needs:
//   1. ensure target schemas exist
//   2. load patients.csv into native_ours
//   3. create states_map
//   4. insert_location.sql
//   5. insert_person.sql
//
// Re-runs are idempotent — createCdm drops the target schema first.
export default async function (
    ctx: Context,
    opts: {
        cdm_schema?: string;            // default: cdm_ours
        synthea_schema?: string;        // default: native_ours
        csv_dir?: string;               // default: synthea2omop/output/csv
    },
): Promise<{ rows: { person: number; location: number }; ms: number }> {
    const cdm_schema     = opts.cdm_schema     ?? "cdm_ours";
    const synthea_schema = opts.synthea_schema ?? "native_ours";
    const csv_dir        = opts.csv_dir        ?? "synthea2omop/output/csv";

    const params = { cdm_schema, synthea_schema };
    const t0 = Date.now();

    console.log(`[loadPerson] cdm=${cdm_schema}  native=${synthea_schema}  csv=${csv_dir}`);

    console.log(`[loadPerson] 1. createCdm`);
    await createCdm(ctx, { cdm_schema });

    console.log(`[loadPerson] 2. createSyntheaTables`);
    await createSyntheaTables(ctx, { synthea_schema });

    console.log(`[loadPerson] 3. load patients.csv`);
    await loadSyntheaCsv(ctx, { synthea_schema, csv_dir, tables: ["patients"] });

    console.log(`[loadPerson] 4. create_states_map.sql`);
    await runStep(ctx, { file: "cdm_version/v531/create_states_map.sql", params });

    console.log(`[loadPerson] 5. insert_location.sql`);
    await runStep(ctx, { file: "cdm_version/v531/insert_location.sql", params });

    console.log(`[loadPerson] 6. insert_person.sql`);
    await runStep(ctx, { file: "cdm_version/v531/insert_person.sql", params });

    const personCount   = await ctx.fns.db.query(ctx, { sql: `SELECT count(*)::int AS n FROM ${cdm_schema}.person`   });
    const locationCount = await ctx.fns.db.query(ctx, { sql: `SELECT count(*)::int AS n FROM ${cdm_schema}.location` });

    const ms = Date.now() - t0;
    console.log(`[loadPerson] done in ${(ms/1000).toFixed(1)}s — ${personCount[0].n} person, ${locationCount[0].n} location`);
    return { rows: { person: personCount[0].n, location: locationCount[0].n }, ms };
}
