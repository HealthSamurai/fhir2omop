import type { OmopProfile } from "./types";
import type { Encounter } from "../types/fhir";

const VALID_STATUSES = new Set(["finished", "in-progress"]);

const KNOWN_CLASS_CODES = new Set([
  "IMP", "ACUTE", "AMB", "EMER", "HH", "SS", "OBSENC", "FLD", "VR",
]);

/** OMOP profile for FHIR Encounter — constraints for visit_occurrence mapping */
export const EncounterProfile: OmopProfile = {
  resourceType: "Encounter",
  name: "OmopEncounter",
  description:
    "Constraints on FHIR Encounter to ensure successful mapping to OMOP visit_occurrence. " +
    "Requires finished/in-progress status and a period with start date. " +
    "Class code determines visit_concept_id (inpatient, outpatient, ER, etc.).",
  rules: [
    {
      rule: "encounter-status-valid",
      severity: "error",
      path: "Encounter.status",
      description: "status must be 'finished' or 'in-progress' for OMOP mapping",
      check: (r: Encounter) =>
        VALID_STATUSES.has(r.status)
          ? null
          : `Status "${r.status}" is not mappable — only finished and in-progress encounters are converted`,
    },
    {
      rule: "encounter-period-start-required",
      severity: "error",
      path: "Encounter.period.start",
      description: "period.start is required — OMOP visit_start_date is mandatory",
      check: (r: Encounter) =>
        r.period?.start
          ? null
          : "period.start is required for OMOP visit_start_date",
    },
    {
      rule: "encounter-class-present",
      severity: "error",
      path: "Encounter.class",
      description: "class is required to determine visit_concept_id",
      check: (r: Encounter) =>
        r.class?.code
          ? null
          : "class.code is required to determine OMOP visit_concept_id",
    },
    {
      rule: "encounter-class-known",
      severity: "warning",
      path: "Encounter.class",
      description: "class.code should be a recognized ActCode for visit type mapping",
      check: (r: Encounter) => {
        if (!r.class?.code) return null; // covered by required rule
        if (KNOWN_CLASS_CODES.has(r.class.code)) return null;
        return `Unrecognized class code "${r.class.code}" — visit_concept_id will be 0`;
      },
    },
    {
      rule: "encounter-subject-present",
      severity: "warning",
      path: "Encounter.subject",
      description: "subject reference is recommended for person_id linkage",
      check: (r: Encounter) =>
        r.subject?.reference
          ? null
          : "No subject reference — person_id will be 0",
    },
  ],
};
