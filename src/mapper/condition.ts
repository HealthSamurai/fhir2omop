import type { Condition } from "../types/fhir";
import type { ConditionOccurrence } from "../types/omop";
import { toDate } from "../utils/date";
import { selectBestCoding, getSourceValue } from "../utils/codeable";
import { MappingContext } from "../mapping-context";

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

/** Clinical status → condition_status_concept_id */
const STATUS_CONCEPT: Record<string, number> = {
  active: 32902,
  recurrence: 32902,
  relapse: 32902,
};

/**
 * Resolve the start date from onset[x] with recordedDate fallback.
 * Returns [date (YYYY-MM-DD), datetime (full string or null)].
 */
function resolveStartDate(condition: Condition): [string, string | null] | null {
  // 1. onsetDateTime — primary
  if (condition.onsetDateTime) {
    return [toDate(condition.onsetDateTime), condition.onsetDateTime];
  }
  // 2. onsetPeriod.start
  if (condition.onsetPeriod?.start) {
    return [toDate(condition.onsetPeriod.start), condition.onsetPeriod.start];
  }
  // 3. recordedDate — fallback
  if (condition.recordedDate) {
    return [toDate(condition.recordedDate), condition.recordedDate];
  }
  return null;
}

/**
 * Resolve the end date from abatement[x].
 * Returns [date (YYYY-MM-DD), datetime (full string or null)].
 */
function resolveEndDate(condition: Condition): [string, string | null] | null {
  // 1. abatementDateTime — primary
  if (condition.abatementDateTime) {
    return [toDate(condition.abatementDateTime), condition.abatementDateTime];
  }
  // 2. abatementPeriod.end
  if (condition.abatementPeriod?.end) {
    return [toDate(condition.abatementPeriod.end), condition.abatementPeriod.end];
  }
  return null;
}

/** Map a FHIR Condition to OMOP CONDITION_OCCURRENCE */
export function mapCondition(condition: Condition, ctx: MappingContext = new MappingContext()): ConditionOccurrence | null {
  // Status filter
  if (!isValidCondition(condition)) {
    return null;
  }

  // Must have a code
  if (!condition.code?.coding?.length) {
    return null;
  }

  // Resolve start date with fallback chain
  const startDate = resolveStartDate(condition);
  if (!startDate) {
    return null;
  }

  const bestCoding = selectBestCoding(condition.code);
  const [conditionStartDate, conditionStartDatetime] = startDate;
  const endDate = resolveEndDate(condition);

  const categoryCode = condition.category?.[0]?.coding?.[0]?.code;
  const typeConceptId = categoryCode ? (TYPE_CONCEPT[categoryCode] ?? TYPE_CONCEPT_EHR) : TYPE_CONCEPT_EHR;

  const clinicalCode = condition.clinicalStatus?.coding?.[0]?.code;
  const statusConceptId = clinicalCode ? (STATUS_CONCEPT[clinicalCode] ?? 0) : 0;

  // Provider: prefer asserter, fall back to recorder
  const providerRef = condition.asserter ?? condition.recorder;

  return {
    condition_occurrence_id: condition.id ? ctx.ids.getId("Condition", condition.id) : undefined,
    person_id: ctx.ids.resolveRef(condition.subject) ?? 0,
    condition_concept_id: 0, // Requires vocabulary lookup — placeholder
    condition_start_date: conditionStartDate,
    condition_start_datetime: conditionStartDatetime,
    condition_end_date: endDate ? endDate[0] : null,
    condition_end_datetime: endDate ? endDate[1] : null,
    condition_type_concept_id: typeConceptId,
    condition_status_concept_id: statusConceptId,
    stop_reason: condition.abatementString ?? null,
    provider_id: ctx.ids.resolveRef(providerRef),
    visit_occurrence_id: ctx.ids.resolveRef(condition.encounter),
    visit_detail_id: null,
    condition_source_value: bestCoding?.code ?? getSourceValue(condition.code),
    condition_source_concept_id: 0,
    condition_status_source_value: clinicalCode ?? null,
  };
}

function isValidCondition(condition: Condition): boolean {
  const clinicalCode = condition.clinicalStatus?.coding?.[0]?.code;
  const verificationCode = condition.verificationStatus?.coding?.[0]?.code;

  // If entered-in-error or refuted, always skip
  if (verificationCode === "entered-in-error") return false;
  if (verificationCode === "refuted") return false;

  // If clinicalStatus is present, it must be valid
  if (clinicalCode && !VALID_CLINICAL_STATUSES.has(clinicalCode)) return false;

  // If verificationStatus is present, it must be valid
  if (verificationCode && !VALID_VERIFICATION_STATUSES.has(verificationCode)) return false;

  return true;
}
