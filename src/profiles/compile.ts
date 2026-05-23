// Compile a FHIR StructureDefinition profile → a SQL WHERE clause that
// filters `fhir.<resource>.resource` (jsonb) to only the rows that
// satisfy the profile's `differential.element[].min` constraints.
//
// Scope (intentionally narrow):
//   - Each `differential.element` with `min >= 1` becomes a JSONB
//     existence predicate.
//   - Nested paths (Resource.a.b) walk via `->`/`?`.
//   - Polymorphic `field[x]` matches any `field<Type>` key.
//
// Out of scope: cardinality > 1, slicing, fixed[x], pattern[x], binding
// value-set membership (those need vocab joins). We deliberately don't
// "validate" — we filter to keep stage-1 simple. Anything stricter is
// the FHIR validator's job.
//
// Usage:
//   const where = compile(ctx, { profile, alias: "f" });
//   // "f.resource ? 'subject' AND f.resource ? 'code' AND ..."

export default function compile(
    _ctx: Context,
    opts: { profile: any; alias?: string },
): { whereSql: string; predicates: { path: string; sql: string }[] } {
    const alias = opts.alias ?? "f";
    const resourceCol = `${alias}.resource`;
    const elements = opts.profile?.differential?.element ?? [];
    const out: { path: string; sql: string }[] = [];

    for (const el of elements) {
        if (typeof el.min !== "number" || el.min < 1) continue;
        const path: string = el.path ?? "";
        if (!path.includes(".")) continue; // root element ("Condition") — nothing to check
        const segs = path.split(".").slice(1); // drop resource name
        out.push({ path, sql: predicateFor(resourceCol, segs) });
    }

    return {
        whereSql: out.length === 0 ? "TRUE" : out.map((p) => `(${p.sql})`).join(" AND "),
        predicates: out,
    };
}

function predicateFor(root: string, segs: string[]): string {
    // Walk to the parent of the last segment.
    let parent = root;
    for (let i = 0; i < segs.length - 1; i++) {
        parent = `${parent}->${sqlString(segs[i]!)}`;
    }
    const last = segs[segs.length - 1]!;
    // Choice type: field[x] → match any key starting with `field`
    const m = last.match(/^([a-zA-Z]+)\[x\]$/);
    if (m) {
        const base = m[1]!;
        return `EXISTS (SELECT 1 FROM jsonb_object_keys(${parent}) k WHERE k LIKE ${sqlString(base + "%")})`;
    }
    // Plain field: parent ? 'field'
    return `${parent} ? ${sqlString(last)}`;
}

function sqlString(s: string): string {
    return "'" + s.replace(/'/g, "''") + "'";
}
