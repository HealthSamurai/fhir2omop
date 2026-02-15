import type { AllergyIntolerance } from "../types/fhir";
import type { OmopObservation } from "../types/omop";
import { toDate } from "../utils/date";
import { selectBestCoding, getSourceValue } from "../utils/codeable";
import { MappingContext } from "../mapping-context";

/** Accepted clinical statuses — only active allergies */
const VALID_CLINICAL_STATUSES = new Set(["active"]);

/** Verification statuses that should be rejected */
const REJECTED_VERIFICATION_STATUSES = new Set(["entered-in-error", "refuted"]);

/** EHR type concept */
const TYPE_CONCEPT_EHR = 32817;

/** Build value_as_string from reaction manifestations */
function getReactionString(allergy: AllergyIntolerance): string | null {
  if (!allergy.reaction?.length) return null;
  const manifestations: string[] = [];
  for (const reaction of allergy.reaction) {
    for (const m of reaction.manifestation) {
      const text = m.coding?.[0]?.display ?? m.text;
      if (text) manifestations.push(text);
    }
  }
  return manifestations.length > 0 ? manifestations.join("; ") : null;
}

/** Map a FHIR AllergyIntolerance to OMOP OBSERVATION */
export function mapAllergyIntolerance(
  allergy: AllergyIntolerance,
  ctx: MappingContext = new MappingContext(),
): OmopObservation | null {
  // Status filter
  if (!isValidAllergyIntolerance(allergy)) return null;

  // Must have a code
  if (!allergy.code?.coding?.length) return null;

  const observationDate = allergy.onsetDateTime ? toDate(allergy.onsetDateTime) : null;
  if (!observationDate) return null;

  const bestCoding = selectBestCoding(allergy.code);

  return {
    observation_id: allergy.id ? ctx.ids.getId("AllergyIntolerance", allergy.id) : undefined,
    person_id: ctx.ids.resolveRef(allergy.patient) ?? 0,
    observation_concept_id: 0, // Requires vocabulary lookup — placeholder
    observation_date: observationDate,
    observation_datetime: allergy.onsetDateTime ?? null,
    observation_type_concept_id: TYPE_CONCEPT_EHR,
    value_as_number: null,
    value_as_string: getReactionString(allergy),
    value_as_concept_id: null, // Would need vocab lookup for reaction manifestation
    qualifier_concept_id: null,
    unit_concept_id: null,
    unit_source_value: null,
    provider_id: ctx.ids.resolveRef(allergy.recorder),
    visit_occurrence_id: ctx.ids.resolveRef(allergy.encounter),
    observation_source_value: bestCoding?.code ?? getSourceValue(allergy.code),
    observation_source_concept_id: 0,
    qualifier_source_value: allergy.type ?? null,
    value_source_value: allergy.criticality ?? null,
  };
}

function isValidAllergyIntolerance(allergy: AllergyIntolerance): boolean {
  const clinicalCode = allergy.clinicalStatus?.coding?.[0]?.code;
  const verificationCode = allergy.verificationStatus?.coding?.[0]?.code;

  // If verification status is entered-in-error or refuted, always skip
  if (verificationCode && REJECTED_VERIFICATION_STATUSES.has(verificationCode)) return false;

  // If clinicalStatus is present, it must be active
  if (clinicalCode && !VALID_CLINICAL_STATUSES.has(clinicalCode)) return false;

  return true;
}
