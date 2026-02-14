import type { OmopProfile } from "./types";
import type { Condition } from "../types/fhir";

const VALID_CLINICAL_STATUSES = new Set(["active", "recurrence", "relapse"]);
const VALID_VERIFICATION_STATUSES = new Set(["confirmed", "unconfirmed", "provisional", "differential"]);

const KNOWN_SYSTEMS = new Set([
  "http://snomed.info/sct",
  "http://hl7.org/fhir/sid/icd-10-cm",
  "http://hl7.org/fhir/sid/icd-10",
  "http://loinc.org",
  "http://www.ama-assn.org/go/cpt",
]);

/** OMOP profile for FHIR Condition — constraints for condition_occurrence mapping */
export const ConditionProfile: OmopProfile = {
  resourceType: "Condition",
  name: "OmopCondition",
  description:
    "Constraints on FHIR Condition to ensure successful mapping to OMOP condition_occurrence. " +
    "Requires active clinical status (not entered-in-error), a coded condition, and an onset date.",
  rules: [
    {
      rule: "condition-not-entered-in-error",
      severity: "error",
      path: "Condition.verificationStatus",
      description: "Resources with verificationStatus 'entered-in-error' are not mappable",
      check: (r: Condition) => {
        const code = r.verificationStatus?.coding?.[0]?.code;
        return code === "entered-in-error"
          ? "verificationStatus is 'entered-in-error' — resource will not be mapped"
          : null;
      },
    },
    {
      rule: "condition-clinical-status-valid",
      severity: "error",
      path: "Condition.clinicalStatus",
      description: "clinicalStatus must be active, recurrence, or relapse",
      check: (r: Condition) => {
        const code = r.clinicalStatus?.coding?.[0]?.code;
        if (!code) return null; // absent clinicalStatus is OK
        return VALID_CLINICAL_STATUSES.has(code)
          ? null
          : `clinicalStatus "${code}" is not mappable — only active, recurrence, relapse are accepted`;
      },
    },
    {
      rule: "condition-verification-status-valid",
      severity: "error",
      path: "Condition.verificationStatus",
      description: "verificationStatus must be confirmed, unconfirmed, provisional, or differential",
      check: (r: Condition) => {
        const code = r.verificationStatus?.coding?.[0]?.code;
        if (!code) return null; // absent is OK
        if (code === "entered-in-error") return null; // covered by other rule
        return VALID_VERIFICATION_STATUSES.has(code)
          ? null
          : `verificationStatus "${code}" is not mappable`;
      },
    },
    {
      rule: "condition-code-required",
      severity: "error",
      path: "Condition.code",
      description: "code with at least one coding is required for condition_concept_id",
      check: (r: Condition) =>
        r.code?.coding?.length
          ? null
          : "code.coding is required — cannot determine condition_concept_id",
    },
    {
      rule: "condition-code-known-system",
      severity: "warning",
      path: "Condition.code.coding.system",
      description: "code should use a recognized terminology (SNOMED, ICD-10-CM, etc.)",
      check: (r: Condition) => {
        if (!r.code?.coding?.length) return null;
        const hasKnown = r.code.coding.some((c) => c.system && KNOWN_SYSTEMS.has(c.system));
        if (hasKnown) return null;
        const systems = r.code.coding.map((c) => c.system).filter(Boolean).join(", ");
        return `No recognized terminology found (${systems}) — condition_concept_id may not resolve`;
      },
    },
    {
      rule: "condition-onset-required",
      severity: "error",
      path: "Condition.onsetDateTime",
      description: "onsetDateTime is required for condition_start_date",
      check: (r: Condition) =>
        r.onsetDateTime
          ? null
          : "onsetDateTime is required for OMOP condition_start_date",
    },
    {
      rule: "condition-subject-present",
      severity: "warning",
      path: "Condition.subject",
      description: "subject reference is recommended for person_id linkage",
      check: (r: Condition) =>
        r.subject?.reference
          ? null
          : "No subject reference — person_id will be 0",
    },
  ],
};
