import type { Condition } from "../types/fhir";
import type { ConditionOccurrence } from "../types/omop";
import { toDate } from "../utils/date";
import { selectBestCoding, getSourceValue } from "../utils/codeable";
import { resolveReferenceAsNumber } from "../utils/reference";

/** Accepted clinical statuses (active conditions) */
const VALID_CLINICAL_STATUSES = new Set(["active", "recurrence", "relapse"]);

/** Accepted verification statuses */
const VALID_VERIFICATION_STATUSES = new Set(["confirmed", "unconfirmed", "provisional", "differential"]);

/** Type concepts based on category */
const TYPE_CONCEPT: Record<string, number> = {
  "problem-list-item": 32840,
  "encounter-diagnosis": 32817,
};

/** Default type concept (EHR) */
const TYPE_CONCEPT_EHR = 32817;

/** Map a FHIR Condition to OMOP CONDITION_OCCURRENCE */
export function mapCondition(condition: Condition): ConditionOccurrence | null {
  // Status filter
  if (!isValidCondition(condition)) {
    return null;
  }

  // Must have a code
  if (!condition.code?.coding?.length) {
    return null;
  }

  const bestCoding = selectBestCoding(condition.code);
  const startDate = condition.onsetDateTime ? toDate(condition.onsetDateTime) : null;

  // If no onset date, we still create the record with a placeholder
  // Many conditions in EHRs don't have a documented onset
  if (!startDate) {
    return null;
  }

  const categoryCode = condition.category?.[0]?.coding?.[0]?.code;
  const typeConceptId = categoryCode ? (TYPE_CONCEPT[categoryCode] ?? TYPE_CONCEPT_EHR) : TYPE_CONCEPT_EHR;

  return {
    person_id: resolveReferenceAsNumber(condition.subject) ?? 0,
    condition_concept_id: 0, // Requires vocabulary lookup — placeholder
    condition_start_date: startDate,
    condition_start_datetime: condition.onsetDateTime ?? null,
    condition_end_date: condition.abatementDateTime ? toDate(condition.abatementDateTime) : null,
    condition_end_datetime: condition.abatementDateTime ?? null,
    condition_type_concept_id: typeConceptId,
    condition_status_concept_id: 0,
    stop_reason: condition.abatementString ?? null,
    provider_id: resolveReferenceAsNumber(condition.asserter),
    visit_occurrence_id: resolveReferenceAsNumber(condition.encounter),
    condition_source_value: bestCoding?.code ?? getSourceValue(condition.code),
    condition_source_concept_id: 0,
  };
}

function isValidCondition(condition: Condition): boolean {
  const clinicalCode = condition.clinicalStatus?.coding?.[0]?.code;
  const verificationCode = condition.verificationStatus?.coding?.[0]?.code;

  // If entered-in-error, always skip
  if (verificationCode === "entered-in-error") return false;

  // If clinicalStatus is present, it must be valid
  if (clinicalCode && !VALID_CLINICAL_STATUSES.has(clinicalCode)) return false;

  // If verificationStatus is present, it must be valid
  if (verificationCode && !VALID_VERIFICATION_STATUSES.has(verificationCode)) return false;

  return true;
}
