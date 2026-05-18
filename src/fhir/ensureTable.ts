import { getSql } from "./connect";

const _cache = new Set<string>();

// Create one `fhir.<resourceType>` table (snake-cased) with shape:
//   (id text PRIMARY KEY, resource jsonb NOT NULL).
// Idempotent; memoized so loadBundle doesn't re-issue DDL per row.
export default async function (
    _ctx: Context,
    opts: { resourceType: string },
): Promise<{ table: string }> {
    const name = toTableName(opts.resourceType);
    if (_cache.has(name)) return { table: `fhir.${name}` };
    if (!/^[a-z][a-z0-9_]*$/.test(name)) {
        throw new Error(`Bad resource type for table name: ${opts.resourceType}`);
    }
    const sql = getSql();
    await sql.unsafe(`
        CREATE TABLE IF NOT EXISTS fhir.${name} (
            id text PRIMARY KEY,
            resource jsonb NOT NULL
        )
    `);
    _cache.add(name);
    return { table: `fhir.${name}` };
}

// FHIR ResourceType ("MedicationRequest") → table name ("medication_request")
function toTableName(rt: string): string {
    return rt
        .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
        .replace(/([A-Z]+)([A-Z][a-z])/g, "$1_$2")
        .toLowerCase();
}
