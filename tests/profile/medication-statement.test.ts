import { test, expect, describe } from "bun:test";
import { validate } from "../../src/profile/validate";
import { MedicationStatementProfile } from "../../src/profile/medication-statement";
import { validateAndMapMedicationStatement } from "../../src/profile/validate-and-map";
import type { MedicationStatement } from "../../src/types/fhir";

const validStatement: MedicationStatement = {
  resourceType: "MedicationStatement",
  status: "active",
  medicationCodeableConcept: {
    coding: [{ system: "http://www.nlm.nih.gov/research/umls/rxnorm", code: "313782", display: "Acetaminophen" }],
  },
  subject: { reference: "Patient/123" },
  effectiveDateTime: "2024-01-15",
};

describe("MedicationStatementProfile", () => {
  test("valid statement passes all rules", () => {
    const result = validate(validStatement, MedicationStatementProfile);
    expect(result.valid).toBe(true);
    expect(result.issues.filter((i) => i.severity === "error")).toHaveLength(0);
  });

  test("entered-in-error status is an error", () => {
    const stmt: MedicationStatement = { ...validStatement, status: "entered-in-error" };
    const result = validate(stmt, MedicationStatementProfile);
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.rule === "medicationstatement-status-valid")).toBe(true);
  });

  test("intended status is an error", () => {
    const stmt: MedicationStatement = { ...validStatement, status: "intended" };
    const result = validate(stmt, MedicationStatementProfile);
    expect(result.valid).toBe(false);
  });

  test("not-taken status is an error", () => {
    const stmt: MedicationStatement = { ...validStatement, status: "not-taken" };
    const result = validate(stmt, MedicationStatementProfile);
    expect(result.valid).toBe(false);
  });

  test("completed status is valid", () => {
    const stmt: MedicationStatement = { ...validStatement, status: "completed" };
    const result = validate(stmt, MedicationStatementProfile);
    const statusErrors = result.issues.filter((i) => i.rule === "medicationstatement-status-valid");
    expect(statusErrors).toHaveLength(0);
  });

  test("missing medication code is an error", () => {
    const stmt: MedicationStatement = { ...validStatement, medicationCodeableConcept: undefined };
    const result = validate(stmt, MedicationStatementProfile);
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.rule === "medicationstatement-medication-codeable-concept")).toBe(true);
  });

  test("medicationReference (not CodeableConcept) is an error", () => {
    const stmt = {
      ...validStatement,
      medicationCodeableConcept: undefined,
      medicationReference: { reference: "Medication/123" },
    } as any;
    const result = validate(stmt, MedicationStatementProfile);
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.message.includes("Reference"))).toBe(true);
  });

  test("unknown drug code system produces warning", () => {
    const stmt: MedicationStatement = {
      ...validStatement,
      medicationCodeableConcept: {
        coding: [{ system: "http://example.com/drugs", code: "DRUG1" }],
      },
    };
    const result = validate(stmt, MedicationStatementProfile);
    expect(result.valid).toBe(true); // warning, not error
    expect(result.issues.some((i) => i.rule === "medicationstatement-medication-known-system")).toBe(true);
  });

  test("RxNorm code system produces no warning", () => {
    const result = validate(validStatement, MedicationStatementProfile);
    const sysWarnings = result.issues.filter((i) => i.rule === "medicationstatement-medication-known-system");
    expect(sysWarnings).toHaveLength(0);
  });

  test("missing effective date is an error", () => {
    const stmt: MedicationStatement = { ...validStatement, effectiveDateTime: undefined };
    const result = validate(stmt, MedicationStatementProfile);
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.rule === "medicationstatement-effective-required")).toBe(true);
  });

  test("effectivePeriod.start satisfies effective requirement", () => {
    const stmt: MedicationStatement = {
      ...validStatement,
      effectiveDateTime: undefined,
      effectivePeriod: { start: "2024-01-15" },
    };
    const result = validate(stmt, MedicationStatementProfile);
    const effectiveErrors = result.issues.filter((i) => i.rule === "medicationstatement-effective-required");
    expect(effectiveErrors).toHaveLength(0);
  });

  test("effectivePeriod without end produces warning", () => {
    const stmt: MedicationStatement = {
      ...validStatement,
      effectiveDateTime: undefined,
      effectivePeriod: { start: "2024-01-15" },
    };
    const result = validate(stmt, MedicationStatementProfile);
    expect(result.issues.some((i) => i.rule === "medicationstatement-effective-period-end")).toBe(true);
  });

  test("missing subject produces warning", () => {
    const stmt: MedicationStatement = { ...validStatement, subject: {} as any };
    const result = validate(stmt, MedicationStatementProfile);
    expect(result.valid).toBe(true);
    expect(result.issues.some((i) => i.rule === "medicationstatement-subject-present")).toBe(true);
  });
});

describe("validateAndMapMedicationStatement", () => {
  test("valid statement is validated and mapped", () => {
    const { validation, result } = validateAndMapMedicationStatement(validStatement);
    expect(validation.valid).toBe(true);
    expect(result).not.toBeNull();
    expect(result!.drug_source_value).toBe("313782");
    expect(result!.drug_type_concept_id).toBe(44787730);
  });

  test("invalid statement returns null result", () => {
    const stmt: MedicationStatement = { ...validStatement, effectiveDateTime: undefined };
    const { validation, result } = validateAndMapMedicationStatement(stmt);
    expect(validation.valid).toBe(false);
    expect(result).toBeNull();
  });

  test("statement with warnings is still mapped", () => {
    const stmt: MedicationStatement = {
      ...validStatement,
      medicationCodeableConcept: {
        coding: [{ system: "http://example.com/local", code: "LOCAL1" }],
      },
    };
    const { validation, result } = validateAndMapMedicationStatement(stmt);
    expect(validation.valid).toBe(true);
    expect(validation.issues.length).toBeGreaterThan(0);
    expect(result).not.toBeNull();
  });
});
