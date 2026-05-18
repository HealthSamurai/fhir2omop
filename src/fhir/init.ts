import { getSql } from "./connect";

// Create the `fhir` schema if it doesn't exist. Per-resourceType tables are
// created on-demand by ensureTable.ts.
export default async function (_ctx: Context): Promise<{ schema: string }> {
    const sql = getSql();
    await sql`CREATE SCHEMA IF NOT EXISTS fhir`;
    return { schema: "fhir" };
}
