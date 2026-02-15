import { test, expect, describe } from "bun:test";
import { mapAllergyIntolerance } from "../src/mapper/allergy-intolerance";
import type { AllergyIntolerance } from "../src/types/fhir";
import { MappingContext, IdRegistry } from "../src/mapping-context";

function makeAllergyIntolerance(overrides: Partial<AllergyIntolerance> = {}): AllergyIntolerance {
  return {
    resourceType: "AllergyIntolerance",
    id: "allergy-1",
    clinicalStatus: {
      coding: [{ system: "http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical", code: "active" }],
    },
    verificationStatus: {
      coding: [{ system: "http://terminology.hl7.org/CodeSystem/allergyintolerance-verification", code: "confirmed" }],
    },
    type: "allergy",
    code: {
      coding: [{ system: "http://snomed.info/sct", code: "387207008", display: "Ibuprofen" }],
    },
    patient: { reference: "Patient/1" },
    onsetDateTime: "2023-03-15",
    ...overrides,
  };
}

// ============================================================
// Status filtering
// ============================================================

describe("AllergyIntolerance status filter", () => {
  test("active + confirmed → mapped", () => {
    const result = mapAllergyIntolerance(makeAllergyIntolerance());
    expect(result).not.toBeNull();
  });

  test("inactive → skipped", () => {
    const result = mapAllergyIntolerance(makeAllergyIntolerance({
      clinicalStatus: { coding: [{ code: "inactive" }] },
    }));
    expect(result).toBeNull();
  });

  test("resolved → skipped", () => {
    const result = mapAllergyIntolerance(makeAllergyIntolerance({
      clinicalStatus: { coding: [{ code: "resolved" }] },
    }));
    expect(result).toBeNull();
  });

  test("entered-in-error → skipped", () => {
    const result = mapAllergyIntolerance(makeAllergyIntolerance({
      verificationStatus: { coding: [{ code: "entered-in-error" }] },
    }));
    expect(result).toBeNull();
  });

  test("refuted → skipped", () => {
    const result = mapAllergyIntolerance(makeAllergyIntolerance({
      verificationStatus: { coding: [{ code: "refuted" }] },
    }));
    expect(result).toBeNull();
  });

  test("no clinicalStatus → mapped (not required in FHIR)", () => {
    const result = mapAllergyIntolerance(makeAllergyIntolerance({
      clinicalStatus: undefined,
    }));
    expect(result).not.toBeNull();
  });

  test("no verificationStatus → mapped", () => {
    const result = mapAllergyIntolerance(makeAllergyIntolerance({
      verificationStatus: undefined,
    }));
    expect(result).not.toBeNull();
  });

  test("unconfirmed → mapped", () => {
    const result = mapAllergyIntolerance(makeAllergyIntolerance({
      verificationStatus: { coding: [{ code: "unconfirmed" }] },
    }));
    expect(result).not.toBeNull();
  });
});

// ============================================================
// Field mapping
// ============================================================

describe("AllergyIntolerance field mapping", () => {
  test("code → observation_source_value", () => {
    const result = mapAllergyIntolerance(makeAllergyIntolerance());
    expect(result!.observation_source_value).toBe("387207008");
  });

  test("onsetDateTime → observation_date", () => {
    const result = mapAllergyIntolerance(makeAllergyIntolerance({ onsetDateTime: "2023-03-15T10:00:00Z" }));
    expect(result!.observation_date).toBe("2023-03-15");
    expect(result!.observation_datetime).toBe("2023-03-15T10:00:00Z");
  });

  test("missing onsetDateTime → skipped", () => {
    const result = mapAllergyIntolerance(makeAllergyIntolerance({ onsetDateTime: undefined }));
    expect(result).toBeNull();
  });

  test("no code → skipped", () => {
    const result = mapAllergyIntolerance(makeAllergyIntolerance({ code: undefined }));
    expect(result).toBeNull();
  });

  test("type → qualifier_source_value", () => {
    const result = mapAllergyIntolerance(makeAllergyIntolerance({ type: "allergy" }));
    expect(result!.qualifier_source_value).toBe("allergy");
  });

  test("type intolerance → qualifier_source_value", () => {
    const result = mapAllergyIntolerance(makeAllergyIntolerance({ type: "intolerance" }));
    expect(result!.qualifier_source_value).toBe("intolerance");
  });

  test("no type → null qualifier_source_value", () => {
    const result = mapAllergyIntolerance(makeAllergyIntolerance({ type: undefined }));
    expect(result!.qualifier_source_value).toBeNull();
  });

  test("criticality → value_source_value", () => {
    const result = mapAllergyIntolerance(makeAllergyIntolerance({ criticality: "high" }));
    expect(result!.value_source_value).toBe("high");
  });

  test("observation_type_concept_id = 32817 (EHR)", () => {
    const result = mapAllergyIntolerance(makeAllergyIntolerance());
    expect(result!.observation_type_concept_id).toBe(32817);
  });

  test("observation_concept_id = 0 (placeholder)", () => {
    const result = mapAllergyIntolerance(makeAllergyIntolerance());
    expect(result!.observation_concept_id).toBe(0);
  });
});

// ============================================================
// Reaction mapping
// ============================================================

describe("AllergyIntolerance reaction → value_as_string", () => {
  test("single reaction manifestation", () => {
    const result = mapAllergyIntolerance(makeAllergyIntolerance({
      reaction: [{
        manifestation: [
          { coding: [{ code: "247472004", display: "Hives" }] },
        ],
      }],
    }));
    expect(result!.value_as_string).toBe("Hives");
  });

  test("multiple manifestations joined with semicolon", () => {
    const result = mapAllergyIntolerance(makeAllergyIntolerance({
      reaction: [{
        manifestation: [
          { coding: [{ code: "247472004", display: "Hives" }] },
          { coding: [{ code: "267036007", display: "Shortness of breath" }] },
        ],
      }],
    }));
    expect(result!.value_as_string).toBe("Hives; Shortness of breath");
  });

  test("manifestation text fallback", () => {
    const result = mapAllergyIntolerance(makeAllergyIntolerance({
      reaction: [{
        manifestation: [{ text: "Rash" }],
      }],
    }));
    expect(result!.value_as_string).toBe("Rash");
  });

  test("multiple reactions", () => {
    const result = mapAllergyIntolerance(makeAllergyIntolerance({
      reaction: [
        { manifestation: [{ coding: [{ display: "Hives" }] }] },
        { manifestation: [{ coding: [{ display: "Nausea" }] }] },
      ],
    }));
    expect(result!.value_as_string).toBe("Hives; Nausea");
  });

  test("no reaction → null value_as_string", () => {
    const result = mapAllergyIntolerance(makeAllergyIntolerance({ reaction: undefined }));
    expect(result!.value_as_string).toBeNull();
  });
});

// ============================================================
// References
// ============================================================

describe("AllergyIntolerance references", () => {
  test("patient → person_id", () => {
    const ctx = new MappingContext();
    const result = mapAllergyIntolerance(makeAllergyIntolerance({ patient: { reference: "Patient/42" } }), ctx);
    expect(result!.person_id).toBeGreaterThan(0);
  });

  test("encounter → visit_occurrence_id", () => {
    const ctx = new MappingContext();
    const result = mapAllergyIntolerance(makeAllergyIntolerance({ encounter: { reference: "Encounter/99" } }), ctx);
    expect(result!.visit_occurrence_id).toBeGreaterThan(0);
  });

  test("recorder → provider_id", () => {
    const ctx = new MappingContext();
    const result = mapAllergyIntolerance(makeAllergyIntolerance({ recorder: { reference: "Practitioner/5" } }), ctx);
    expect(result!.provider_id).toBeGreaterThan(0);
  });

  test("allergy gets its own ID from registry", () => {
    const ctx = new MappingContext();
    const result = mapAllergyIntolerance(makeAllergyIntolerance({ id: "allergy-abc-uuid" }), ctx);
    expect(result!.observation_id).toBeGreaterThan(0);
  });
});

// ============================================================
// Hash mode integration
// ============================================================

describe("AllergyIntolerance mapping with hash mode", () => {
  test("hash mode produces deterministic IDs across runs", () => {
    const allergy = makeAllergyIntolerance({ id: "allergy-uuid-123" });
    const ctx1 = new MappingContext(new IdRegistry("hash"));
    const ctx2 = new MappingContext(new IdRegistry("hash"));
    const r1 = mapAllergyIntolerance(allergy, ctx1);
    const r2 = mapAllergyIntolerance(allergy, ctx2);
    expect(r1!.observation_id).toBe(r2!.observation_id);
    expect(r1!.person_id).toBe(r2!.person_id);
  });

  test("references resolve deterministically in hash mode", () => {
    const allergy = makeAllergyIntolerance({
      id: "allergy-1",
      patient: { reference: "Patient/pt-uuid" },
      encounter: { reference: "Encounter/enc-uuid" },
      recorder: { reference: "Practitioner/dr-uuid" },
    });
    const ctx1 = new MappingContext(new IdRegistry("hash"));
    const ctx2 = new MappingContext(new IdRegistry("hash"));
    const r1 = mapAllergyIntolerance(allergy, ctx1);
    const r2 = mapAllergyIntolerance(allergy, ctx2);
    expect(r1!.person_id).toBe(r2!.person_id);
    expect(r1!.visit_occurrence_id).toBe(r2!.visit_occurrence_id);
    expect(r1!.provider_id).toBe(r2!.provider_id);
  });

  test("no collisions for typical allergy mapping", () => {
    const ctx = new MappingContext(new IdRegistry("hash"));
    for (let i = 0; i < 100; i++) {
      mapAllergyIntolerance(makeAllergyIntolerance({ id: `allergy-${i}` }), ctx);
    }
    expect(ctx.ids.hasCollisions()).toBe(false);
  });
});

// ============================================================
// Code prioritization
// ============================================================

describe("AllergyIntolerance code prioritization", () => {
  test("SNOMED preferred over RxNorm", () => {
    const result = mapAllergyIntolerance(makeAllergyIntolerance({
      code: {
        coding: [
          { system: "http://www.nlm.nih.gov/research/umls/rxnorm", code: "5640", display: "Ibuprofen" },
          { system: "http://snomed.info/sct", code: "387207008", display: "Ibuprofen" },
        ],
      },
    }));
    expect(result!.observation_source_value).toBe("387207008");
  });
});
