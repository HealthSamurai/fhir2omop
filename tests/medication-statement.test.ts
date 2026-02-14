import { test, expect, describe } from "bun:test";
import { mapMedicationStatement } from "../src/mapper/medication-statement";
import type { MedicationStatement } from "../src/types/fhir";

const validStatement: MedicationStatement = {
  resourceType: "MedicationStatement",
  status: "active",
  medicationCodeableConcept: {
    coding: [
      { system: "http://www.nlm.nih.gov/research/umls/rxnorm", code: "313782", display: "Acetaminophen 325 MG" },
    ],
  },
  subject: { reference: "Patient/123" },
  effectiveDateTime: "2024-01-15T10:00:00Z",
};

describe("mapMedicationStatement", () => {
  test("maps a valid MedicationStatement to drug_exposure", () => {
    const result = mapMedicationStatement(validStatement);
    expect(result).not.toBeNull();
    expect(result!.person_id).toBe(123);
    expect(result!.drug_exposure_start_date).toBe("2024-01-15");
    expect(result!.drug_source_value).toBe("313782");
    expect(result!.drug_type_concept_id).toBe(44787730); // Patient Self-Reported
  });

  test("returns null for entered-in-error status", () => {
    const stmt: MedicationStatement = { ...validStatement, status: "entered-in-error" };
    expect(mapMedicationStatement(stmt)).toBeNull();
  });

  test("returns null for intended status", () => {
    const stmt: MedicationStatement = { ...validStatement, status: "intended" };
    expect(mapMedicationStatement(stmt)).toBeNull();
  });

  test("returns null for not-taken status", () => {
    const stmt: MedicationStatement = { ...validStatement, status: "not-taken" };
    expect(mapMedicationStatement(stmt)).toBeNull();
  });

  test("maps completed status", () => {
    const stmt: MedicationStatement = { ...validStatement, status: "completed" };
    const result = mapMedicationStatement(stmt);
    expect(result).not.toBeNull();
  });

  test("returns null when missing medication code", () => {
    const stmt: MedicationStatement = { ...validStatement, medicationCodeableConcept: undefined };
    expect(mapMedicationStatement(stmt)).toBeNull();
  });

  test("returns null when missing effective date", () => {
    const stmt: MedicationStatement = { ...validStatement, effectiveDateTime: undefined };
    expect(mapMedicationStatement(stmt)).toBeNull();
  });

  test("maps effectivePeriod start/end dates", () => {
    const stmt: MedicationStatement = {
      ...validStatement,
      effectiveDateTime: undefined,
      effectivePeriod: { start: "2024-01-15", end: "2024-07-15" },
    };
    const result = mapMedicationStatement(stmt);
    expect(result).not.toBeNull();
    expect(result!.drug_exposure_start_date).toBe("2024-01-15");
    expect(result!.drug_exposure_end_date).toBe("2024-07-15");
  });

  test("maps effectivePeriod with only start", () => {
    const stmt: MedicationStatement = {
      ...validStatement,
      effectiveDateTime: undefined,
      effectivePeriod: { start: "2024-01-15" },
    };
    const result = mapMedicationStatement(stmt);
    expect(result).not.toBeNull();
    expect(result!.drug_exposure_start_date).toBe("2024-01-15");
    expect(result!.drug_exposure_end_date).toBeNull();
  });

  test("maps dosage route and quantity", () => {
    const stmt: MedicationStatement = {
      ...validStatement,
      dosage: [{
        route: { coding: [{ code: "26643006", display: "Oral" }] },
        doseAndRate: [{ doseQuantity: { value: 325, unit: "mg" } }],
      }],
    };
    const result = mapMedicationStatement(stmt);
    expect(result).not.toBeNull();
    expect(result!.route_source_value).toBe("Oral");
    expect(result!.quantity).toBe(325);
  });

  test("maps informationSource to provider_id", () => {
    const stmt: MedicationStatement = {
      ...validStatement,
      informationSource: { reference: "Practitioner/456" },
    };
    const result = mapMedicationStatement(stmt);
    expect(result).not.toBeNull();
    expect(result!.provider_id).toBe(456);
  });

  test("maps context to visit_occurrence_id", () => {
    const stmt: MedicationStatement = {
      ...validStatement,
      context: { reference: "Encounter/789" },
    };
    const result = mapMedicationStatement(stmt);
    expect(result).not.toBeNull();
    expect(result!.visit_occurrence_id).toBe(789);
  });

  test("selects best coding by vocabulary priority", () => {
    const stmt: MedicationStatement = {
      ...validStatement,
      medicationCodeableConcept: {
        coding: [
          { system: "http://hl7.org/fhir/sid/ndc", code: "00071015523" },
          { system: "http://www.nlm.nih.gov/research/umls/rxnorm", code: "313782" },
        ],
      },
    };
    const result = mapMedicationStatement(stmt);
    expect(result).not.toBeNull();
    expect(result!.drug_source_value).toBe("313782"); // RxNorm preferred over NDC
  });
});
