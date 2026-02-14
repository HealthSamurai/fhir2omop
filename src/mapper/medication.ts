import type { MedicationRequest } from "../types/fhir";
import type { DrugExposure } from "../types/omop";
import { toDate } from "../utils/date";
import { selectBestCoding, getSourceValue } from "../utils/codeable";
import { MappingContext } from "../mapping-context";

/** Only map requests with these statuses */
const VALID_STATUSES = new Set(["active", "completed"]);

/** Type concept: Prescription written */
const TYPE_CONCEPT_PRESCRIPTION = 38000177;

/** Map a FHIR MedicationRequest to OMOP DRUG_EXPOSURE */
export function mapMedicationRequest(request: MedicationRequest, ctx: MappingContext = new MappingContext()): DrugExposure | null {
  // Status filter
  if (!VALID_STATUSES.has(request.status)) {
    return null;
  }

  // Must have medication code
  if (!request.medicationCodeableConcept?.coding?.length) {
    return null;
  }

  const startDate = request.authoredOn ? toDate(request.authoredOn) : null;
  if (!startDate) {
    return null;
  }

  const bestCoding = selectBestCoding(request.medicationCodeableConcept);
  const sourceValue = bestCoding?.code ?? getSourceValue(request.medicationCodeableConcept);

  const endDate = request.dispenseRequest?.validityPeriod?.end
    ? toDate(request.dispenseRequest.validityPeriod.end)
    : null;

  const quantity = request.dosageInstruction?.[0]?.doseAndRate?.[0]?.doseQuantity?.value ?? null;
  const routeCoding = request.dosageInstruction?.[0]?.route?.coding?.[0];

  return {
    drug_exposure_id: request.id ? ctx.ids.getId("MedicationRequest", request.id) : undefined,
    person_id: ctx.ids.resolveRef(request.subject) ?? 0,
    drug_concept_id: 0, // Requires vocabulary lookup
    drug_exposure_start_date: startDate,
    drug_exposure_start_datetime: request.authoredOn ?? null,
    drug_exposure_end_date: endDate,
    drug_exposure_end_datetime: request.dispenseRequest?.validityPeriod?.end ?? null,
    drug_type_concept_id: TYPE_CONCEPT_PRESCRIPTION,
    stop_reason: null,
    refills: request.dispenseRequest?.numberOfRepeatsAllowed ?? null,
    quantity,
    days_supply: null,
    route_concept_id: null, // Would need vocab lookup
    route_source_value: routeCoding?.display ?? routeCoding?.code ?? null,
    provider_id: ctx.ids.resolveRef(request.requester),
    visit_occurrence_id: ctx.ids.resolveRef(request.encounter),
    drug_source_value: sourceValue,
    drug_source_concept_id: 0,
  };
}
