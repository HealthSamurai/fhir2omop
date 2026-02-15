import { test, expect, describe } from "bun:test";
import { mapObservation, routeObservation } from "../src/mapper/observation";
import type { Observation } from "../src/types/fhir";
import type { Measurement, OmopObservation } from "../src/types/omop";
import { MappingContext, IdRegistry } from "../src/mapping-context";

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
    const m = result.measurement as Measurement;
    expect(m.value_as_number).toBe(120.5);
    expect(m.unit_source_value).toBe("mmHg");
  });

  test("referenceRange → range_low/high", () => {
    const result = mapObservation(makeObservation({
      referenceRange: [{ low: { value: 70 }, high: { value: 100 } }],
    }));
    const m = result.measurement as Measurement;
    expect(m.range_low).toBe(70);
    expect(m.range_high).toBe(100);
  });

  test("effectiveDateTime → measurement_date", () => {
    const result = mapObservation(makeObservation({
      effectiveDateTime: "2023-06-15T10:00:00Z",
    }));
    const m = result.measurement as Measurement;
    expect(m.measurement_date).toBe("2023-06-15");
    expect(m.measurement_datetime).toBe("2023-06-15T10:00:00Z");
  });

  test("code → measurement_source_value", () => {
    const result = mapObservation(makeObservation());
    const m = result.measurement as Measurement;
    expect(m.measurement_source_value).toBe("2339-0");
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
    const m = result.measurement as Measurement;
    expect(m.measurement_type_concept_id).toBe(32817);
  });

  test("value_source_value captures raw value string", () => {
    const result = mapObservation(makeObservation({
      valueQuantity: { value: 95.0, unit: "mg/dL" },
    }));
    const m = result.measurement as Measurement;
    expect(m.value_source_value).toBe("95 mg/dL");
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
    const o = result.observation as OmopObservation;
    expect(o.value_as_string).toBe("Former smoker, quit 2020");
  });

  test("observation_source_value from code", () => {
    const result = mapObservation(makeObservation({
      category: [{ coding: [{ code: "social-history" }] }],
    }));
    const o = result.observation as OmopObservation;
    expect(o.observation_source_value).toBe("2339-0");
  });

  test("valueCodeableConcept → value_as_string (source text)", () => {
    const result = mapObservation(makeObservation({
      category: [{ coding: [{ code: "social-history" }] }],
      valueQuantity: undefined,
      valueCodeableConcept: { coding: [{ system: "http://snomed.info/sct", code: "8517006", display: "Former smoker" }], text: "Former smoker" },
    }));
    const o = result.observation as OmopObservation;
    expect(o.value_as_string).toBe("8517006");
  });

  test("value_source_value for observation with valueString", () => {
    const result = mapObservation(makeObservation({
      category: [{ coding: [{ code: "social-history" }] }],
      valueQuantity: undefined,
      valueString: "Never smoker",
    }));
    const o = result.observation as OmopObservation;
    expect(o.value_source_value).toBe("Never smoker");
  });
});

// ============================================================
// Operator concept (comparators)
// ============================================================

describe("Observation operator_concept_id", () => {
  test("< comparator → 4171756", () => {
    const result = mapObservation(makeObservation({
      valueQuantity: { value: 10, comparator: "<", unit: "mg/dL" },
    }));
    const m = result.measurement as Measurement;
    expect(m.operator_concept_id).toBe(4171756);
  });

  test("<= comparator → 4171754", () => {
    const result = mapObservation(makeObservation({
      valueQuantity: { value: 10, comparator: "<=", unit: "mg/dL" },
    }));
    const m = result.measurement as Measurement;
    expect(m.operator_concept_id).toBe(4171754);
  });

  test(">= comparator → 4171755", () => {
    const result = mapObservation(makeObservation({
      valueQuantity: { value: 100, comparator: ">=", unit: "mg/dL" },
    }));
    const m = result.measurement as Measurement;
    expect(m.operator_concept_id).toBe(4171755);
  });

  test("> comparator → 4172703", () => {
    const result = mapObservation(makeObservation({
      valueQuantity: { value: 100, comparator: ">", unit: "mg/dL" },
    }));
    const m = result.measurement as Measurement;
    expect(m.operator_concept_id).toBe(4172703);
  });

  test("no comparator → null operator_concept_id", () => {
    const result = mapObservation(makeObservation({
      valueQuantity: { value: 95, unit: "mg/dL" },
    }));
    const m = result.measurement as Measurement;
    expect(m.operator_concept_id).toBeNull();
  });

  test("value_source_value includes comparator", () => {
    const result = mapObservation(makeObservation({
      valueQuantity: { value: 10, comparator: "<", unit: "mg/dL" },
    }));
    const m = result.measurement as Measurement;
    expect(m.value_source_value).toBe("<10 mg/dL");
  });
});

// ============================================================
// Interpretation → qualifier
// ============================================================

describe("Observation interpretation → qualifier", () => {
  test("interpretation code → qualifier_source_value (observation route)", () => {
    const result = mapObservation(makeObservation({
      category: [{ coding: [{ code: "social-history" }] }],
      interpretation: [{ coding: [{ system: "http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation", code: "H", display: "High" }] }],
    }));
    const o = result.observation as OmopObservation;
    expect(o.qualifier_source_value).toBe("H");
  });

  test("no interpretation → null qualifier_source_value", () => {
    const result = mapObservation(makeObservation({
      category: [{ coding: [{ code: "social-history" }] }],
    }));
    const o = result.observation as OmopObservation;
    expect(o.qualifier_source_value).toBeNull();
  });
});

// ============================================================
// Component observations (e.g., blood pressure)
// ============================================================

describe("Observation components", () => {
  const bpObservation = makeObservation({
    id: "bp-1",
    category: [{ coding: [{ code: "vital-signs" }] }],
    code: { coding: [{ system: "http://loinc.org", code: "85354-9", display: "Blood pressure panel" }] },
    valueQuantity: undefined,
    component: [
      {
        code: { coding: [{ system: "http://loinc.org", code: "8480-6", display: "Systolic blood pressure" }] },
        valueQuantity: { value: 120, unit: "mmHg" },
      },
      {
        code: { coding: [{ system: "http://loinc.org", code: "8462-4", display: "Diastolic blood pressure" }] },
        valueQuantity: { value: 80, unit: "mmHg" },
      },
    ],
  });

  test("blood pressure produces array of 2 measurements", () => {
    const result = mapObservation(bpObservation);
    expect(Array.isArray(result.measurement)).toBe(true);
    const measurements = result.measurement as Measurement[];
    expect(measurements).toHaveLength(2);
    expect(result.observation).toBeNull();
  });

  test("component measurements have individual codes", () => {
    const result = mapObservation(bpObservation);
    const measurements = result.measurement as Measurement[];
    expect(measurements[0].measurement_source_value).toBe("8480-6");
    expect(measurements[1].measurement_source_value).toBe("8462-4");
  });

  test("component measurements have individual values", () => {
    const result = mapObservation(bpObservation);
    const measurements = result.measurement as Measurement[];
    expect(measurements[0].value_as_number).toBe(120);
    expect(measurements[0].unit_source_value).toBe("mmHg");
    expect(measurements[1].value_as_number).toBe(80);
    expect(measurements[1].unit_source_value).toBe("mmHg");
  });

  test("component measurements get unique IDs", () => {
    const ctx = new MappingContext();
    const result = mapObservation(bpObservation, ctx);
    const measurements = result.measurement as Measurement[];
    expect(measurements[0].measurement_id).not.toBe(measurements[1].measurement_id);
  });

  test("component measurements share person_id and visit references", () => {
    const obs = makeObservation({
      ...bpObservation,
      subject: { reference: "Patient/42" },
      encounter: { reference: "Encounter/10" },
    });
    const ctx = new MappingContext();
    const result = mapObservation(obs, ctx);
    const measurements = result.measurement as Measurement[];
    expect(measurements[0].person_id).toBe(measurements[1].person_id);
    expect(measurements[0].visit_occurrence_id).toBe(measurements[1].visit_occurrence_id);
  });

  test("single component returns single measurement (not array)", () => {
    const obs = makeObservation({
      id: "single-comp",
      category: [{ coding: [{ code: "vital-signs" }] }],
      code: { coding: [{ system: "http://loinc.org", code: "8310-5", display: "Body temperature" }] },
      valueQuantity: undefined,
      component: [
        {
          code: { coding: [{ system: "http://loinc.org", code: "8310-5", display: "Body temperature" }] },
          valueQuantity: { value: 37.0, unit: "Cel" },
        },
      ],
    });
    const result = mapObservation(obs);
    expect(result.measurement).not.toBeNull();
    expect(Array.isArray(result.measurement)).toBe(false);
  });

  test("component with no code is skipped", () => {
    const obs = makeObservation({
      id: "comp-nocode",
      component: [
        { code: { coding: [] }, valueQuantity: { value: 120, unit: "mmHg" } },
        { code: { coding: [{ system: "http://loinc.org", code: "8462-4" }] }, valueQuantity: { value: 80, unit: "mmHg" } },
      ],
    });
    const result = mapObservation(obs);
    // Only one valid component
    expect(result.measurement).not.toBeNull();
    expect(Array.isArray(result.measurement)).toBe(false);
  });

  test("social-history components route to observation table", () => {
    const obs = makeObservation({
      id: "survey-comp",
      category: [{ coding: [{ code: "survey" }] }],
      valueQuantity: undefined,
      component: [
        { code: { coding: [{ system: "http://loinc.org", code: "1234-5" }] }, valueString: "Answer 1" },
        { code: { coding: [{ system: "http://loinc.org", code: "1234-6" }] }, valueString: "Answer 2" },
      ],
    });
    const result = mapObservation(obs);
    expect(result.measurement).toBeNull();
    expect(Array.isArray(result.observation)).toBe(true);
    const observations = result.observation as OmopObservation[];
    expect(observations).toHaveLength(2);
  });

  test("component referenceRange maps to range_low/high", () => {
    const obs = makeObservation({
      id: "comp-range",
      component: [
        {
          code: { coding: [{ system: "http://loinc.org", code: "8480-6" }] },
          valueQuantity: { value: 120, unit: "mmHg" },
          referenceRange: [{ low: { value: 90 }, high: { value: 140 } }],
        },
      ],
    });
    const result = mapObservation(obs);
    const m = result.measurement as Measurement;
    expect(m.range_low).toBe(90);
    expect(m.range_high).toBe(140);
  });
});

// ============================================================
// References
// ============================================================

describe("Observation references", () => {
  test("subject → person_id", () => {
    const ctx = new MappingContext();
    const result = mapObservation(makeObservation({ subject: { reference: "Patient/42" } }), ctx);
    const m = result.measurement as Measurement;
    expect(m.person_id).toBeGreaterThan(0);
  });

  test("encounter → visit_occurrence_id", () => {
    const ctx = new MappingContext();
    const result = mapObservation(makeObservation({ encounter: { reference: "Encounter/10" } }), ctx);
    const m = result.measurement as Measurement;
    expect(m.visit_occurrence_id).toBeGreaterThan(0);
  });

  test("performer → provider_id", () => {
    const ctx = new MappingContext();
    const result = mapObservation(makeObservation({
      performer: [{ reference: "Practitioner/5" }],
    }), ctx);
    const m = result.measurement as Measurement;
    expect(m.provider_id).toBeGreaterThan(0);
  });

  test("observation gets its own ID from registry", () => {
    const ctx = new MappingContext();
    const result = mapObservation(makeObservation({ id: "obs-uuid-456" }), ctx);
    const m = result.measurement as Measurement;
    expect(m.measurement_id).toBeGreaterThan(0);
  });
});

// ============================================================
// Hash mode integration
// ============================================================

describe("Observation mapping with hash mode", () => {
  test("hash mode produces deterministic IDs across runs", () => {
    const obs = makeObservation({ id: "obs-uuid-123" });
    const ctx1 = new MappingContext(new IdRegistry("hash"));
    const ctx2 = new MappingContext(new IdRegistry("hash"));
    const r1 = mapObservation(obs, ctx1);
    const r2 = mapObservation(obs, ctx2);
    const m1 = r1.measurement as Measurement;
    const m2 = r2.measurement as Measurement;
    expect(m1.measurement_id).toBe(m2.measurement_id);
    expect(m1.person_id).toBe(m2.person_id);
  });

  test("references resolve deterministically in hash mode", () => {
    const obs = makeObservation({
      id: "obs-1",
      subject: { reference: "Patient/pt-uuid" },
      encounter: { reference: "Encounter/enc-uuid" },
      performer: [{ reference: "Practitioner/dr-uuid" }],
    });
    const ctx1 = new MappingContext(new IdRegistry("hash"));
    const ctx2 = new MappingContext(new IdRegistry("hash"));
    const r1 = mapObservation(obs, ctx1);
    const r2 = mapObservation(obs, ctx2);
    const m1 = r1.measurement as Measurement;
    const m2 = r2.measurement as Measurement;
    expect(m1.person_id).toBe(m2.person_id);
    expect(m1.visit_occurrence_id).toBe(m2.visit_occurrence_id);
    expect(m1.provider_id).toBe(m2.provider_id);
  });

  test("social-history observation also works with hash mode", () => {
    const obs = makeObservation({
      id: "obs-social-1",
      category: [{ coding: [{ code: "social-history" }] }],
    });
    const ctx1 = new MappingContext(new IdRegistry("hash"));
    const ctx2 = new MappingContext(new IdRegistry("hash"));
    const r1 = mapObservation(obs, ctx1);
    const r2 = mapObservation(obs, ctx2);
    const o1 = r1.observation as OmopObservation;
    const o2 = r2.observation as OmopObservation;
    expect(o1.observation_id).toBe(o2.observation_id);
  });

  test("no collisions for typical observation mapping", () => {
    const ctx = new MappingContext(new IdRegistry("hash"));
    for (let i = 0; i < 100; i++) {
      mapObservation(makeObservation({ id: `obs-${i}` }), ctx);
    }
    expect(ctx.ids.hasCollisions()).toBe(false);
  });

  test("component observations produce deterministic IDs in hash mode", () => {
    const bpObs = makeObservation({
      id: "bp-hash",
      category: [{ coding: [{ code: "vital-signs" }] }],
      valueQuantity: undefined,
      component: [
        { code: { coding: [{ system: "http://loinc.org", code: "8480-6" }] }, valueQuantity: { value: 120, unit: "mmHg" } },
        { code: { coding: [{ system: "http://loinc.org", code: "8462-4" }] }, valueQuantity: { value: 80, unit: "mmHg" } },
      ],
    });
    const ctx1 = new MappingContext(new IdRegistry("hash"));
    const ctx2 = new MappingContext(new IdRegistry("hash"));
    const r1 = mapObservation(bpObs, ctx1);
    const r2 = mapObservation(bpObs, ctx2);
    const m1 = r1.measurement as Measurement[];
    const m2 = r2.measurement as Measurement[];
    expect(m1[0].measurement_id).toBe(m2[0].measurement_id);
    expect(m1[1].measurement_id).toBe(m2[1].measurement_id);
  });
});
