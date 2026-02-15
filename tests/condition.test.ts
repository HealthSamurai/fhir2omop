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

  test("remission → skipped", () => {
    const result = mapCondition(makeCondition({
      clinicalStatus: { coding: [{ code: "remission" }] },
    }));
    expect(result).toBeNull();
  });

  test("entered-in-error → skipped", () => {
    const result = mapCondition(makeCondition({
      verificationStatus: { coding: [{ code: "entered-in-error" }] },
    }));
    expect(result).toBeNull();
  });

  test("refuted → skipped", () => {
    const result = mapCondition(makeCondition({
      verificationStatus: { coding: [{ code: "refuted" }] },
    }));
    expect(result).toBeNull();
  });

  test("no clinicalStatus → mapped (status not required in FHIR)", () => {
    const result = mapCondition(makeCondition({
      clinicalStatus: undefined,
    }));
    expect(result).not.toBeNull();
  });

  test("no verificationStatus → mapped", () => {
    const result = mapCondition(makeCondition({
      verificationStatus: undefined,
    }));
    expect(result).not.toBeNull();
  });
});

// ============================================================
// Onset[x] handling
// ============================================================

describe("Condition onset[x] handling", () => {
  test("onsetDateTime → condition_start_date/datetime", () => {
    const result = mapCondition(makeCondition({ onsetDateTime: "2023-06-15T10:30:00Z" }));
    expect(result!.condition_start_date).toBe("2023-06-15");
    expect(result!.condition_start_datetime).toBe("2023-06-15T10:30:00Z");
  });

  test("onsetPeriod.start → condition_start_date/datetime", () => {
    const result = mapCondition(makeCondition({
      onsetDateTime: undefined,
      onsetPeriod: { start: "2023-03-01T08:00:00Z", end: "2023-03-10T08:00:00Z" },
    }));
    expect(result!.condition_start_date).toBe("2023-03-01");
    expect(result!.condition_start_datetime).toBe("2023-03-01T08:00:00Z");
  });

  test("recordedDate as fallback when no onset[x]", () => {
    const result = mapCondition(makeCondition({
      onsetDateTime: undefined,
      recordedDate: "2023-09-20",
    }));
    expect(result!.condition_start_date).toBe("2023-09-20");
    expect(result!.condition_start_datetime).toBe("2023-09-20");
  });

  test("onsetDateTime takes priority over onsetPeriod", () => {
    const result = mapCondition(makeCondition({
      onsetDateTime: "2023-01-15",
      onsetPeriod: { start: "2023-02-01" },
    }));
    expect(result!.condition_start_date).toBe("2023-01-15");
  });

  test("onsetDateTime takes priority over recordedDate", () => {
    const result = mapCondition(makeCondition({
      onsetDateTime: "2023-01-15",
      recordedDate: "2023-02-01",
    }));
    expect(result!.condition_start_date).toBe("2023-01-15");
  });

  test("onsetPeriod takes priority over recordedDate", () => {
    const result = mapCondition(makeCondition({
      onsetDateTime: undefined,
      onsetPeriod: { start: "2023-03-01" },
      recordedDate: "2023-04-01",
    }));
    expect(result!.condition_start_date).toBe("2023-03-01");
  });

  test("no onset and no recordedDate → skipped", () => {
    const result = mapCondition(makeCondition({
      onsetDateTime: undefined,
    }));
    expect(result).toBeNull();
  });

  test("date-only onset (no time) preserved in datetime", () => {
    const result = mapCondition(makeCondition({ onsetDateTime: "2023-01-10" }));
    expect(result!.condition_start_date).toBe("2023-01-10");
    expect(result!.condition_start_datetime).toBe("2023-01-10");
  });
});

// ============================================================
// Abatement[x] handling
// ============================================================

describe("Condition abatement[x] handling", () => {
  test("abatementDateTime → condition_end_date/datetime", () => {
    const result = mapCondition(makeCondition({ abatementDateTime: "2023-06-15T14:00:00Z" }));
    expect(result!.condition_end_date).toBe("2023-06-15");
    expect(result!.condition_end_datetime).toBe("2023-06-15T14:00:00Z");
  });

  test("abatementPeriod.end → condition_end_date/datetime", () => {
    const result = mapCondition(makeCondition({
      abatementPeriod: { start: "2023-05-01", end: "2023-06-30" },
    }));
    expect(result!.condition_end_date).toBe("2023-06-30");
    expect(result!.condition_end_datetime).toBe("2023-06-30");
  });

  test("abatementString → stop_reason (no end date)", () => {
    const result = mapCondition(makeCondition({ abatementString: "Resolved after treatment" }));
    expect(result!.stop_reason).toBe("Resolved after treatment");
    expect(result!.condition_end_date).toBeNull();
    expect(result!.condition_end_datetime).toBeNull();
  });

  test("no abatement → null end dates, null stop_reason", () => {
    const result = mapCondition(makeCondition());
    expect(result!.condition_end_date).toBeNull();
    expect(result!.condition_end_datetime).toBeNull();
    expect(result!.stop_reason).toBeNull();
  });

  test("abatementDateTime takes priority over abatementPeriod", () => {
    const result = mapCondition(makeCondition({
      abatementDateTime: "2023-06-15",
      abatementPeriod: { end: "2023-07-01" },
    }));
    expect(result!.condition_end_date).toBe("2023-06-15");
  });
});

// ============================================================
// Field mapping
// ============================================================

describe("Condition field mapping", () => {
  test("code → condition_source_value (best coding)", () => {
    const result = mapCondition(makeCondition());
    expect(result!.condition_source_value).toBe("73211009");
  });

  test("no code → skipped", () => {
    const result = mapCondition(makeCondition({ code: undefined }));
    expect(result).toBeNull();
  });

  test("empty code.coding → skipped", () => {
    const result = mapCondition(makeCondition({ code: { coding: [] } }));
    expect(result).toBeNull();
  });

  test("condition_concept_id is 0 (placeholder)", () => {
    const result = mapCondition(makeCondition());
    expect(result!.condition_concept_id).toBe(0);
  });

  test("condition_source_concept_id is 0 (placeholder)", () => {
    const result = mapCondition(makeCondition());
    expect(result!.condition_source_concept_id).toBe(0);
  });

  test("visit_detail_id is null", () => {
    const result = mapCondition(makeCondition());
    expect(result!.visit_detail_id).toBeNull();
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

  test("unknown category → default 32817 (EHR)", () => {
    const result = mapCondition(makeCondition({
      category: [{ coding: [{ code: "custom-category" }] }],
    }));
    expect(result!.condition_type_concept_id).toBe(32817);
  });
});

// ============================================================
// Status concept mapping
// ============================================================

describe("Condition.clinicalStatus → condition_status_concept_id", () => {
  test("active → 32902", () => {
    const result = mapCondition(makeCondition({
      clinicalStatus: { coding: [{ code: "active" }] },
    }));
    expect(result!.condition_status_concept_id).toBe(32902);
    expect(result!.condition_status_source_value).toBe("active");
  });

  test("recurrence → 32902", () => {
    const result = mapCondition(makeCondition({
      clinicalStatus: { coding: [{ code: "recurrence" }] },
    }));
    expect(result!.condition_status_concept_id).toBe(32902);
    expect(result!.condition_status_source_value).toBe("recurrence");
  });

  test("relapse → 32902", () => {
    const result = mapCondition(makeCondition({
      clinicalStatus: { coding: [{ code: "relapse" }] },
    }));
    expect(result!.condition_status_concept_id).toBe(32902);
    expect(result!.condition_status_source_value).toBe("relapse");
  });

  test("no clinicalStatus → 0", () => {
    const result = mapCondition(makeCondition({ clinicalStatus: undefined }));
    expect(result!.condition_status_concept_id).toBe(0);
    expect(result!.condition_status_source_value).toBeNull();
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

  test("asserter → provider_id (preferred over recorder)", () => {
    const ctx = new MappingContext();
    const result = mapCondition(makeCondition({
      asserter: { reference: "Practitioner/dr-assert" },
      recorder: { reference: "Practitioner/dr-record" },
    }), ctx);
    // provider_id should come from asserter
    const asserterId = ctx.ids.getId("Practitioner", "dr-assert");
    expect(result!.provider_id).toBe(asserterId);
  });

  test("recorder → provider_id (fallback when no asserter)", () => {
    const ctx = new MappingContext();
    const result = mapCondition(makeCondition({
      asserter: undefined,
      recorder: { reference: "Practitioner/dr-record" },
    }), ctx);
    const recorderId = ctx.ids.getId("Practitioner", "dr-record");
    expect(result!.provider_id).toBe(recorderId);
  });

  test("no asserter, no recorder → null provider_id", () => {
    const ctx = new MappingContext();
    const result = mapCondition(makeCondition({
      asserter: undefined,
    }), ctx);
    expect(result!.provider_id).toBeNull();
  });

  test("condition gets its own ID from registry", () => {
    const ctx = new MappingContext();
    const result = mapCondition(makeCondition({ id: "cond-abc-uuid" }), ctx);
    expect(result!.condition_occurrence_id).toBeGreaterThan(0);
  });

  test("missing subject → person_id 0", () => {
    const ctx = new MappingContext();
    const result = mapCondition(makeCondition({
      subject: {} as any,
    }), ctx);
    expect(result!.person_id).toBe(0);
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
  test("SNOMED preferred over ICD-10-CM", () => {
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

  test("ICD-10-CM preferred over ICD-10", () => {
    const result = mapCondition(makeCondition({
      code: {
        coding: [
          { system: "http://hl7.org/fhir/sid/icd-10", code: "E11", display: "Type 2 DM" },
          { system: "http://hl7.org/fhir/sid/icd-10-cm", code: "E11.9", display: "Type 2 DM without complications" },
        ],
      },
    }));
    expect(result!.condition_source_value).toBe("E11.9");
  });

  test("single code used directly", () => {
    const result = mapCondition(makeCondition({
      code: {
        coding: [{ system: "http://hl7.org/fhir/sid/icd-10-cm", code: "J06.9" }],
      },
    }));
    expect(result!.condition_source_value).toBe("J06.9");
  });

  test("code.text used when no coding code available", () => {
    const result = mapCondition(makeCondition({
      code: {
        coding: [{ system: "http://local.org", display: "Some condition" }],
        text: "Some condition",
      },
    }));
    // No code on the coding, falls through to text
    expect(result!.condition_source_value).toBe("Some condition");
  });
});

// ============================================================
// Full integration
// ============================================================

describe("Condition full integration", () => {
  test("complete condition with all fields", () => {
    const ctx = new MappingContext();
    const result = mapCondition({
      resourceType: "Condition",
      id: "cond-full",
      clinicalStatus: { coding: [{ system: "http://terminology.hl7.org/CodeSystem/condition-clinical", code: "active" }] },
      verificationStatus: { coding: [{ system: "http://terminology.hl7.org/CodeSystem/condition-ver-status", code: "confirmed" }] },
      category: [{ coding: [{ code: "encounter-diagnosis" }] }],
      severity: { coding: [{ system: "http://snomed.info/sct", code: "24484000", display: "Severe" }] },
      code: {
        coding: [
          { system: "http://snomed.info/sct", code: "73211009", display: "Diabetes mellitus" },
          { system: "http://hl7.org/fhir/sid/icd-10-cm", code: "E11.9" },
        ],
      },
      bodySite: [{ coding: [{ system: "http://snomed.info/sct", code: "181277001", display: "Pancreas" }] }],
      subject: { reference: "Patient/pt-1" },
      encounter: { reference: "Encounter/enc-1" },
      onsetDateTime: "2023-01-10T09:00:00Z",
      abatementDateTime: "2023-06-15T14:00:00Z",
      recordedDate: "2023-01-10",
      recorder: { reference: "Practitioner/dr-recorder" },
      asserter: { reference: "Practitioner/dr-asserter" },
    }, ctx);

    expect(result).not.toBeNull();
    expect(result!.condition_occurrence_id).toBeGreaterThan(0);
    expect(result!.person_id).toBeGreaterThan(0);
    expect(result!.condition_concept_id).toBe(0);
    expect(result!.condition_start_date).toBe("2023-01-10");
    expect(result!.condition_start_datetime).toBe("2023-01-10T09:00:00Z");
    expect(result!.condition_end_date).toBe("2023-06-15");
    expect(result!.condition_end_datetime).toBe("2023-06-15T14:00:00Z");
    expect(result!.condition_type_concept_id).toBe(32817);
    expect(result!.condition_status_concept_id).toBe(32902);
    expect(result!.condition_status_source_value).toBe("active");
    expect(result!.stop_reason).toBeNull();
    expect(result!.condition_source_value).toBe("73211009");
    expect(result!.condition_source_concept_id).toBe(0);
    expect(result!.visit_detail_id).toBeNull();
    // asserter is preferred over recorder
    const asserterId = ctx.ids.getId("Practitioner", "dr-asserter");
    expect(result!.provider_id).toBe(asserterId);
    expect(result!.visit_occurrence_id).toBeGreaterThan(0);
  });

  test("minimal condition (only code, subject, onsetDateTime)", () => {
    const ctx = new MappingContext();
    const result = mapCondition({
      resourceType: "Condition",
      id: "cond-minimal",
      code: { coding: [{ system: "http://snomed.info/sct", code: "386661006", display: "Fever" }] },
      subject: { reference: "Patient/pt-2" },
      onsetDateTime: "2024-03-01",
    }, ctx);

    expect(result).not.toBeNull();
    expect(result!.condition_start_date).toBe("2024-03-01");
    expect(result!.condition_end_date).toBeNull();
    expect(result!.condition_type_concept_id).toBe(32817);
    expect(result!.condition_status_concept_id).toBe(0);
    expect(result!.condition_status_source_value).toBeNull();
    expect(result!.stop_reason).toBeNull();
    expect(result!.provider_id).toBeNull();
    expect(result!.visit_occurrence_id).toBeNull();
    expect(result!.condition_source_value).toBe("386661006");
  });

  test("condition with recordedDate fallback and recorder", () => {
    const ctx = new MappingContext();
    const result = mapCondition({
      resourceType: "Condition",
      id: "cond-recorded",
      clinicalStatus: { coding: [{ code: "active" }] },
      code: { coding: [{ system: "http://hl7.org/fhir/sid/icd-10-cm", code: "J06.9" }] },
      subject: { reference: "Patient/pt-3" },
      recordedDate: "2024-01-15T12:00:00Z",
      recorder: { reference: "Practitioner/dr-1" },
    }, ctx);

    expect(result).not.toBeNull();
    expect(result!.condition_start_date).toBe("2024-01-15");
    expect(result!.condition_start_datetime).toBe("2024-01-15T12:00:00Z");
    const recorderId = ctx.ids.getId("Practitioner", "dr-1");
    expect(result!.provider_id).toBe(recorderId);
  });
});
