import { resolve } from "node:path";
import { parse } from "csv-parse/sync";

// One row per cdmFieldName for the given OMOP table.
//
//   ctx.fns.omop.byTable(ctx, { name: "person" })
//     → [{ name, type, required, isPrimaryKey, isForeignKey,
//          fkTable, fkField, fkDomain, fkClass,
//          userGuidance, etlConventions }, ...]
//
// Source: CommonDataModel/inst/csv/OMOP_CDMv5.4_Field_Level.csv
// Cached on ctx.state.omopFields (parsed once per server lifetime).
export default async function (
    ctx: Context,
    opts: { name: string },
): Promise<types.omop.Field[]> {
    const all = await loadAll(ctx);
    const want = opts.name.toLowerCase();
    return all.filter((f) => f.table.toLowerCase() === want);
}

async function loadAll(ctx: Context): Promise<types.omop.Field[]> {
    const cached = (ctx.state as any).omopFields as types.omop.Field[] | undefined;
    if (cached) return cached;

    const path = resolve(import.meta.dir, "..", "..", "CommonDataModel",
        "inst", "csv", "OMOP_CDMv5.4_Field_Level.csv");
    const text = await Bun.file(path).text();
    const rows = parse(text, { columns: true, skip_empty_lines: true, relax_column_count: true }) as any[];

    const fields: types.omop.Field[] = rows.map((r) => ({
        table:          r.cdmTableName,
        name:           r.cdmFieldName,
        type:           r.cdmDatatype,
        required:       r.isRequired === "Yes",
        isPrimaryKey:   r.isPrimaryKey === "Yes",
        isForeignKey:   r.isForeignKey === "Yes",
        fkTable:        r.fkTableName !== "NA" ? r.fkTableName : undefined,
        fkField:        r.fkFieldName !== "NA" ? r.fkFieldName : undefined,
        fkDomain:       r.fkDomain    !== "NA" ? r.fkDomain    : undefined,
        fkClass:        r.fkClass     !== "NA" ? r.fkClass     : undefined,
        userGuidance:   r.userGuidance || undefined,
        etlConventions: r.etlConventions || undefined,
    }));

    (ctx.state as any).omopFields = fields;
    return fields;
}
