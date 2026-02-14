import { test, expect, describe } from "bun:test";
import { validate } from "../../src/profile/validate";
import { ObservationProfile } from "../../src/profile/observation";
import { validateAndMapObservation } from "../../src/profile/validate-and-map";
import type { Observation } from "../../src/types/fhir";

const validObservation: Observation = {
  resourceType: "Observation",
  status: "final",
  category: [{ coding: [{ code: "laboratory" }] }],
  code: { coding: [{ system: "http://loinc.org", code: "2339-0", display: "Glucose" }] },
  subject: { reference: "Patient/123" },
  effectiveDateTime: "2024-01-15T10:00:00Z",
  valueQuantity: { value: 95, unit: "mg/dL" },
};

describe("ObservationProfile", () => {
  test("valid observation passes all rules", () => {
    const result = validate(validObservation, ObservationProfile);
    expect(result.valid).toBe(true);
    expect(result.issues.filter((i) => i.severity === "error")).toHaveLength(0);
  });

  test("preliminary status is an error", () => {
    const obs: Observation = { ...validObservation, status: "preliminary" };
    const result = validate(obs, ObservationProfile);
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.rule === "observation-status-valid")).toBe(true);
  });

  test("amended and corrected are valid", () => {
    for (const status of ["amended", "corrected"] as const) {
      const obs: Observation = { ...validObservation, status };
      const result = validate(obs, ObservationProfile);
      const statusErrors = result.issues.filter((i) => i.rule === "observation-status-valid");
      expect(statusErrors).toHaveLength(0);
    }
  });

  test("missing code is an error", () => {
    const obs: Observation = { ...validObservation, code: {} as any };
    const result = validate(obs, ObservationProfile);
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.rule === "observation-code-required")).toBe(true);
  });

  test("code with unknown system produces warning", () => {
    const obs: Observation = {
      ...validObservation,
      code: { coding: [{ system: "http://example.com/lab", code: "GLUC" }] },
    };
    const result = validate(obs, ObservationProfile);
    expect(result.valid).toBe(true);
    expect(result.issues.some((i) => i.rule === "observation-code-known-system")).toBe(true);
  });

  test("missing effectiveDateTime is an error", () => {
    const obs: Observation = { ...validObservation, effectiveDateTime: undefined };
    const result = validate(obs, ObservationProfile);
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.rule === "observation-effective-required")).toBe(true);
  });

  test("missing category produces warning", () => {
    const obs: Observation = { ...validObservation, category: undefined };
    const result = validate(obs, ObservationProfile);
    expect(result.valid).toBe(true);
    expect(result.issues.some((i) => i.rule === "observation-category-present")).toBe(true);
  });

  test("unknown category produces warning", () => {
    const obs: Observation = {
      ...validObservation,
      category: [{ coding: [{ code: "custom-type" }] }],
    };
    const result = validate(obs, ObservationProfile);
    expect(result.valid).toBe(true);
    expect(result.issues.some((i) => i.rule === "observation-category-known")).toBe(true);
  });

  test("vital-signs category is valid", () => {
    const obs: Observation = {
      ...validObservation,
      category: [{ coding: [{ code: "vital-signs" }] }],
    };
    const result = validate(obs, ObservationProfile);
    const catWarnings = result.issues.filter((i) => i.rule === "observation-category-known");
    expect(catWarnings).toHaveLength(0);
  });

  test("missing value produces warning", () => {
    const obs: Observation = {
      ...validObservation,
      valueQuantity: undefined,
    };
    const result = validate(obs, ObservationProfile);
    expect(result.valid).toBe(true);
    expect(result.issues.some((i) => i.rule === "observation-value-present")).toBe(true);
  });

  test("valueString satisfies value check", () => {
    const obs: Observation = {
      ...validObservation,
      valueQuantity: undefined,
      valueString: "Positive",
    };
    const result = validate(obs, ObservationProfile);
    const valueWarnings = result.issues.filter((i) => i.rule === "observation-value-present");
    expect(valueWarnings).toHaveLength(0);
  });
});

describe("validateAndMapObservation", () => {
  test("valid observation is validated and mapped to measurement", () => {
    const { validation, result } = validateAndMapObservation(validObservation);
    expect(validation.valid).toBe(true);
    expect(result).not.toBeNull();
    expect(result!.measurement).not.toBeNull();
    expect(result!.measurement!.value_as_number).toBe(95);
  });

  test("social-history observation maps to observation table", () => {
    const obs: Observation = {
      ...validObservation,
      category: [{ coding: [{ code: "social-history" }] }],
      code: { coding: [{ system: "http://snomed.info/sct", code: "72166-2" }] },
      valueString: "Never smoker",
      valueQuantity: undefined,
    };
    const { validation, result } = validateAndMapObservation(obs);
    expect(validation.valid).toBe(true);
    expect(result).not.toBeNull();
    expect(result!.observation).not.toBeNull();
    expect(result!.measurement).toBeNull();
  });

  test("invalid observation returns null result", () => {
    const obs: Observation = { ...validObservation, status: "registered" };
    const { validation, result } = validateAndMapObservation(obs);
    expect(validation.valid).toBe(false);
    expect(result).toBeNull();
  });
});
