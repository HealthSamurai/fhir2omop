import { test, expect } from "bun:test";
import compile from "./compile";

const ctx = {} as Context;

test("min:1 fields → resource ? 'field' predicates", () => {
    const profile = {
        differential: {
            element: [
                { path: "Condition.code",    min: 1 },
                { path: "Condition.subject", min: 1 },
            ],
        },
    };
    const r = compile(ctx, { profile });
    expect(r.predicates.map((p) => p.path)).toEqual(["Condition.code", "Condition.subject"]);
    expect(r.whereSql).toBe(`(f.resource ? 'code') AND (f.resource ? 'subject')`);
});

test("choice type onset[x] → key prefix match", () => {
    const profile = {
        differential: {
            element: [{ path: "Condition.onset[x]", min: 1 }],
        },
    };
    const r = compile(ctx, { profile });
    expect(r.whereSql).toBe(
        `(EXISTS (SELECT 1 FROM jsonb_object_keys(f.resource) k WHERE k LIKE 'onset%'))`,
    );
});

test("nested path Resource.a.b → resource->'a' ? 'b'", () => {
    const profile = {
        differential: {
            element: [{ path: "Observation.subject.reference", min: 1 }],
        },
    };
    const r = compile(ctx, { profile });
    expect(r.whereSql).toBe(`(f.resource->'subject' ? 'reference')`);
});

test("custom alias is honored", () => {
    const profile = {
        differential: {
            element: [{ path: "Patient.name", min: 1 }],
        },
    };
    const r = compile(ctx, { profile, alias: "x" });
    expect(r.whereSql).toBe(`(x.resource ? 'name')`);
});

test("min < 1 elements are ignored", () => {
    const profile = {
        differential: {
            element: [
                { path: "Patient.name",   min: 0 },
                { path: "Patient.gender",          },  // no min
                { path: "Patient.birthDate", min: 1 },
            ],
        },
    };
    const r = compile(ctx, { profile });
    expect(r.predicates).toHaveLength(1);
    expect(r.predicates[0]!.path).toBe("Patient.birthDate");
});

test("empty profile → TRUE", () => {
    const r = compile(ctx, { profile: { differential: { element: [] } } });
    expect(r.whereSql).toBe("TRUE");
});
