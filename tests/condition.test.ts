import { test, expect, describe } from "bun:test";
import { mapCondition } from "../src/mapper/condition";
import type { Condition } from "../src/types/fhir";
import { MappingContext, IdRegistry } from "../src/mapping-context";

function makeCondition(overrides: Partial<Condition> = {}): Condition {
  return {
    resourceType: "Condition",
    id: "cond-1",
    clinicalStatus: { coding: [{ system: "http://terminology.hl7.org/CodeSystem/condition-clinical", code: "active" }] },
    verificationStatus: { coding: [{ system: "http://terminology.hl7.org/CodeSystem/condition-ver-status", code: "confirmed" }] },
    code: {
      coding: [{ system: "http://snomed.info/sct", code: "73211009", display: "Diabetes mellitus" }],
    },
    subject: { reference: "Patient/1" },
    onsetDateTime: "2023-01-10",
    ...overrides,
  };
}

// ============================================================
// Status filtering
// ============================================================

describe("Condition status filter", () => {
  test("active + confirmed → mapped", () => {
    const result = mapCondition(makeCondition());
    expect(result).not.toBeNull();
  });

  test("recurrence → mapped", () => {
    const result = mapCondition(makeCondition({
      clinicalStatus: { coding: [{ code: "recurrence" }] },
    }));
    expect(result).not.toBeNull();
  });

  test("relapse → mapped", () => {
    const result = mapCondition(makeCondition({
      clinicalStatus: { coding: [{ code: "relapse" }] },
    }));
    expect(result).not.toBeNull();
  });

  test("inactive → skipped", () => {
    const result = mapCondition(makeCondition({
      clinicalStatus: { coding: [{ code: "inactive" }] },
    }));
    expect(result).toBeNull();
  });

  test("resolved → skipped", () => {
    const result = mapCondition(makeCondition({
      clinicalStatus: { coding: [{ code: "resolved" }] },
    }));
    expect(result).toBeNull();
  });

  test("entered-in-error → skipped", () => {
    const result = mapCondition(makeCondition({
      verificationStatus: { coding: [{ code: "entered-in-error" }] },
    }));
    expect(result).toBeNull();
  });

  test("no clinicalStatus → mapped (status not required in FHIR)", () => {
    const result = mapCondition(makeCondition({
      clinicalStatus: undefined,
    }));
    expect(result).not.toBeNull();
  });
});

// ============================================================
// Field mapping
// ============================================================

describe("Condition field mapping", () => {
  test("code → condition_source_value", () => {
    const result = mapCondition(makeCondition());
    expect(result!.condition_source_value).toBe("73211009");
  });

  test("onsetDateTime → condition_start_date", () => {
    const result = mapCondition(makeCondition({ onsetDateTime: "2023-01-10T09:00:00Z" }));
    expect(result!.condition_start_date).toBe("2023-01-10");
    expect(result!.condition_start_datetime).toBe("2023-01-10T09:00:00Z");
  });

  test("abatementDateTime → condition_end_date", () => {
    const result = mapCondition(makeCondition({ abatementDateTime: "2023-06-15T14:00:00Z" }));
    expect(result!.condition_end_date).toBe("2023-06-15");
    expect(result!.condition_end_datetime).toBe("2023-06-15T14:00:00Z");
  });

  test("no abatement → null end date", () => {
    const result = mapCondition(makeCondition({ abatementDateTime: undefined }));
    expect(result!.condition_end_date).toBeNull();
  });

  test("abatementString → stop_reason", () => {
    const result = mapCondition(makeCondition({ abatementString: "Resolved after treatment" }));
    expect(result!.stop_reason).toBe("Resolved after treatment");
  });

  test("missing onsetDateTime → skipped (no start date)", () => {
    const result = mapCondition(makeCondition({ onsetDateTime: undefined }));
    expect(result).toBeNull();
  });

  test("no code → skipped", () => {
    const result = mapCondition(makeCondition({ code: undefined }));
    expect(result).toBeNull();
  });
});

// ============================================================
// Type concept from category
// ============================================================

describe("Condition.category → condition_type_concept_id", () => {
  test("problem-list-item → 32840", () => {
    const result = mapCondition(makeCondition({
      category: [{ coding: [{ code: "problem-list-item" }] }],
    }));
    expect(result!.condition_type_concept_id).toBe(32840);
  });

  test("encounter-diagnosis → 32817", () => {
    const result = mapCondition(makeCondition({
      category: [{ coding: [{ code: "encounter-diagnosis" }] }],
    }));
    expect(result!.condition_type_concept_id).toBe(32817);
  });

  test("no category → default 32817 (EHR)", () => {
    const result = mapCondition(makeCondition({ category: undefined }));
    expect(result!.condition_type_concept_id).toBe(32817);
  });
});

// ============================================================
// References
// ============================================================

describe("Condition references", () => {
  test("subject → person_id", () => {
    const ctx = new MappingContext();
    const result = mapCondition(makeCondition({ subject: { reference: "Patient/42" } }), ctx);
    expect(result!.person_id).toBeGreaterThan(0);
  });

  test("encounter → visit_occurrence_id", () => {
    const ctx = new MappingContext();
    const result = mapCondition(makeCondition({ encounter: { reference: "Encounter/99" } }), ctx);
    expect(result!.visit_occurrence_id).toBeGreaterThan(0);
  });

  test("asserter → provider_id", () => {
    const ctx = new MappingContext();
    const result = mapCondition(makeCondition({ asserter: { reference: "Practitioner/5" } }), ctx);
    expect(result!.provider_id).toBeGreaterThan(0);
  });

  test("condition gets its own ID from registry", () => {
    const ctx = new MappingContext();
    const result = mapCondition(makeCondition({ id: "cond-abc-uuid" }), ctx);
    expect(result!.condition_occurrence_id).toBeGreaterThan(0);
  });
});

// ============================================================
// Hash mode integration
// ============================================================

describe("Condition mapping with hash mode", () => {
  test("hash mode produces deterministic IDs across runs", () => {
    const cond = makeCondition({ id: "cond-uuid-123" });
    const ctx1 = new MappingContext(new IdRegistry("hash"));
    const ctx2 = new MappingContext(new IdRegistry("hash"));
    const r1 = mapCondition(cond, ctx1);
    const r2 = mapCondition(cond, ctx2);
    expect(r1!.condition_occurrence_id).toBe(r2!.condition_occurrence_id);
    expect(r1!.person_id).toBe(r2!.person_id);
  });

  test("references resolve deterministically in hash mode", () => {
    const cond = makeCondition({
      id: "cond-1",
      subject: { reference: "Patient/pt-uuid" },
      encounter: { reference: "Encounter/enc-uuid" },
      asserter: { reference: "Practitioner/dr-uuid" },
    });
    const ctx1 = new MappingContext(new IdRegistry("hash"));
    const ctx2 = new MappingContext(new IdRegistry("hash"));
    const r1 = mapCondition(cond, ctx1);
    const r2 = mapCondition(cond, ctx2);
    expect(r1!.person_id).toBe(r2!.person_id);
    expect(r1!.visit_occurrence_id).toBe(r2!.visit_occurrence_id);
    expect(r1!.provider_id).toBe(r2!.provider_id);
  });

  test("no collisions for typical condition mapping", () => {
    const ctx = new MappingContext(new IdRegistry("hash"));
    for (let i = 0; i < 100; i++) {
      mapCondition(makeCondition({ id: `cond-${i}` }), ctx);
    }
    expect(ctx.ids.hasCollisions()).toBe(false);
  });
});

// ============================================================
// Code prioritization
// ============================================================

describe("Condition code prioritization", () => {
  test("SNOMED preferred over ICD-10", () => {
    const result = mapCondition(makeCondition({
      code: {
        coding: [
          { system: "http://hl7.org/fhir/sid/icd-10-cm", code: "E11.9", display: "Type 2 DM" },
          { system: "http://snomed.info/sct", code: "73211009", display: "Diabetes mellitus" },
        ],
      },
    }));
    expect(result!.condition_source_value).toBe("73211009");
  });
});
