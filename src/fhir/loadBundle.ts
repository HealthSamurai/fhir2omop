import { getSql } from "./connect";
import ensureTable from "./ensureTable";

// Load one FHIR Bundle (transaction or collection) from a JSON file. For each
// entry, the resource is inserted into fhir.<resourceType>. Existing rows are
// overwritten via ON CONFLICT DO UPDATE — re-running this is safe/idempotent.
export default async function (
    ctx: Context,
    opts: { path: string },
): Promise<{ inserted: number; skipped: number; byType: Record<string, number> }> {
    const text = await Bun.file(opts.path).text();
    const bundle = JSON.parse(text);

    // Accept either a Bundle wrapper or a top-level resource.
    const entries: any[] =
        bundle?.resourceType === "Bundle"
            ? (bundle.entry ?? []).map((e: any) => ({ resource: e.resource }))
            : [{ resource: bundle }];

    // Group by resourceType for one INSERT per type.
    const groups: Record<string, Array<{ id: string; resource: any }>> = {};
    let skipped = 0;
    for (const e of entries) {
        const r = e?.resource;
        if (!r?.resourceType || !r?.id) { skipped++; continue; }
        (groups[r.resourceType] ??= []).push({ id: r.id, resource: r });
    }

    const sql = getSql();
    let inserted = 0;
    const byType: Record<string, number> = {};
    for (const [rt, rows] of Object.entries(groups)) {
        const { table } = await ensureTable(ctx, { resourceType: rt });
        // Build VALUES inline (id text + resource as jsonb-encoded literal).
        // Postgres parses the inlined JSON via ::jsonb cast — this avoids the
        // double-encoding that happens when JSON strings go through Bun's
        // parameter binding.
        const escId = (s: string) => "'" + s.replace(/'/g, "''") + "'";
        const escJson = (o: any) => "'" + JSON.stringify(o).replace(/'/g, "''") + "'::jsonb";
        const tuples = rows.map((r) => `(${escId(r.id)}, ${escJson(r.resource)})`).join(",\n");
        const stmt =
            `INSERT INTO ${table} (id, resource) VALUES ${tuples} ` +
            `ON CONFLICT (id) DO UPDATE SET resource = excluded.resource`;
        await sql.unsafe(stmt);
        inserted += rows.length;
        byType[rt] = rows.length;
    }

    return { inserted, skipped, byType };
}
