import { test, expect, describe } from "bun:test";
import { validate } from "../../src/profile/validate";
import { EncounterProfile } from "../../src/profile/encounter";
import { validateAndMapEncounter } from "../../src/profile/validate-and-map";
import type { Encounter } from "../../src/types/fhir";

const validEncounter: Encounter = {
  resourceType: "Encounter",
  status: "finished",
  class: { code: "AMB", system: "http://terminology.hl7.org/CodeSystem/v3-ActCode" },
  subject: { reference: "Patient/123" },
  period: { start: "2024-01-15T10:00:00Z", end: "2024-01-15T11:00:00Z" },
};

describe("EncounterProfile", () => {
  test("valid encounter passes all rules", () => {
    const result = validate(validEncounter, EncounterProfile);
    expect(result.valid).toBe(true);
    expect(result.issues.filter((i) => i.severity === "error")).toHaveLength(0);
  });

  test("planned status is an error", () => {
    const enc: Encounter = { ...validEncounter, status: "planned" };
    const result = validate(enc, EncounterProfile);
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.rule === "encounter-status-valid")).toBe(true);
  });

  test("in-progress status is valid", () => {
    const enc: Encounter = { ...validEncounter, status: "in-progress" };
    const result = validate(enc, EncounterProfile);
    expect(result.valid).toBe(true);
  });

  test("missing period.start is an error", () => {
    const enc: Encounter = { ...validEncounter, period: {} };
    const result = validate(enc, EncounterProfile);
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.rule === "encounter-period-start-required")).toBe(true);
  });

  test("missing class code is an error", () => {
    const enc: Encounter = { ...validEncounter, class: {} as any };
    const result = validate(enc, EncounterProfile);
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.rule === "encounter-class-present")).toBe(true);
  });

  test("unknown class code produces warning", () => {
    const enc: Encounter = { ...validEncounter, class: { code: "CUSTOM" } };
    const result = validate(enc, EncounterProfile);
    expect(result.valid).toBe(true); // warning, not error
    expect(result.issues.some((i) => i.rule === "encounter-class-known")).toBe(true);
  });

  test("missing subject produces warning", () => {
    const enc: Encounter = { ...validEncounter, subject: undefined };
    const result = validate(enc, EncounterProfile);
    expect(result.valid).toBe(true);
    expect(result.issues.some((i) => i.rule === "encounter-subject-present")).toBe(true);
  });
});

describe("validateAndMapEncounter", () => {
  test("valid encounter is validated and mapped", () => {
    const { validation, result } = validateAndMapEncounter(validEncounter);
    expect(validation.valid).toBe(true);
    expect(result).not.toBeNull();
    expect(result!.visit_concept_id).toBe(9202); // AMB → outpatient
  });

  test("invalid encounter returns null result", () => {
    const enc: Encounter = { ...validEncounter, status: "cancelled" };
    const { validation, result } = validateAndMapEncounter(enc);
    expect(validation.valid).toBe(false);
    expect(result).toBeNull();
  });
});
