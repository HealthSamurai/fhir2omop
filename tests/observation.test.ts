import { test, expect, describe } from "bun:test";
import { mapObservation, routeObservation } from "../src/mapper/observation";
import type { Observation } from "../src/types/fhir";
import { MappingContext } from "../src/mapping-context";

function makeObservation(overrides: Partial<Observation> = {}): Observation {
  return {
    resourceType: "Observation",
    id: "obs-1",
    status: "final",
    category: [{ coding: [{ system: "http://terminology.hl7.org/CodeSystem/observation-category", code: "laboratory" }] }],
    code: { coding: [{ system: "http://loinc.org", code: "2339-0", display: "Glucose [Mass/volume] in Blood" }] },
    subject: { reference: "Patient/1" },
    effectiveDateTime: "2023-06-15T10:00:00Z",
    valueQuantity: { value: 95.0, unit: "mg/dL", system: "http://unitsofmeasure.org", code: "mg/dL" },
    ...overrides,
  };
}

// ============================================================
// Status filtering
// ============================================================

describe("Observation status filter", () => {
  test("final → mapped", () => {
    const result = mapObservation(makeObservation({ status: "final" }));
    expect(result.measurement).not.toBeNull();
  });

  test("amended → mapped", () => {
    const result = mapObservation(makeObservation({ status: "amended" }));
    expect(result.measurement).not.toBeNull();
  });

  test("corrected → mapped", () => {
    const result = mapObservation(makeObservation({ status: "corrected" }));
    expect(result.measurement).not.toBeNull();
  });

  test("preliminary → skipped", () => {
    const result = mapObservation(makeObservation({ status: "preliminary" }));
    expect(result.measurement).toBeNull();
    expect(result.observation).toBeNull();
  });

  test("cancelled → skipped", () => {
    const result = mapObservation(makeObservation({ status: "cancelled" }));
    expect(result.measurement).toBeNull();
    expect(result.observation).toBeNull();
  });

  test("entered-in-error → skipped", () => {
    const result = mapObservation(makeObservation({ status: "entered-in-error" }));
    expect(result.measurement).toBeNull();
    expect(result.observation).toBeNull();
  });
});

// ============================================================
// Domain routing
// ============================================================

describe("Observation domain routing", () => {
  test("laboratory category → measurement", () => {
    const route = routeObservation(makeObservation({
      category: [{ coding: [{ code: "laboratory" }] }],
    }));
    expect(route).toBe("measurement");
  });

  test("vital-signs category → measurement", () => {
    const route = routeObservation(makeObservation({
      category: [{ coding: [{ code: "vital-signs" }] }],
    }));
    expect(route).toBe("measurement");
  });

  test("social-history category → observation", () => {
    const route = routeObservation(makeObservation({
      category: [{ coding: [{ code: "social-history" }] }],
    }));
    expect(route).toBe("observation");
  });

  test("survey category → observation", () => {
    const route = routeObservation(makeObservation({
      category: [{ coding: [{ code: "survey" }] }],
    }));
    expect(route).toBe("observation");
  });

  test("no category → defaults to measurement", () => {
    const route = routeObservation(makeObservation({ category: undefined }));
    expect(route).toBe("measurement");
  });

  test("lab routes to measurement table (not observation)", () => {
    const result = mapObservation(makeObservation({
      category: [{ coding: [{ code: "laboratory" }] }],
    }));
    expect(result.measurement).not.toBeNull();
    expect(result.observation).toBeNull();
  });

  test("social-history routes to observation table (not measurement)", () => {
    const result = mapObservation(makeObservation({
      category: [{ coding: [{ code: "social-history" }] }],
    }));
    expect(result.measurement).toBeNull();
    expect(result.observation).not.toBeNull();
  });
});

// ============================================================
// Measurement field mapping
// ============================================================

describe("Observation → MEASUREMENT fields", () => {
  test("valueQuantity → value_as_number + unit", () => {
    const result = mapObservation(makeObservation({
      valueQuantity: { value: 120.5, unit: "mmHg" },
    }));
    expect(result.measurement!.value_as_number).toBe(120.5);
    expect(result.measurement!.unit_source_value).toBe("mmHg");
  });

  test("referenceRange → range_low/high", () => {
    const result = mapObservation(makeObservation({
      referenceRange: [{ low: { value: 70 }, high: { value: 100 } }],
    }));
    expect(result.measurement!.range_low).toBe(70);
    expect(result.measurement!.range_high).toBe(100);
  });

  test("effectiveDateTime → measurement_date", () => {
    const result = mapObservation(makeObservation({
      effectiveDateTime: "2023-06-15T10:00:00Z",
    }));
    expect(result.measurement!.measurement_date).toBe("2023-06-15");
    expect(result.measurement!.measurement_datetime).toBe("2023-06-15T10:00:00Z");
  });

  test("code → measurement_source_value", () => {
    const result = mapObservation(makeObservation());
    expect(result.measurement!.measurement_source_value).toBe("2339-0");
  });

  test("no effectiveDateTime → skipped", () => {
    const result = mapObservation(makeObservation({ effectiveDateTime: undefined }));
    expect(result.measurement).toBeNull();
    expect(result.observation).toBeNull();
  });

  test("no code → skipped", () => {
    const result = mapObservation(makeObservation({ code: { coding: [] } }));
    expect(result.measurement).toBeNull();
  });

  test("measurement_type_concept_id is 32817 (EHR)", () => {
    const result = mapObservation(makeObservation());
    expect(result.measurement!.measurement_type_concept_id).toBe(32817);
  });
});

// ============================================================
// Observation field mapping (social-history)
// ============================================================

describe("Observation → OBSERVATION fields", () => {
  test("valueString → value_as_string", () => {
    const result = mapObservation(makeObservation({
      category: [{ coding: [{ code: "social-history" }] }],
      valueQuantity: undefined,
      valueString: "Former smoker, quit 2020",
    }));
    expect(result.observation!.value_as_string).toBe("Former smoker, quit 2020");
  });

  test("observation_source_value from code", () => {
    const result = mapObservation(makeObservation({
      category: [{ coding: [{ code: "social-history" }] }],
    }));
    expect(result.observation!.observation_source_value).toBe("2339-0");
  });
});

// ============================================================
// References
// ============================================================

describe("Observation references", () => {
  test("subject → person_id", () => {
    const ctx = new MappingContext();
    const result = mapObservation(makeObservation({ subject: { reference: "Patient/42" } }), ctx);
    expect(result.measurement!.person_id).toBeGreaterThan(0);
  });

  test("encounter → visit_occurrence_id", () => {
    const ctx = new MappingContext();
    const result = mapObservation(makeObservation({ encounter: { reference: "Encounter/10" } }), ctx);
    expect(result.measurement!.visit_occurrence_id).toBeGreaterThan(0);
  });

  test("performer → provider_id", () => {
    const ctx = new MappingContext();
    const result = mapObservation(makeObservation({
      performer: [{ reference: "Practitioner/5" }],
    }), ctx);
    expect(result.measurement!.provider_id).toBeGreaterThan(0);
  });

  test("observation gets its own ID from registry", () => {
    const ctx = new MappingContext();
    const result = mapObservation(makeObservation({ id: "obs-uuid-456" }), ctx);
    expect(result.measurement!.measurement_id).toBeGreaterThan(0);
  });
});
