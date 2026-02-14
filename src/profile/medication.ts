import type { OmopProfile } from "./types";
import type { MedicationRequest } from "../types/fhir";

const VALID_STATUSES = new Set(["active", "completed"]);

const KNOWN_SYSTEMS = new Set([
  "http://www.nlm.nih.gov/research/umls/rxnorm",
  "http://hl7.org/fhir/sid/ndc",
  "http://snomed.info/sct",
  "http://hl7.org/fhir/sid/cvx",
]);

/** OMOP profile for FHIR MedicationRequest — constraints for drug_exposure mapping */
export const MedicationRequestProfile: OmopProfile = {
  resourceType: "MedicationRequest",
  name: "OmopMedicationRequest",
  description:
    "Constraints on FHIR MedicationRequest to ensure successful mapping to OMOP drug_exposure. " +
    "Requires active/completed status, a medication code, and an authored date.",
  rules: [
    {
      rule: "medication-status-valid",
      severity: "error",
      path: "MedicationRequest.status",
      description: "status must be active or completed",
      check: (r: MedicationRequest) =>
        VALID_STATUSES.has(r.status)
          ? null
          : `Status "${r.status}" is not mappable — only active and completed are accepted`,
    },
    {
      rule: "medication-code-required",
      severity: "error",
      path: "MedicationRequest.medicationCodeableConcept",
      description: "medicationCodeableConcept with at least one coding is required",
      check: (r: MedicationRequest) =>
        r.medicationCodeableConcept?.coding?.length
          ? null
          : "medicationCodeableConcept.coding is required — cannot determine drug_concept_id",
    },
    {
      rule: "medication-code-known-system",
      severity: "warning",
      path: "MedicationRequest.medicationCodeableConcept.coding.system",
      description: "medication code should use a recognized terminology (RxNorm, NDC, etc.)",
      check: (r: MedicationRequest) => {
        if (!r.medicationCodeableConcept?.coding?.length) return null;
        const hasKnown = r.medicationCodeableConcept.coding.some(
          (c) => c.system && KNOWN_SYSTEMS.has(c.system)
        );
        if (hasKnown) return null;
        const systems = r.medicationCodeableConcept.coding
          .map((c) => c.system)
          .filter(Boolean)
          .join(", ");
        return `No recognized terminology found (${systems}) — drug_concept_id may not resolve`;
      },
    },
    {
      rule: "medication-authored-on-required",
      severity: "error",
      path: "MedicationRequest.authoredOn",
      description: "authoredOn is required for drug_exposure_start_date",
      check: (r: MedicationRequest) =>
        r.authoredOn
          ? null
          : "authoredOn is required for OMOP drug_exposure_start_date",
    },
    {
      rule: "medication-subject-present",
      severity: "warning",
      path: "MedicationRequest.subject",
      description: "subject reference is recommended for person_id linkage",
      check: (r: MedicationRequest) =>
        r.subject?.reference
          ? null
          : "No subject reference — person_id will be 0",
    },
    {
      rule: "medication-end-date-present",
      severity: "warning",
      path: "MedicationRequest.dispenseRequest.validityPeriod.end",
      description: "End date is recommended for drug_exposure_end_date",
      check: (r: MedicationRequest) =>
        r.dispenseRequest?.validityPeriod?.end
          ? null
          : "No end date available — drug_exposure_end_date will be null",
    },
  ],
};
