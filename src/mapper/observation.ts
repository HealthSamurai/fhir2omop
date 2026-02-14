import type { Observation } from "../types/fhir";
import type { Measurement, OmopObservation, ObservationMappingResult } from "../types/omop";
import { toDate } from "../utils/date";
import { selectBestCoding, getSourceValue } from "../utils/codeable";
import { MappingContext } from "../mapping-context";

/** Only map observations with these statuses */
const VALID_STATUSES = new Set(["final", "amended", "corrected"]);

/** EHR type concept */
const TYPE_CONCEPT_EHR = 32817;

/** LOINC codes that are measurements (labs and vitals) */
const MEASUREMENT_CATEGORIES = new Set(["laboratory", "vital-signs"]);

/** Observation categories that route to observation table */
const OBSERVATION_CATEGORIES = new Set(["social-history", "survey", "activity"]);

/**
 * Determine if an Observation should go to measurement or observation table.
 * Uses category-based routing since we don't have a vocabulary DB for domain lookup.
 */
export function routeObservation(observation: Observation): "measurement" | "observation" {
  const categories = observation.category ?? [];
  for (const cat of categories) {
    for (const coding of cat.coding ?? []) {
      if (coding.code && MEASUREMENT_CATEGORIES.has(coding.code)) return "measurement";
      if (coding.code && OBSERVATION_CATEGORIES.has(coding.code)) return "observation";
    }
  }
  // Default: measurement (labs are more common)
  return "measurement";
}

/** Map a FHIR Observation to OMOP MEASUREMENT or OBSERVATION */
export function mapObservation(observation: Observation, ctx: MappingContext = new MappingContext()): ObservationMappingResult {
  // Status filter
  if (!VALID_STATUSES.has(observation.status)) {
    return { measurement: null, observation: null };
  }

  // Must have a code
  if (!observation.code?.coding?.length) {
    return { measurement: null, observation: null };
  }

  const effectiveDate = observation.effectiveDateTime ? toDate(observation.effectiveDateTime) : null;
  if (!effectiveDate) {
    return { measurement: null, observation: null };
  }

  const route = routeObservation(observation);
  const bestCoding = selectBestCoding(observation.code);
  const sourceValue = bestCoding?.code ?? getSourceValue(observation.code);

  if (route === "measurement") {
    const measurement: Measurement = {
      measurement_id: observation.id ? ctx.ids.getId("Observation", observation.id) : undefined,
      person_id: ctx.ids.resolveRef(observation.subject) ?? 0,
      measurement_concept_id: 0, // Requires vocabulary lookup
      measurement_date: effectiveDate,
      measurement_datetime: observation.effectiveDateTime ?? null,
      measurement_type_concept_id: TYPE_CONCEPT_EHR,
      value_as_number: observation.valueQuantity?.value ?? null,
      value_as_concept_id: null, // Would need vocab lookup for valueCodeableConcept
      unit_concept_id: null, // Would need UCUM lookup
      unit_source_value: observation.valueQuantity?.unit ?? null,
      range_low: observation.referenceRange?.[0]?.low?.value ?? null,
      range_high: observation.referenceRange?.[0]?.high?.value ?? null,
      provider_id: ctx.ids.resolveRef(observation.performer?.[0]),
      visit_occurrence_id: ctx.ids.resolveRef(observation.encounter),
      measurement_source_value: sourceValue,
      measurement_source_concept_id: 0,
    };
    return { measurement, observation: null };
  }

  const omopObs: OmopObservation = {
    observation_id: observation.id ? ctx.ids.getId("Observation", observation.id) : undefined,
    person_id: ctx.ids.resolveRef(observation.subject) ?? 0,
    observation_concept_id: 0, // Requires vocabulary lookup
    observation_date: effectiveDate,
    observation_datetime: observation.effectiveDateTime ?? null,
    observation_type_concept_id: TYPE_CONCEPT_EHR,
    value_as_number: observation.valueQuantity?.value ?? null,
    value_as_string: observation.valueString ?? null,
    value_as_concept_id: null,
    unit_concept_id: null,
    unit_source_value: observation.valueQuantity?.unit ?? null,
    provider_id: ctx.ids.resolveRef(observation.performer?.[0]),
    visit_occurrence_id: ctx.ids.resolveRef(observation.encounter),
    observation_source_value: sourceValue,
    observation_source_concept_id: 0,
  };
  return { measurement: null, observation: omopObs };
}
