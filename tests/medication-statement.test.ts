import { test, expect, describe } from "bun:test";
import { mapMedicationStatement } from "../src/mapper/medication-statement";
import type { MedicationStatement } from "../src/types/fhir";
import { MappingContext, IdRegistry } from "../src/mapping-context";

const validStatement: MedicationStatement = {
  resourceType: "MedicationStatement",
  id: "ms-1",
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
    const ctx = new MappingContext();
    const result = mapMedicationStatement(validStatement, ctx);
    expect(result).not.toBeNull();
    expect(result!.person_id).toBeGreaterThan(0);
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
    const ctx = new MappingContext();
    const stmt: MedicationStatement = {
      ...validStatement,
      informationSource: { reference: "Practitioner/456" },
    };
    const result = mapMedicationStatement(stmt, ctx);
    expect(result).not.toBeNull();
    expect(result!.provider_id).toBeGreaterThan(0);
  });

  test("maps context to visit_occurrence_id", () => {
    const ctx = new MappingContext();
    const stmt: MedicationStatement = {
      ...validStatement,
      context: { reference: "Encounter/789" },
    };
    const result = mapMedicationStatement(stmt, ctx);
    expect(result).not.toBeNull();
    expect(result!.visit_occurrence_id).toBeGreaterThan(0);
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

// ============================================================
// ID assignment
// ============================================================

describe("MedicationStatement ID assignment", () => {
  test("drug_exposure_id assigned from IdRegistry", () => {
    const ctx = new MappingContext();
    const result = mapMedicationStatement(validStatement, ctx);
    expect(result!.drug_exposure_id).toBeGreaterThan(0);
  });

  test("no id → no drug_exposure_id", () => {
    const ctx = new MappingContext();
    const stmt: MedicationStatement = { ...validStatement, id: undefined };
    const result = mapMedicationStatement(stmt, ctx);
    expect(result!.drug_exposure_id).toBeUndefined();
  });
});

// ============================================================
// Hash mode integration
// ============================================================

describe("MedicationStatement mapping with hash mode", () => {
  test("hash mode produces deterministic IDs across runs", () => {
    const stmt = { ...validStatement, id: "ms-uuid-123" };
    const ctx1 = new MappingContext(new IdRegistry("hash"));
    const ctx2 = new MappingContext(new IdRegistry("hash"));
    const r1 = mapMedicationStatement(stmt, ctx1);
    const r2 = mapMedicationStatement(stmt, ctx2);
    expect(r1!.drug_exposure_id).toBe(r2!.drug_exposure_id);
    expect(r1!.person_id).toBe(r2!.person_id);
  });

  test("references resolve deterministically in hash mode", () => {
    const stmt: MedicationStatement = {
      ...validStatement,
      id: "ms-1",
      subject: { reference: "Patient/pt-uuid" },
      informationSource: { reference: "Practitioner/dr-uuid" },
      context: { reference: "Encounter/enc-uuid" },
    };
    const ctx1 = new MappingContext(new IdRegistry("hash"));
    const ctx2 = new MappingContext(new IdRegistry("hash"));
    const r1 = mapMedicationStatement(stmt, ctx1);
    const r2 = mapMedicationStatement(stmt, ctx2);
    expect(r1!.person_id).toBe(r2!.person_id);
    expect(r1!.visit_occurrence_id).toBe(r2!.visit_occurrence_id);
    expect(r1!.provider_id).toBe(r2!.provider_id);
  });

  test("no collisions for typical medication statement mapping", () => {
    const ctx = new MappingContext(new IdRegistry("hash"));
    for (let i = 0; i < 100; i++) {
      mapMedicationStatement({ ...validStatement, id: `ms-${i}` }, ctx);
    }
    expect(ctx.ids.hasCollisions()).toBe(false);
  });
});
