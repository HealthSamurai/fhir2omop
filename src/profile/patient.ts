import type { OmopProfile } from "./types";
import type { Patient } from "../types/fhir";

/** OMOP profile for FHIR Patient — constraints for Person table mapping */
export const PatientProfile: OmopProfile = {
  resourceType: "Patient",
  name: "OmopPatient",
  description:
    "Constraints on FHIR Patient to ensure successful mapping to OMOP Person, Location, and Death tables. " +
    "Requires birthDate (year_of_birth is mandatory in OMOP). Gender should use the FHIR administrative gender value set. " +
    "Race and ethnicity require US Core extensions with OMB categories.",
  rules: [
    {
      rule: "patient-birthdate-required",
      severity: "error",
      path: "Patient.birthDate",
      description: "birthDate is required — OMOP person.year_of_birth is mandatory",
      check: (r: Patient) =>
        r.birthDate ? null : "birthDate is required for OMOP person.year_of_birth",
    },
    {
      rule: "patient-birthdate-format",
      severity: "error",
      path: "Patient.birthDate",
      description: "birthDate must be a valid FHIR date (YYYY, YYYY-MM, or YYYY-MM-DD)",
      check: (r: Patient) => {
        if (!r.birthDate) return null; // covered by required rule
        if (/^\d{4}(-\d{2}(-\d{2})?)?$/.test(r.birthDate)) return null;
        return `Invalid date format: "${r.birthDate}" — expected YYYY, YYYY-MM, or YYYY-MM-DD`;
      },
    },
    {
      rule: "patient-gender-valueset",
      severity: "warning",
      path: "Patient.gender",
      description: "gender should be one of: male, female, other, unknown",
      check: (r: Patient) => {
        if (!r.gender) return null; // gender is optional (maps to concept 0)
        const valid = new Set(["male", "female", "other", "unknown"]);
        if (valid.has(r.gender)) return null;
        return `Unrecognized gender "${r.gender}" — will map to concept_id 0`;
      },
    },
    {
      rule: "patient-identifier-present",
      severity: "warning",
      path: "Patient.identifier",
      description: "At least one identifier is recommended for person_source_value",
      check: (r: Patient) =>
        r.identifier?.length || r.id
          ? null
          : "No identifier or id — person_source_value will be empty",
    },
    {
      rule: "patient-deceased-datetime",
      severity: "warning",
      path: "Patient.deceased[x]",
      description:
        "If patient is deceased, deceasedDateTime is preferred over deceasedBoolean for death record creation",
      check: (r: Patient) => {
        if (r.deceasedBoolean === true && !r.deceasedDateTime) {
          return "deceasedBoolean is true but deceasedDateTime is missing — no death record will be created";
        }
        return null;
      },
    },
    {
      rule: "patient-race-extension",
      severity: "warning",
      path: "Patient.extension(us-core-race)",
      description: "US Core race extension with OMB category is recommended for race_concept_id",
      check: (r: Patient) => {
        const ext = r.extension?.find(
          (e) => e.url === "http://hl7.org/fhir/us/core/StructureDefinition/us-core-race"
        );
        if (!ext) return "No US Core race extension — race_concept_id will be 0";
        const omb = ext.extension?.find((e) => e.url === "ombCategory");
        if (!omb?.valueCoding?.code) return "US Core race extension missing ombCategory coding";
        return null;
      },
    },
    {
      rule: "patient-ethnicity-extension",
      severity: "warning",
      path: "Patient.extension(us-core-ethnicity)",
      description: "US Core ethnicity extension with OMB category is recommended for ethnicity_concept_id",
      check: (r: Patient) => {
        const ext = r.extension?.find(
          (e) => e.url === "http://hl7.org/fhir/us/core/StructureDefinition/us-core-ethnicity"
        );
        if (!ext) return "No US Core ethnicity extension — ethnicity_concept_id will be 0";
        const omb = ext.extension?.find((e) => e.url === "ombCategory");
        if (!omb?.valueCoding?.code) return "US Core ethnicity extension missing ombCategory coding";
        return null;
      },
    },
  ],
};
