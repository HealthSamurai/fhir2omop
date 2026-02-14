import { test, expect, describe } from "bun:test";
import { mapMedicationRequest } from "../src/mapper/medication";
import type { MedicationRequest } from "../src/types/fhir";
import { MappingContext } from "../src/mapping-context";

function makeMedRequest(overrides: Partial<MedicationRequest> = {}): MedicationRequest {
  return {
    resourceType: "MedicationRequest",
    id: "med-1",
    status: "active",
    intent: "order",
    medicationCodeableConcept: {
      coding: [{ system: "http://www.nlm.nih.gov/research/umls/rxnorm", code: "1049502", display: "Lisinopril 10 MG" }],
    },
    subject: { reference: "Patient/1" },
    authoredOn: "2023-06-15T09:00:00Z",
    ...overrides,
  };
}

// ============================================================
// Status filtering
// ============================================================

describe("MedicationRequest status filter", () => {
  test("active → mapped", () => {
    const result = mapMedicationRequest(makeMedRequest({ status: "active" }));
    expect(result).not.toBeNull();
  });

  test("completed → mapped", () => {
    const result = mapMedicationRequest(makeMedRequest({ status: "completed" }));
    expect(result).not.toBeNull();
  });

  test("cancelled → skipped", () => {
    const result = mapMedicationRequest(makeMedRequest({ status: "cancelled" }));
    expect(result).toBeNull();
  });

  test("entered-in-error → skipped", () => {
    const result = mapMedicationRequest(makeMedRequest({ status: "entered-in-error" }));
    expect(result).toBeNull();
  });

  test("draft → skipped", () => {
    const result = mapMedicationRequest(makeMedRequest({ status: "draft" }));
    expect(result).toBeNull();
  });

  test("stopped → skipped", () => {
    const result = mapMedicationRequest(makeMedRequest({ status: "stopped" }));
    expect(result).toBeNull();
  });
});

// ============================================================
// Field mapping
// ============================================================

describe("MedicationRequest field mapping", () => {
  test("medicationCodeableConcept → drug_source_value", () => {
    const result = mapMedicationRequest(makeMedRequest());
    expect(result!.drug_source_value).toBe("1049502");
  });

  test("authoredOn → drug_exposure_start_date", () => {
    const result = mapMedicationRequest(makeMedRequest({ authoredOn: "2023-06-15T09:00:00Z" }));
    expect(result!.drug_exposure_start_date).toBe("2023-06-15");
    expect(result!.drug_exposure_start_datetime).toBe("2023-06-15T09:00:00Z");
  });

  test("dispenseRequest.validityPeriod.end → drug_exposure_end_date", () => {
    const result = mapMedicationRequest(makeMedRequest({
      dispenseRequest: {
        validityPeriod: { end: "2023-12-15T09:00:00Z" },
      },
    }));
    expect(result!.drug_exposure_end_date).toBe("2023-12-15");
  });

  test("no end date → null", () => {
    const result = mapMedicationRequest(makeMedRequest());
    expect(result!.drug_exposure_end_date).toBeNull();
  });

  test("dosage quantity mapped", () => {
    const result = mapMedicationRequest(makeMedRequest({
      dosageInstruction: [
        { doseAndRate: [{ doseQuantity: { value: 10, unit: "mg" } }] },
      ],
    }));
    expect(result!.quantity).toBe(10);
  });

  test("dosage route mapped", () => {
    const result = mapMedicationRequest(makeMedRequest({
      dosageInstruction: [
        { route: { coding: [{ code: "26643006", display: "Oral" }] } },
      ],
    }));
    expect(result!.route_source_value).toBe("Oral");
  });

  test("refills from dispenseRequest", () => {
    const result = mapMedicationRequest(makeMedRequest({
      dispenseRequest: { numberOfRepeatsAllowed: 3 },
    }));
    expect(result!.refills).toBe(3);
  });

  test("no authoredOn → skipped", () => {
    const result = mapMedicationRequest(makeMedRequest({ authoredOn: undefined }));
    expect(result).toBeNull();
  });

  test("no medication code → skipped", () => {
    const result = mapMedicationRequest(makeMedRequest({ medicationCodeableConcept: undefined }));
    expect(result).toBeNull();
  });
});

// ============================================================
// Type concept
// ============================================================

describe("MedicationRequest type concept", () => {
  test("drug_type_concept_id is 38000177 (Prescription written)", () => {
    const result = mapMedicationRequest(makeMedRequest());
    expect(result!.drug_type_concept_id).toBe(38000177);
  });
});

// ============================================================
// References
// ============================================================

describe("MedicationRequest references", () => {
  test("subject → person_id", () => {
    const ctx = new MappingContext();
    const result = mapMedicationRequest(makeMedRequest({ subject: { reference: "Patient/42" } }), ctx);
    expect(result!.person_id).toBeGreaterThan(0);
  });

  test("encounter → visit_occurrence_id", () => {
    const ctx = new MappingContext();
    const result = mapMedicationRequest(makeMedRequest({ encounter: { reference: "Encounter/10" } }), ctx);
    expect(result!.visit_occurrence_id).toBeGreaterThan(0);
  });

  test("requester → provider_id", () => {
    const ctx = new MappingContext();
    const result = mapMedicationRequest(makeMedRequest({ requester: { reference: "Practitioner/7" } }), ctx);
    expect(result!.provider_id).toBeGreaterThan(0);
  });

  test("medication request gets its own ID from registry", () => {
    const ctx = new MappingContext();
    const result = mapMedicationRequest(makeMedRequest({ id: "med-uuid-789" }), ctx);
    expect(result!.drug_exposure_id).toBeGreaterThan(0);
  });
});

// ============================================================
// Code prioritization
// ============================================================

describe("MedicationRequest code prioritization", () => {
  test("RxNorm preferred over NDC", () => {
    const result = mapMedicationRequest(makeMedRequest({
      medicationCodeableConcept: {
        coding: [
          { system: "http://hl7.org/fhir/sid/ndc", code: "00071015523", display: "Lisinopril 10mg tab" },
          { system: "http://www.nlm.nih.gov/research/umls/rxnorm", code: "1049502", display: "Lisinopril 10 MG" },
        ],
      },
    }));
    expect(result!.drug_source_value).toBe("1049502");
  });
});
