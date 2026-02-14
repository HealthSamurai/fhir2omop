import type { OmopProfile } from "./types";
import type { MedicationStatement } from "../types/fhir";

const VALID_STATUSES = new Set(["active", "completed"]);

const KNOWN_SYSTEMS = new Set([
  "http://www.nlm.nih.gov/research/umls/rxnorm",
  "http://hl7.org/fhir/sid/ndc",
  "http://snomed.info/sct",
  "http://www.whocc.no/atc",
  "http://hl7.org/fhir/sid/cvx",
]);

/**
 * OMOP profile for FHIR MedicationStatement — constraints for drug_exposure mapping.
 * Mirrors the FSH profile in profiles/OmopMedicationStatement.fsh
 */
export const MedicationStatementProfile: OmopProfile = {
  resourceType: "MedicationStatement",
  name: "OmopMedicationStatement",
  description:
    "Constraints on FHIR MedicationStatement to ensure successful mapping to OMOP drug_exposure. " +
    "Requires active/completed status, a coded medication from an OMOP-resolvable vocabulary, and an effective date.",
  rules: [
    {
      rule: "medicationstatement-status-valid",
      severity: "error",
      path: "MedicationStatement.status",
      description: "status must be active or completed (ValueSet: OmopMedicationStatementStatus)",
      check: (r: MedicationStatement) =>
        VALID_STATUSES.has(r.status)
          ? null
          : `Status "${r.status}" is not mappable — only active and completed represent actual drug exposure`,
    },
    {
      rule: "medicationstatement-medication-codeable-concept",
      severity: "error",
      path: "MedicationStatement.medicationCodeableConcept",
      description: "medication must be a CodeableConcept with at least one coding, not a bare Reference",
      check: (r: MedicationStatement) => {
        if (r.medicationReference && !r.medicationCodeableConcept) {
          return "medication is a Reference — must be a CodeableConcept for OMOP drug code extraction";
        }
        if (!r.medicationCodeableConcept?.coding?.length) {
          return "medicationCodeableConcept.coding is required — cannot determine drug_concept_id";
        }
        return null;
      },
    },
    {
      rule: "medicationstatement-medication-known-system",
      severity: "warning",
      path: "MedicationStatement.medicationCodeableConcept",
      description: "medication code should use a terminology from ValueSet OmopDrugCodes (RxNorm, NDC, SNOMED, ATC, CVX)",
      check: (r: MedicationStatement) => {
        if (!r.medicationCodeableConcept?.coding?.length) return null;
        const hasKnown = r.medicationCodeableConcept.coding.some(
          (c) => c.system && KNOWN_SYSTEMS.has(c.system)
        );
        if (hasKnown) return null;
        const systems = r.medicationCodeableConcept.coding
          .map((c) => c.system)
          .filter(Boolean)
          .join(", ");
        return `No coding from OmopDrugCodes ValueSet (${systems}) — drug_concept_id may not resolve`;
      },
    },
    {
      rule: "medicationstatement-effective-required",
      severity: "error",
      path: "MedicationStatement.effective[x]",
      description: "effective[x] (dateTime or Period.start) is required for drug_exposure_start_date",
      check: (r: MedicationStatement) =>
        r.effectiveDateTime || r.effectivePeriod?.start
          ? null
          : "effective[x] is required for OMOP drug_exposure_start_date",
    },
    {
      rule: "medicationstatement-subject-present",
      severity: "warning",
      path: "MedicationStatement.subject",
      description: "subject reference is recommended for person_id linkage",
      check: (r: MedicationStatement) =>
        r.subject?.reference
          ? null
          : "No subject reference — person_id will be 0",
    },
    {
      rule: "medicationstatement-effective-period-end",
      severity: "warning",
      path: "MedicationStatement.effectivePeriod.end",
      description: "Period.end is recommended for drug_exposure_end_date",
      check: (r: MedicationStatement) => {
        if (r.effectiveDateTime) return null; // dateTime is a point in time, no end expected
        if (r.effectivePeriod?.end) return null;
        if (!r.effectivePeriod) return null; // no period at all — covered by effective-required
        return "effectivePeriod has no end — drug_exposure_end_date will be null";
      },
    },
  ],
};
