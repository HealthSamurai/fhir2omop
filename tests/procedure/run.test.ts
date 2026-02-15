import { test, expect, describe } from "bun:test";
import { mapProcedure } from "../../src/mapper/procedure";
import type { Procedure } from "../../src/types/fhir";
import { MappingContext, IdRegistry } from "../../src/mapping-context";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

interface TestCase {
  description: string;
  comment?: string;
  spec?: string;
  fhir: Procedure[];
  omop: Record<string, unknown>[];
}

/** Load all JSON test files from tests/procedure/ */
function loadTestFiles(): { name: string; cases: TestCase[] }[] {
  const dir = join(import.meta.dir);
  const files = readdirSync(dir).filter((f) => f.endsWith(".json"));
  return files.map((f) => ({
    name: f.replace(".json", ""),
    cases: JSON.parse(readFileSync(join(dir, f), "utf-8")) as TestCase[],
  }));
}

/** Run the mapper on FHIR input and collect all OMOP records */
function mapFhirToOmop(fhirResources: Procedure[], mode?: "sequential" | "hash"): Record<string, unknown>[] {
  const ctx = new MappingContext(mode ? new IdRegistry(mode) : undefined);
  const results: Record<string, unknown>[] = [];

  for (const resource of fhirResources) {
    if (resource.resourceType === "Procedure") {
      const result = mapProcedure(resource, ctx);
      if (result) results.push({ table: "procedure_occurrence", ...result });
    }
  }

  return results;
}

/**
 * Check that actual OMOP records match expected.
 * Only fields specified in expected are checked (partial match).
 */
function assertOmopMatch(
  actual: Record<string, unknown>[],
  expected: Record<string, unknown>[],
  relaxIds = false,
) {
  const actualByTable = new Map<string, Record<string, unknown>[]>();
  for (const rec of actual) {
    const table = rec.table as string;
    if (!actualByTable.has(table)) actualByTable.set(table, []);
    actualByTable.get(table)!.push(rec);
  }

  const expectedByTable = new Map<string, Record<string, unknown>[]>();
  for (const rec of expected) {
    const table = rec.table as string;
    if (!expectedByTable.has(table)) expectedByTable.set(table, []);
    expectedByTable.get(table)!.push(rec);
  }

  for (const [table, expectedRecs] of expectedByTable) {
    const actualRecs = actualByTable.get(table);
    expect(actualRecs).toBeDefined();
    expect(actualRecs!.length).toBeGreaterThanOrEqual(expectedRecs.length);

    for (let i = 0; i < expectedRecs.length; i++) {
      const exp = expectedRecs[i];
      const act = actualRecs![i];
      expect(act).toBeDefined();

      for (const [key, value] of Object.entries(exp)) {
        if (key === "table") continue;
        if (relaxIds && value === "__POSITIVE_INT__") {
          expect(act[key]).toBeGreaterThan(0);
          continue;
        }
        expect(act[key]).toEqual(value);
      }
    }
  }

  if (expected.length === 0) {
    expect(actual.length).toBe(0);
  }
}

// Load and run all JSON test files
const testFiles = loadTestFiles();

for (const { name, cases } of testFiles) {
  describe(`procedure/${name}.json`, () => {
    for (const tc of cases) {
      test(tc.description, () => {
        const actual = mapFhirToOmop(tc.fhir);
        assertOmopMatch(actual, tc.omop);
      });
    }
  });
}

// ID fields where hash mode produces large integers instead of sequential 1,2,3...
const ID_FIELDS = new Set([
  "person_id", "provider_id", "care_site_id", "location_id",
  "visit_occurrence_id", "condition_occurrence_id",
  "measurement_id", "observation_id", "drug_exposure_id",
  "procedure_occurrence_id",
]);

// Also run all JSON tests with hash mode to verify compatibility
for (const { name, cases } of testFiles) {
  describe(`procedure/${name}.json (hash mode)`, () => {
    for (const tc of cases) {
      test(tc.description, () => {
        const actual = mapFhirToOmop(tc.fhir, "hash");
        const relaxedOmop = tc.omop.map((rec) => {
          const relaxed = { ...rec };
          for (const key of Object.keys(relaxed)) {
            if (ID_FIELDS.has(key) && typeof relaxed[key] === "number") {
              relaxed[key] = "__POSITIVE_INT__";
            }
          }
          return relaxed;
        });
        assertOmopMatch(actual, relaxedOmop, true);
      });
    }
  });
}
