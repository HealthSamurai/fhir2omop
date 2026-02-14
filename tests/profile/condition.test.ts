import { test, expect, describe } from "bun:test";
import { validate } from "../../src/profile/validate";
import { ConditionProfile } from "../../src/profile/condition";
import { validateAndMapCondition } from "../../src/profile/validate-and-map";
import type { Condition } from "../../src/types/fhir";

const validCondition: Condition = {
  resourceType: "Condition",
  clinicalStatus: { coding: [{ code: "active" }] },
  verificationStatus: { coding: [{ code: "confirmed" }] },
  code: { coding: [{ system: "http://snomed.info/sct", code: "38341003", display: "Hypertension" }] },
  subject: { reference: "Patient/123" },
  onsetDateTime: "2023-06-15",
};

describe("ConditionProfile", () => {
  test("valid condition passes all rules", () => {
    const result = validate(validCondition, ConditionProfile);
    expect(result.valid).toBe(true);
    expect(result.issues.filter((i) => i.severity === "error")).toHaveLength(0);
  });

  test("entered-in-error is an error", () => {
    const cond: Condition = {
      ...validCondition,
      verificationStatus: { coding: [{ code: "entered-in-error" }] },
    };
    const result = validate(cond, ConditionProfile);
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.rule === "condition-not-entered-in-error")).toBe(true);
  });

  test("inactive clinicalStatus is an error", () => {
    const cond: Condition = {
      ...validCondition,
      clinicalStatus: { coding: [{ code: "inactive" }] },
    };
    const result = validate(cond, ConditionProfile);
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.rule === "condition-clinical-status-valid")).toBe(true);
  });

  test("recurrence and relapse are valid", () => {
    for (const status of ["recurrence", "relapse"]) {
      const cond: Condition = {
        ...validCondition,
        clinicalStatus: { coding: [{ code: status }] },
      };
      const result = validate(cond, ConditionProfile);
      const statusErrors = result.issues.filter((i) => i.rule === "condition-clinical-status-valid");
      expect(statusErrors).toHaveLength(0);
    }
  });

  test("missing code is an error", () => {
    const cond: Condition = { ...validCondition, code: undefined };
    const result = validate(cond, ConditionProfile);
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.rule === "condition-code-required")).toBe(true);
  });

  test("code with unknown system produces warning", () => {
    const cond: Condition = {
      ...validCondition,
      code: { coding: [{ system: "http://example.com/custom", code: "XYZ" }] },
    };
    const result = validate(cond, ConditionProfile);
    expect(result.valid).toBe(true);
    expect(result.issues.some((i) => i.rule === "condition-code-known-system")).toBe(true);
  });

  test("missing onsetDateTime is an error", () => {
    const cond: Condition = { ...validCondition, onsetDateTime: undefined };
    const result = validate(cond, ConditionProfile);
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.rule === "condition-onset-required")).toBe(true);
  });

  test("absent clinicalStatus is OK", () => {
    const cond: Condition = { ...validCondition, clinicalStatus: undefined };
    const result = validate(cond, ConditionProfile);
    const statusErrors = result.issues.filter((i) => i.rule === "condition-clinical-status-valid");
    expect(statusErrors).toHaveLength(0);
  });
});

describe("validateAndMapCondition", () => {
  test("valid condition is validated and mapped", () => {
    const { validation, result } = validateAndMapCondition(validCondition);
    expect(validation.valid).toBe(true);
    expect(result).not.toBeNull();
    expect(result!.condition_source_value).toBe("38341003");
  });

  test("invalid condition returns null result", () => {
    const cond: Condition = { ...validCondition, onsetDateTime: undefined };
    const { validation, result } = validateAndMapCondition(cond);
    expect(validation.valid).toBe(false);
    expect(result).toBeNull();
  });
});
