import type { Patient, Encounter, Condition, Observation, MedicationRequest, MedicationStatement } from "../types/fhir";
import type { PatientMappingResult, VisitOccurrence, ConditionOccurrence, ObservationMappingResult, DrugExposure } from "../types/omop";
import type { ValidationResult } from "./types";
import { validate } from "./validate";
import { getProfile } from "./index";
import { mapPatient } from "../mapper/patient";
import { mapEncounter } from "../mapper/encounter";
import { mapCondition } from "../mapper/condition";
import { mapObservation } from "../mapper/observation";
import { mapMedicationRequest } from "../mapper/medication";
import { mapMedicationStatement } from "../mapper/medication-statement";

/** Result of validate-then-map: includes validation details alongside the mapping output */
export interface ValidatedMappingResult<T> {
  validation: ValidationResult;
  result: T | null;
}

/** Validate a FHIR Patient against the OMOP profile, then map if valid */
export function validateAndMapPatient(patient: Patient): ValidatedMappingResult<PatientMappingResult> {
  const profile = getProfile("Patient")!;
  const validation = validate(patient, profile);
  if (!validation.valid) {
    return { validation, result: null };
  }
  return { validation, result: mapPatient(patient) };
}

/** Validate a FHIR Encounter against the OMOP profile, then map if valid */
export function validateAndMapEncounter(encounter: Encounter): ValidatedMappingResult<VisitOccurrence> {
  const profile = getProfile("Encounter")!;
  const validation = validate(encounter, profile);
  if (!validation.valid) {
    return { validation, result: null };
  }
  return { validation, result: mapEncounter(encounter) };
}

/** Validate a FHIR Condition against the OMOP profile, then map if valid */
export function validateAndMapCondition(condition: Condition): ValidatedMappingResult<ConditionOccurrence> {
  const profile = getProfile("Condition")!;
  const validation = validate(condition, profile);
  if (!validation.valid) {
    return { validation, result: null };
  }
  return { validation, result: mapCondition(condition) };
}

/** Validate a FHIR Observation against the OMOP profile, then map if valid */
export function validateAndMapObservation(observation: Observation): ValidatedMappingResult<ObservationMappingResult> {
  const profile = getProfile("Observation")!;
  const validation = validate(observation, profile);
  if (!validation.valid) {
    return { validation, result: null };
  }
  return { validation, result: mapObservation(observation) };
}

/** Validate a FHIR MedicationRequest against the OMOP profile, then map if valid */
export function validateAndMapMedicationRequest(request: MedicationRequest): ValidatedMappingResult<DrugExposure> {
  const profile = getProfile("MedicationRequest")!;
  const validation = validate(request, profile);
  if (!validation.valid) {
    return { validation, result: null };
  }
  return { validation, result: mapMedicationRequest(request) };
}

/** Validate a FHIR MedicationStatement against the OMOP profile, then map if valid */
export function validateAndMapMedicationStatement(statement: MedicationStatement): ValidatedMappingResult<DrugExposure> {
  const profile = getProfile("MedicationStatement")!;
  const validation = validate(statement, profile);
  if (!validation.valid) {
    return { validation, result: null };
  }
  return { validation, result: mapMedicationStatement(statement) };
}

/**
 * Validate any FHIR resource against its OMOP profile.
 * Returns validation result without mapping.
 */
export function validateResource(resource: { resourceType: string }): ValidationResult {
  const profile = getProfile(resource.resourceType);
  if (!profile) {
    return {
      valid: false,
      resourceType: resource.resourceType,
      issues: [{
        severity: "error",
        path: resource.resourceType,
        message: `No OMOP profile defined for resource type "${resource.resourceType}"`,
        rule: "profile-exists",
      }],
    };
  }
  return validate(resource, profile);
}
