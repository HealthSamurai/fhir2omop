import type { OmopProfile } from "./types";
import type { Observation } from "../types/fhir";

const VALID_STATUSES = new Set(["final", "amended", "corrected"]);

const KNOWN_SYSTEMS = new Set([
  "http://loinc.org",
  "http://snomed.info/sct",
  "http://www.ama-assn.org/go/cpt",
]);

const KNOWN_CATEGORIES = new Set([
  "laboratory", "vital-signs", "social-history", "survey", "activity",
]);

/** OMOP profile for FHIR Observation — constraints for measurement/observation mapping */
export const ObservationProfile: OmopProfile = {
  resourceType: "Observation",
  name: "OmopObservation",
  description:
    "Constraints on FHIR Observation to ensure successful mapping to OMOP measurement or observation tables. " +
    "Requires final/amended/corrected status, a coded observation type, and an effective date. " +
    "Category determines routing: laboratory/vital-signs → measurement, social-history/survey → observation.",
  rules: [
    {
      rule: "observation-status-valid",
      severity: "error",
      path: "Observation.status",
      description: "status must be final, amended, or corrected",
      check: (r: Observation) =>
        VALID_STATUSES.has(r.status)
          ? null
          : `Status "${r.status}" is not mappable — only final, amended, corrected are accepted`,
    },
    {
      rule: "observation-code-required",
      severity: "error",
      path: "Observation.code",
      description: "code with at least one coding is required",
      check: (r: Observation) =>
        r.code?.coding?.length
          ? null
          : "code.coding is required — cannot determine concept_id",
    },
    {
      rule: "observation-code-known-system",
      severity: "warning",
      path: "Observation.code.coding.system",
      description: "code should use a recognized terminology (LOINC, SNOMED, etc.)",
      check: (r: Observation) => {
        if (!r.code?.coding?.length) return null;
        const hasKnown = r.code.coding.some((c) => c.system && KNOWN_SYSTEMS.has(c.system));
        if (hasKnown) return null;
        const systems = r.code.coding.map((c) => c.system).filter(Boolean).join(", ");
        return `No recognized terminology found (${systems}) — concept_id may not resolve`;
      },
    },
    {
      rule: "observation-effective-required",
      severity: "error",
      path: "Observation.effectiveDateTime",
      description: "effectiveDateTime is required for observation/measurement date",
      check: (r: Observation) =>
        r.effectiveDateTime
          ? null
          : "effectiveDateTime is required for OMOP date fields",
    },
    {
      rule: "observation-category-present",
      severity: "warning",
      path: "Observation.category",
      description: "category is recommended for OMOP table routing (measurement vs observation)",
      check: (r: Observation) => {
        const codes = (r.category ?? []).flatMap((c) => c.coding ?? []).map((c) => c.code);
        if (codes.length === 0) {
          return "No category — will default to measurement table";
        }
        return null;
      },
    },
    {
      rule: "observation-category-known",
      severity: "warning",
      path: "Observation.category",
      description: "category code should be a recognized observation category for proper routing",
      check: (r: Observation) => {
        const codes = (r.category ?? []).flatMap((c) => c.coding ?? []).map((c) => c.code).filter(Boolean);
        if (codes.length === 0) return null; // covered by category-present
        const hasKnown = codes.some((c) => c && KNOWN_CATEGORIES.has(c));
        if (hasKnown) return null;
        return `Unrecognized category code(s) "${codes.join(", ")}" — will default to measurement table`;
      },
    },
    {
      rule: "observation-value-present",
      severity: "warning",
      path: "Observation.value[x]",
      description: "A value (valueQuantity, valueString, or valueCodeableConcept) is recommended",
      check: (r: Observation) => {
        if (r.valueQuantity?.value != null || r.valueString || r.valueCodeableConcept) return null;
        return "No value[x] — measurement/observation will have null value fields";
      },
    },
    {
      rule: "observation-subject-present",
      severity: "warning",
      path: "Observation.subject",
      description: "subject reference is recommended for person_id linkage",
      check: (r: Observation) =>
        r.subject?.reference
          ? null
          : "No subject reference — person_id will be 0",
    },
  ],
};
