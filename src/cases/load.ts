// Load FHIR→OMOP golden test cases from the top-level cases/*.json directory.
// No cache — reads from disk on every call so edits show up without a restart
// (same policy as profiles.load). Each case file is:
//   { title, notes, fhir: [resources], omop: [expected rows tagged with .table] }
import { readdirSync } from "node:fs";

export default async function (ctx: Context): Promise<any[]> {
    const dir = "cases";
    let files: string[] = [];
    try {
        files = readdirSync(dir).filter((f) => f.endsWith(".json")).sort();
    } catch {
        return [];
    }

    const out: any[] = [];
    for (const f of files) {
        const slug = f.replace(/\.json$/, "");
        try {
            const raw = JSON.parse(await Bun.file(`${dir}/${f}`).text());
            const fhir = Array.isArray(raw.fhir) ? raw.fhir : [];
            const omop = Array.isArray(raw.omop) ? raw.omop : [];
            const fhirTypes = [...new Set(fhir.map((r: any) => r?.resourceType).filter(Boolean))];
            const omopTables = [...new Set(omop.map((r: any) => r?.table).filter(Boolean))];
            out.push({
                slug, file: f,
                title: raw.title ?? slug,
                notes: raw.notes ?? "",
                fhir, omop, fhirTypes, omopTables,
                omopRows: omop.length,
            });
        } catch (e: any) {
            out.push({
                slug, file: f, title: slug, notes: "",
                fhir: [], omop: [], fhirTypes: [], omopTables: [], omopRows: 0,
                error: e?.message ?? String(e),
            });
        }
    }
    return out;
}
