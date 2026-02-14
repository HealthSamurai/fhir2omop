import { test, expect, describe } from "bun:test";
import { validate } from "../../src/profile/validate";
import { PatientProfile } from "../../src/profile/patient";
import { validateAndMapPatient } from "../../src/profile/validate-and-map";
import type { Patient } from "../../src/types/fhir";

const validPatient: Patient = {
  resourceType: "Patient",
  id: "123",
  identifier: [{ system: "http://hl7.org/fhir/sid/us-ssn", value: "123-45-6789" }],
  gender: "male",
  birthDate: "1990-01-15",
  extension: [
    {
      url: "http://hl7.org/fhir/us/core/StructureDefinition/us-core-race",
      extension: [{ url: "ombCategory", valueCoding: { code: "2106-3", display: "White" } }],
    },
    {
      url: "http://hl7.org/fhir/us/core/StructureDefinition/us-core-ethnicity",
      extension: [{ url: "ombCategory", valueCoding: { code: "2186-5", display: "Not Hispanic or Latino" } }],
    },
  ],
};

describe("PatientProfile", () => {
  test("valid patient passes all rules", () => {
    const result = validate(validPatient, PatientProfile);
    expect(result.valid).toBe(true);
    expect(result.issues.filter((i) => i.severity === "error")).toHaveLength(0);
  });

  test("missing birthDate is an error", () => {
    const patient: Patient = { resourceType: "Patient", gender: "male" };
    const result = validate(patient, PatientProfile);
    expect(result.valid).toBe(false);
    const errors = result.issues.filter((i) => i.rule === "patient-birthdate-required");
    expect(errors).toHaveLength(1);
  });

  test("invalid birthDate format is an error", () => {
    const patient: Patient = { resourceType: "Patient", birthDate: "Jan 15 1990" };
    const result = validate(patient, PatientProfile);
    expect(result.valid).toBe(false);
    const errors = result.issues.filter((i) => i.rule === "patient-birthdate-format");
    expect(errors).toHaveLength(1);
  });

  test("partial dates YYYY and YYYY-MM are valid", () => {
    for (const date of ["1990", "1990-01"]) {
      const patient: Patient = { resourceType: "Patient", birthDate: date, gender: "male" };
      const result = validate(patient, PatientProfile);
      const formatErrors = result.issues.filter((i) => i.rule === "patient-birthdate-format");
      expect(formatErrors).toHaveLength(0);
    }
  });

  test("missing gender is OK (warning-free)", () => {
    const patient: Patient = { resourceType: "Patient", id: "1", birthDate: "1990" };
    const result = validate(patient, PatientProfile);
    expect(result.valid).toBe(true);
    const genderIssues = result.issues.filter((i) => i.rule === "patient-gender-valueset");
    expect(genderIssues).toHaveLength(0);
  });

  test("missing identifier produces warning", () => {
    const patient: Patient = { resourceType: "Patient", birthDate: "1990" };
    const result = validate(patient, PatientProfile);
    expect(result.valid).toBe(true); // warning, not error
    const warnings = result.issues.filter((i) => i.rule === "patient-identifier-present");
    expect(warnings).toHaveLength(1);
    expect(warnings[0].severity).toBe("warning");
  });

  test("deceasedBoolean without dateTime produces warning", () => {
    const patient: Patient = {
      resourceType: "Patient",
      birthDate: "1990",
      id: "1",
      deceasedBoolean: true,
    };
    const result = validate(patient, PatientProfile);
    const warnings = result.issues.filter((i) => i.rule === "patient-deceased-datetime");
    expect(warnings).toHaveLength(1);
    expect(warnings[0].severity).toBe("warning");
  });

  test("deceasedDateTime present produces no warning", () => {
    const patient: Patient = {
      resourceType: "Patient",
      birthDate: "1990",
      id: "1",
      deceasedDateTime: "2020-06-15",
    };
    const result = validate(patient, PatientProfile);
    const warnings = result.issues.filter((i) => i.rule === "patient-deceased-datetime");
    expect(warnings).toHaveLength(0);
  });

  test("missing race extension produces warning", () => {
    const patient: Patient = { resourceType: "Patient", birthDate: "1990", id: "1" };
    const result = validate(patient, PatientProfile);
    const warnings = result.issues.filter((i) => i.rule === "patient-race-extension");
    expect(warnings).toHaveLength(1);
  });

  test("missing ethnicity extension produces warning", () => {
    const patient: Patient = { resourceType: "Patient", birthDate: "1990", id: "1" };
    const result = validate(patient, PatientProfile);
    const warnings = result.issues.filter((i) => i.rule === "patient-ethnicity-extension");
    expect(warnings).toHaveLength(1);
  });

  test("race extension without ombCategory coding produces warning", () => {
    const patient: Patient = {
      resourceType: "Patient",
      birthDate: "1990",
      id: "1",
      extension: [{
        url: "http://hl7.org/fhir/us/core/StructureDefinition/us-core-race",
        extension: [{ url: "text", valueString: "White" }],
      }],
    };
    const result = validate(patient, PatientProfile);
    const warnings = result.issues.filter((i) => i.rule === "patient-race-extension");
    expect(warnings).toHaveLength(1);
    expect(warnings[0].message).toContain("ombCategory");
  });
});

describe("validateAndMapPatient", () => {
  test("valid patient is validated and mapped", () => {
    const { validation, result } = validateAndMapPatient(validPatient);
    expect(validation.valid).toBe(true);
    expect(result).not.toBeNull();
    expect(result!.person).not.toBeNull();
    expect(result!.person!.gender_concept_id).toBe(8507);
  });

  test("invalid patient returns null result with validation errors", () => {
    const patient: Patient = { resourceType: "Patient", gender: "male" };
    const { validation, result } = validateAndMapPatient(patient);
    expect(validation.valid).toBe(false);
    expect(result).toBeNull();
    expect(validation.issues.some((i) => i.rule === "patient-birthdate-required")).toBe(true);
  });

  test("patient with warnings is still mapped", () => {
    const patient: Patient = {
      resourceType: "Patient",
      birthDate: "1990-01-15",
      gender: "male",
      // No identifier, no race/ethnicity extensions — all warnings
    };
    const { validation, result } = validateAndMapPatient(patient);
    expect(validation.valid).toBe(true);
    expect(validation.issues.length).toBeGreaterThan(0);
    expect(validation.issues.every((i) => i.severity === "warning")).toBe(true);
    expect(result).not.toBeNull();
    expect(result!.person).not.toBeNull();
  });
});
