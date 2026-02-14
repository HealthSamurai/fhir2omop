import type { Encounter } from "../types/fhir";
import type { VisitOccurrence } from "../types/omop";
import { toDate } from "../utils/date";
import { resolveReferenceAsNumber } from "../utils/reference";

/** FHIR Encounter.class code → OMOP visit_concept_id */
const VISIT_CONCEPT: Record<string, number> = {
  IMP: 9201,       // Inpatient Visit
  ACUTE: 9201,     // Acute (treated as inpatient)
  AMB: 9202,       // Outpatient Visit
  EMER: 9203,      // Emergency Room Visit
  HH: 581476,      // Home Visit
  SS: 9202,        // Short Stay → Outpatient
  OBSENC: 9201,    // Observation Encounter → Inpatient
  FLD: 9202,       // Field → Outpatient
  VR: 9202,        // Virtual → Outpatient
};

/** Only map encounters with these statuses */
const VALID_STATUSES = new Set(["finished", "in-progress"]);

/** EHR type concept */
const VISIT_TYPE_EHR = 32817;

/** Map a FHIR Encounter to OMOP VISIT_OCCURRENCE */
export function mapEncounter(encounter: Encounter): VisitOccurrence | null {
  // Status filter
  if (!VALID_STATUSES.has(encounter.status)) {
    return null;
  }

  // Must have a period with at least a start date
  if (!encounter.period?.start) {
    return null;
  }

  const visitConceptId = VISIT_CONCEPT[encounter.class?.code ?? ""] ?? 0;
  const startDate = toDate(encounter.period.start);
  const endDate = encounter.period.end ? toDate(encounter.period.end) : startDate;

  return {
    person_id: resolveReferenceAsNumber(encounter.subject) ?? 0,
    visit_concept_id: visitConceptId,
    visit_start_date: startDate,
    visit_start_datetime: encounter.period.start,
    visit_end_date: endDate,
    visit_end_datetime: encounter.period.end ?? null,
    visit_type_concept_id: VISIT_TYPE_EHR,
    provider_id: resolveReferenceAsNumber(encounter.participant?.[0]?.individual),
    care_site_id: resolveReferenceAsNumber(encounter.serviceProvider),
    visit_source_value: encounter.class?.code ?? null,
    visit_source_concept_id: 0,
    admitted_from_concept_id: 0,
    discharged_to_concept_id: 0,
  };
}
