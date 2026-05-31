// Golden test-case files relevant to a FHIR→OMOP edge (resource, table).
//
// A case file is relevant to edge (R, T) when its FHIR sources include R AND its
// asserted OMOP tables include T. This catches routing/fan-out too: a
// Condition file that asserts `observation` rows shows up on the
// Condition__observation edge page, not just Condition__condition_occurrence.
//
// fhirTypes/omopTables are the file-level aggregates computed by cases.load
// (fixtures' resourceTypes are folded into fhirTypes there).
export default async function (
    ctx: Context,
    opts: { resource: string; table: string },
): Promise<any[]> {
    const all = await ctx.fns.cases.load(ctx);
    const { resource, table } = opts;
    return all.filter(
        (f: any) =>
            !f.error &&
            (f.fhirTypes ?? []).includes(resource) &&
            (f.omopTables ?? []).includes(table),
    );
}
