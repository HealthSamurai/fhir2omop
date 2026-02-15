import type { Procedure } from "../types/fhir";
import type { ProcedureOccurrence } from "../types/omop";
import { toDate } from "../utils/date";
import { selectBestCoding, getSourceValue } from "../utils/codeable";
import { MappingContext } from "../mapping-context";

/** Only completed procedures map to OMOP procedure_occurrence */
const VALID_STATUSES = new Set(["completed"]);

/** Default type concept: EHR */
const TYPE_CONCEPT_EHR = 32817;

/** Map a FHIR Procedure to OMOP PROCEDURE_OCCURRENCE */
export function mapProcedure(procedure: Procedure, ctx: MappingContext = new MappingContext()): ProcedureOccurrence | null {
  // Status filter: only completed
  if (!VALID_STATUSES.has(procedure.status)) {
    return null;
  }

  // Must have a code
  if (!procedure.code?.coding?.length) {
    return null;
  }

  // Must have a performed date
  const performedDateTime = procedure.performedDateTime ?? procedure.performedPeriod?.start;
  if (!performedDateTime) {
    return null;
  }

  const bestCoding = selectBestCoding(procedure.code);
  const startDate = toDate(performedDateTime);

  // First performer's actor maps to provider_id
  const performerRef = procedure.performer?.[0]?.actor;

  // First body site maps to modifier
  const bodySite = procedure.bodySite?.[0];

  return {
    procedure_occurrence_id: procedure.id ? ctx.ids.getId("Procedure", procedure.id) : undefined,
    person_id: ctx.ids.resolveRef(procedure.subject) ?? 0,
    procedure_concept_id: 0, // Requires vocabulary lookup
    procedure_date: startDate,
    procedure_datetime: performedDateTime ?? null,
    procedure_end_date: procedure.performedPeriod?.end ? toDate(procedure.performedPeriod.end) : null,
    procedure_end_datetime: procedure.performedPeriod?.end ?? null,
    procedure_type_concept_id: TYPE_CONCEPT_EHR,
    modifier_concept_id: 0, // Requires vocabulary lookup
    provider_id: ctx.ids.resolveRef(performerRef),
    visit_occurrence_id: ctx.ids.resolveRef(procedure.encounter),
    procedure_source_value: bestCoding?.code ?? getSourceValue(procedure.code),
    procedure_source_concept_id: 0,
    modifier_source_value: bodySite ? (selectBestCoding(bodySite)?.code ?? getSourceValue(bodySite)) : null,
  };
}
