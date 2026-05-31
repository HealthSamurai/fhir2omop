// Load FHIR→OMOP golden test cases from the top-level cases/*.json directory.
// No cache — reads disk on every call so edits show without restart.
//
// Each file is a BRANCH (feature) holding variants:
//   { title, notes, cases: [ { desc, fhir: [resources], omop: { <table>: [rows] } } ] }
//
// Also accepts the older single-case shape ({ title, notes, fhir, omop: [rows] })
// and normalizes it, so the viewer works across the transition.
import { readdirSync } from "node:fs";

function omopToByTable(omop: any): Record<string, any[]> {
    if (!omop) return {};
    if (Array.isArray(omop)) {
        // old shape: flat array, each row tagged with .table
        const out: Record<string, any[]> = {};
        for (const row of omop) {
            const t = row?.table ?? "(untagged)";
            const { table, ...rest } = row ?? {};
            (out[t] ??= []).push(rest);
        }
        return out;
    }
    return omop; // new shape: already { table: [rows] }
}

function variantMeta(v: any) {
    const fhir = Array.isArray(v.fhir) ? v.fhir : [];
    const fhirTypes = [...new Set(fhir.map((r: any) => r?.resourceType).filter(Boolean))];
    const omopByTable = omopToByTable(v.omop);
    const omopTables = Object.keys(omopByTable);
    const omopRows = omopTables.reduce((n, t) => n + (omopByTable[t]?.length ?? 0), 0);
    return { ...v, fhir, fhirTypes, omopByTable, omopTables, omopRows };
}

export default async function (ctx: Context): Promise<any[]> {
    const dir = "cases";
    let files: string[] = [];
    try {
        files = readdirSync(dir).filter((f) => f.endsWith(".json")).sort();
    } catch {
        return [];
    }

    // Last `bun script/run-cases.ts` results, if any → per-variant pass/fail.
    let runResults: Record<string, any> = {};
    let ranAt: string | null = null;
    try {
        const rr = JSON.parse(await Bun.file(".hyper/_runtime/case-results.json").text());
        runResults = rr.files ?? {};
        ranAt = rr.ranAt ?? null;
    } catch { /* not run yet */ }

    const out: any[] = [];
    for (const f of files) {
        const slug = f.replace(/\.json$/, "");
        try {
            const raw = JSON.parse(await Bun.file(`${dir}/${f}`).text());
            const rawCases = Array.isArray(raw.cases)
                ? raw.cases
                : [{ desc: raw.title ?? slug, fhir: raw.fhir, omop: raw.omop }];
            const cases = rawCases.map(variantMeta);
            // attach run results by variant index
            const fileRes = runResults[slug]?.variants ?? [];
            cases.forEach((c: any, i: number) => { c.result = fileRes[i] ?? null; });
            const ran = cases.filter((c: any) => c.result);
            const status = ran.length === 0 ? "unrun"
                : ran.every((c: any) => c.result.pass) ? "pass" : "fail";
            const passCount = ran.filter((c: any) => c.result.pass).length;
            const fixtures = Array.isArray(raw.fixtures) ? raw.fixtures : [];
            const fixtureTypes = [...new Set(fixtures.map((r: any) => r?.resourceType).filter(Boolean))];
            const fhirTypes = [...new Set([...fixtureTypes, ...cases.flatMap((c: any) => c.fhirTypes)])];
            const omopTables = [...new Set(cases.flatMap((c: any) => c.omopTables))];
            out.push({
                slug, file: f,
                title: raw.title ?? slug,
                notes: raw.notes ?? "",
                fixtures, cases, fhirTypes, omopTables,
                variantCount: cases.length,
                status, passCount, ranCount: ran.length, ranAt,
            });
        } catch (e: any) {
            out.push({
                slug, file: f, title: slug, notes: "",
                cases: [], fhirTypes: [], omopTables: [], variantCount: 0,
                error: e?.message ?? String(e),
            });
        }
    }
    return out;
}
