import { test, expect, describe } from "bun:test";
import { validate } from "../../src/profile/validate";
import { MedicationRequestProfile } from "../../src/profile/medication";
import { validateAndMapMedicationRequest } from "../../src/profile/validate-and-map";
import type { MedicationRequest } from "../../src/types/fhir";

const validMedRequest: MedicationRequest = {
  resourceType: "MedicationRequest",
  status: "active",
  intent: "order",
  medicationCodeableConcept: {
    coding: [{ system: "http://www.nlm.nih.gov/research/umls/rxnorm", code: "313782", display: "Acetaminophen" }],
  },
  subject: { reference: "Patient/123" },
  authoredOn: "2024-01-15",
  dispenseRequest: {
    validityPeriod: { end: "2024-07-15" },
  },
};

describe("MedicationRequestProfile", () => {
  test("valid medication request passes all rules", () => {
    const result = validate(validMedRequest, MedicationRequestProfile);
    expect(result.valid).toBe(true);
    expect(result.issues.filter((i) => i.severity === "error")).toHaveLength(0);
  });

  test("cancelled status is an error", () => {
    const req: MedicationRequest = { ...validMedRequest, status: "cancelled" };
    const result = validate(req, MedicationRequestProfile);
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.rule === "medication-status-valid")).toBe(true);
  });

  test("completed status is valid", () => {
    const req: MedicationRequest = { ...validMedRequest, status: "completed" };
    const result = validate(req, MedicationRequestProfile);
    const statusErrors = result.issues.filter((i) => i.rule === "medication-status-valid");
    expect(statusErrors).toHaveLength(0);
  });

  test("missing medication code is an error", () => {
    const req: MedicationRequest = { ...validMedRequest, medicationCodeableConcept: undefined };
    const result = validate(req, MedicationRequestProfile);
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.rule === "medication-code-required")).toBe(true);
  });

  test("unknown medication code system produces warning", () => {
    const req: MedicationRequest = {
      ...validMedRequest,
      medicationCodeableConcept: {
        coding: [{ system: "http://example.com/drugs", code: "DRUG1" }],
      },
    };
    const result = validate(req, MedicationRequestProfile);
    expect(result.valid).toBe(true);
    expect(result.issues.some((i) => i.rule === "medication-code-known-system")).toBe(true);
  });

  test("missing authoredOn is an error", () => {
    const req: MedicationRequest = { ...validMedRequest, authoredOn: undefined };
    const result = validate(req, MedicationRequestProfile);
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.rule === "medication-authored-on-required")).toBe(true);
  });

  test("missing end date produces warning", () => {
    const req: MedicationRequest = { ...validMedRequest, dispenseRequest: undefined };
    const result = validate(req, MedicationRequestProfile);
    expect(result.valid).toBe(true);
    expect(result.issues.some((i) => i.rule === "medication-end-date-present")).toBe(true);
  });

  test("missing subject produces warning", () => {
    const req: MedicationRequest = { ...validMedRequest, subject: {} as any };
    const result = validate(req, MedicationRequestProfile);
    expect(result.valid).toBe(true);
    expect(result.issues.some((i) => i.rule === "medication-subject-present")).toBe(true);
  });
});

describe("validateAndMapMedicationRequest", () => {
  test("valid request is validated and mapped", () => {
    const { validation, result } = validateAndMapMedicationRequest(validMedRequest);
    expect(validation.valid).toBe(true);
    expect(result).not.toBeNull();
    expect(result!.drug_source_value).toBe("313782");
  });

  test("invalid request returns null result", () => {
    const req: MedicationRequest = { ...validMedRequest, authoredOn: undefined };
    const { validation, result } = validateAndMapMedicationRequest(req);
    expect(validation.valid).toBe(false);
    expect(result).toBeNull();
  });
});
