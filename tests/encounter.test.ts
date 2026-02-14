import { test, expect, describe } from "bun:test";
import { mapEncounter } from "../src/mapper/encounter";
import type { Encounter } from "../src/types/fhir";
import { MappingContext, IdRegistry } from "../src/mapping-context";

function makeEncounter(overrides: Partial<Encounter> = {}): Encounter {
  return {
    resourceType: "Encounter",
    id: "enc-1",
    status: "finished",
    class: { system: "http://terminology.hl7.org/CodeSystem/v3-ActCode", code: "AMB" },
    subject: { reference: "Patient/1" },
    period: { start: "2023-06-15T09:00:00Z", end: "2023-06-15T10:00:00Z" },
    ...overrides,
  };
}

// ============================================================
// Status filtering
// ============================================================

describe("Encounter status filter", () => {
  test("finished → mapped", () => {
    const result = mapEncounter(makeEncounter({ status: "finished" }));
    expect(result).not.toBeNull();
  });

  test("in-progress → mapped", () => {
    const result = mapEncounter(makeEncounter({ status: "in-progress" }));
    expect(result).not.toBeNull();
  });

  test("planned → skipped", () => {
    const result = mapEncounter(makeEncounter({ status: "planned" }));
    expect(result).toBeNull();
  });

  test("cancelled → skipped", () => {
    const result = mapEncounter(makeEncounter({ status: "cancelled" }));
    expect(result).toBeNull();
  });

  test("entered-in-error → skipped", () => {
    const result = mapEncounter(makeEncounter({ status: "entered-in-error" }));
    expect(result).toBeNull();
  });
});

// ============================================================
// Visit concept mapping (Encounter.class)
// ============================================================

describe("Encounter.class → visit_concept_id", () => {
  test("IMP (inpatient) → 9201", () => {
    const result = mapEncounter(makeEncounter({ class: { code: "IMP" } }));
    expect(result!.visit_concept_id).toBe(9201);
    expect(result!.visit_source_value).toBe("IMP");
  });

  test("AMB (ambulatory) → 9202", () => {
    const result = mapEncounter(makeEncounter({ class: { code: "AMB" } }));
    expect(result!.visit_concept_id).toBe(9202);
  });

  test("EMER (emergency) → 9203", () => {
    const result = mapEncounter(makeEncounter({ class: { code: "EMER" } }));
    expect(result!.visit_concept_id).toBe(9203);
  });

  test("HH (home health) → 581476", () => {
    const result = mapEncounter(makeEncounter({ class: { code: "HH" } }));
    expect(result!.visit_concept_id).toBe(581476);
  });

  test("unknown class code → 0", () => {
    const result = mapEncounter(makeEncounter({ class: { code: "CUSTOM" } }));
    expect(result!.visit_concept_id).toBe(0);
  });
});

// ============================================================
// Period mapping
// ============================================================

describe("Encounter.period → dates", () => {
  test("start and end dates extracted", () => {
    const result = mapEncounter(makeEncounter({
      period: { start: "2023-06-15T09:00:00Z", end: "2023-06-15T17:00:00Z" },
    }));
    expect(result!.visit_start_date).toBe("2023-06-15");
    expect(result!.visit_start_datetime).toBe("2023-06-15T09:00:00Z");
    expect(result!.visit_end_date).toBe("2023-06-15");
    expect(result!.visit_end_datetime).toBe("2023-06-15T17:00:00Z");
  });

  test("missing end date → uses start date", () => {
    const result = mapEncounter(makeEncounter({
      period: { start: "2023-06-15T09:00:00Z" },
    }));
    expect(result!.visit_end_date).toBe("2023-06-15");
    expect(result!.visit_end_datetime).toBeNull();
  });

  test("missing period → skipped", () => {
    const result = mapEncounter(makeEncounter({ period: undefined }));
    expect(result).toBeNull();
  });

  test("period without start → skipped", () => {
    const result = mapEncounter(makeEncounter({
      period: { end: "2023-06-15T17:00:00Z" },
    }));
    expect(result).toBeNull();
  });
});

// ============================================================
// References
// ============================================================

describe("Encounter references", () => {
  test("subject → person_id", () => {
    const ctx = new MappingContext();
    const result = mapEncounter(makeEncounter({ subject: { reference: "Patient/42" } }), ctx);
    expect(result!.person_id).toBeGreaterThan(0);
  });

  test("participant → provider_id", () => {
    const ctx = new MappingContext();
    const result = mapEncounter(makeEncounter({
      participant: [{ individual: { reference: "Practitioner/7" } }],
    }), ctx);
    expect(result!.provider_id).toBeGreaterThan(0);
  });

  test("serviceProvider → care_site_id", () => {
    const ctx = new MappingContext();
    const result = mapEncounter(makeEncounter({
      serviceProvider: { reference: "Organization/3" },
    }), ctx);
    expect(result!.care_site_id).toBeGreaterThan(0);
  });

  test("encounter gets its own ID from registry", () => {
    const ctx = new MappingContext();
    const result = mapEncounter(makeEncounter({ id: "enc-uuid-123" }), ctx);
    expect(result!.visit_occurrence_id).toBeGreaterThan(0);
  });
});

// ============================================================
// Hash mode integration
// ============================================================

describe("Encounter mapping with hash mode", () => {
  test("hash mode produces deterministic IDs across runs", () => {
    const enc = makeEncounter({ id: "enc-uuid-123" });
    const ctx1 = new MappingContext(new IdRegistry("hash"));
    const ctx2 = new MappingContext(new IdRegistry("hash"));
    const r1 = mapEncounter(enc, ctx1);
    const r2 = mapEncounter(enc, ctx2);
    expect(r1!.visit_occurrence_id).toBe(r2!.visit_occurrence_id);
    expect(r1!.person_id).toBe(r2!.person_id);
  });

  test("references resolve deterministically in hash mode", () => {
    const enc = makeEncounter({
      id: "enc-1",
      subject: { reference: "Patient/pt-uuid" },
      participant: [{ individual: { reference: "Practitioner/dr-uuid" } }],
      serviceProvider: { reference: "Organization/org-uuid" },
    });
    const ctx1 = new MappingContext(new IdRegistry("hash"));
    const ctx2 = new MappingContext(new IdRegistry("hash"));
    const r1 = mapEncounter(enc, ctx1);
    const r2 = mapEncounter(enc, ctx2);
    expect(r1!.person_id).toBe(r2!.person_id);
    expect(r1!.provider_id).toBe(r2!.provider_id);
    expect(r1!.care_site_id).toBe(r2!.care_site_id);
  });

  test("no collisions for typical encounter mapping", () => {
    const ctx = new MappingContext(new IdRegistry("hash"));
    for (let i = 0; i < 100; i++) {
      mapEncounter(makeEncounter({ id: `enc-${i}` }), ctx);
    }
    expect(ctx.ids.hasCollisions()).toBe(false);
  });
});

// ============================================================
// Type concept
// ============================================================

describe("Encounter type concept", () => {
  test("visit_type_concept_id is 32817 (EHR)", () => {
    const result = mapEncounter(makeEncounter());
    expect(result!.visit_type_concept_id).toBe(32817);
  });
});
