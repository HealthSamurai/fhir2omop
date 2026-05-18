import { resolve } from "node:path";

// Create the target OMOP CDM schema with v5.3 event tables and views over
// vocab.* for the 9 vocabulary tables (avoids duplicating ~120GB of Athena
// data). Mirrors the role of synthea2omop/setup-cdm.sh but writes into our
// chosen schema name.
//
// Idempotent — drops & recreates the schema.
export default async function (
    ctx: Context,
    opts: { cdm_schema: string },
): Promise<{ tables: number; views: number }> {
    const schema = opts.cdm_schema;
    if (!/^[a-z][a-z0-9_]*$/.test(schema)) {
        throw new Error(`Bad schema name: ${schema}`);
    }

    const ddlPath = resolve(
        import.meta.dir, "..", "..",
        "CommonDataModel/inst/ddl/5.3/postgresql/OMOPCDM_postgresql_5.3_ddl.sql",
    );
    const ddl = await Bun.file(ddlPath).text();
    const renderedDdl = ddl.split("@cdmDatabaseSchema").join(schema);

    // 1. Drop & recreate schema
    await ctx.fns.db.query(ctx, { sql: `DROP SCHEMA IF EXISTS ${schema} CASCADE` });
    await ctx.fns.db.query(ctx, { sql: `CREATE SCHEMA ${schema}` });

    // 2. Create ALL CDM tables (event + vocab) via canonical DDL
    await ctx.fns.db.query(ctx, { sql: renderedDdl });

    // 3. Drop the empty vocab tables, replace with views over vocab.*
    const VOCAB_TABLES = [
        "concept", "vocabulary", "domain", "concept_class",
        "concept_relationship", "relationship", "concept_synonym",
        "concept_ancestor", "drug_strength",
    ];
    for (const t of VOCAB_TABLES) {
        await ctx.fns.db.query(ctx, { sql: `DROP TABLE ${schema}.${t}` });
        await ctx.fns.db.query(ctx, {
            sql: `CREATE VIEW ${schema}.${t} AS SELECT * FROM vocab.${t}`,
        });
    }

    const tables = await ctx.fns.db.query(ctx, {
        sql: `SELECT count(*)::int AS n FROM pg_tables WHERE schemaname = $1`,
        params: [schema],
    });
    const views = await ctx.fns.db.query(ctx, {
        sql: `SELECT count(*)::int AS n FROM pg_views WHERE schemaname = $1`,
        params: [schema],
    });
    return { tables: tables[0].n, views: views[0].n };
}
