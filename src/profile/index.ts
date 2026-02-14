export type { OmopProfile, ProfileRule, ValidationResult, ValidationIssue, IssueSeverity } from "./types";
export { validate } from "./validate";
export { PatientProfile } from "./patient";
export { EncounterProfile } from "./encounter";
export { ConditionProfile } from "./condition";
export { ObservationProfile } from "./observation";
export { MedicationRequestProfile } from "./medication";

import type { OmopProfile } from "./types";
import { PatientProfile } from "./patient";
import { EncounterProfile } from "./encounter";
import { ConditionProfile } from "./condition";
import { ObservationProfile } from "./observation";
import { MedicationRequestProfile } from "./medication";

/** Registry of all OMOP profiles by resource type */
export const profiles: Record<string, OmopProfile> = {
  Patient: PatientProfile,
  Encounter: EncounterProfile,
  Condition: ConditionProfile,
  Observation: ObservationProfile,
  MedicationRequest: MedicationRequestProfile,
};

/** Get the OMOP profile for a resource type, or null if none defined */
export function getProfile(resourceType: string): OmopProfile | null {
  return profiles[resourceType] ?? null;
}
