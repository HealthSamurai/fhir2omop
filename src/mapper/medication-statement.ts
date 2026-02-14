import type { MedicationStatement } from "../types/fhir";
import type { DrugExposure } from "../types/omop";
import { toDate } from "../utils/date";
import { selectBestCoding, getSourceValue } from "../utils/codeable";
import { resolveReferenceAsNumber } from "../utils/reference";

/** Only map statements with these statuses */
const VALID_STATUSES = new Set(["active", "completed"]);

/** Type concept: Patient Self-Reported Medication */
const TYPE_CONCEPT_PATIENT_REPORTED = 44787730;

/** Map a FHIR MedicationStatement to OMOP DRUG_EXPOSURE */
export function mapMedicationStatement(statement: MedicationStatement): DrugExposure | null {
  // Status filter
  if (!VALID_STATUSES.has(statement.status)) {
    return null;
  }

  // Must have medication code
  if (!statement.medicationCodeableConcept?.coding?.length) {
    return null;
  }

  // Must have effective date
  const startDate = statement.effectiveDateTime
    ? toDate(statement.effectiveDateTime)
    : statement.effectivePeriod?.start
      ? toDate(statement.effectivePeriod.start)
      : null;

  if (!startDate) {
    return null;
  }

  const bestCoding = selectBestCoding(statement.medicationCodeableConcept);
  const sourceValue = bestCoding?.code ?? getSourceValue(statement.medicationCodeableConcept);

  const endDate = statement.effectivePeriod?.end
    ? toDate(statement.effectivePeriod.end)
    : null;

  const quantity = statement.dosage?.[0]?.doseAndRate?.[0]?.doseQuantity?.value ?? null;
  const routeCoding = statement.dosage?.[0]?.route?.coding?.[0];

  return {
    person_id: resolveReferenceAsNumber(statement.subject) ?? 0,
    drug_concept_id: 0, // Requires vocabulary lookup
    drug_exposure_start_date: startDate,
    drug_exposure_start_datetime: statement.effectiveDateTime ?? statement.effectivePeriod?.start ?? null,
    drug_exposure_end_date: endDate,
    drug_exposure_end_datetime: statement.effectivePeriod?.end ?? null,
    drug_type_concept_id: TYPE_CONCEPT_PATIENT_REPORTED,
    stop_reason: null,
    refills: null,
    quantity,
    days_supply: null,
    route_concept_id: null, // Would need vocab lookup
    route_source_value: routeCoding?.display ?? routeCoding?.code ?? null,
    provider_id: resolveReferenceAsNumber(statement.informationSource),
    visit_occurrence_id: resolveReferenceAsNumber(statement.context),
    drug_source_value: sourceValue,
    drug_source_concept_id: 0,
  };
}
