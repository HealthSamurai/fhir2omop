import type { Observation, ObservationComponent } from "../types/fhir";
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

/** FHIR Quantity.comparator → OMOP operator_concept_id */
const COMPARATOR_CONCEPTS: Record<string, number> = {
  "<": 4171756,   // Less than
  "<=": 4171754,  // Less than or equal to
  ">=": 4171755,  // Greater than or equal to
  ">": 4172703,   // Greater than
};

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

/** Build a value_source_value string from the raw observation value */
function getValueSourceValue(observation: Observation | ObservationComponent): string | null {
  if (observation.valueQuantity?.value != null) {
    const comparator = observation.valueQuantity.comparator ?? "";
    const unit = observation.valueQuantity.unit ?? "";
    return `${comparator}${observation.valueQuantity.value} ${unit}`.trim();
  }
  if ("valueString" in observation && observation.valueString) return observation.valueString;
  if (observation.valueCodeableConcept) return getSourceValue(observation.valueCodeableConcept);
  return null;
}

/** Extract qualifier_source_value from interpretation */
function getQualifierSourceValue(interpretation?: Observation["interpretation"]): string | null {
  const coding = interpretation?.[0]?.coding?.[0];
  return coding?.code ?? interpretation?.[0]?.text ?? null;
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

  // If observation has components, expand each into its own record
  if (observation.component?.length) {
    return mapComponentObservation(observation, ctx, route, effectiveDate);
  }

  if (route === "measurement") {
    return { measurement: buildMeasurement(observation, observation, ctx, effectiveDate), observation: null };
  }

  return { measurement: null, observation: buildObservation(observation, observation, ctx, effectiveDate) };
}

/** Expand component observations (e.g., blood pressure → systolic + diastolic) */
function mapComponentObservation(
  observation: Observation,
  ctx: MappingContext,
  route: "measurement" | "observation",
  effectiveDate: string,
): ObservationMappingResult {
  const measurements: Measurement[] = [];
  const observations: OmopObservation[] = [];

  for (let i = 0; i < observation.component!.length; i++) {
    const comp = observation.component![i];
    if (!comp.code?.coding?.length) continue;

    if (route === "measurement") {
      measurements.push(buildMeasurement(observation, comp, ctx, effectiveDate, i));
    } else {
      observations.push(buildObservation(observation, comp, ctx, effectiveDate, i));
    }
  }

  return {
    measurement: measurements.length === 1 ? measurements[0] : measurements.length > 0 ? measurements as any : null,
    observation: observations.length === 1 ? observations[0] : observations.length > 0 ? observations as any : null,
  };
}

/** Build a single OMOP Measurement record */
function buildMeasurement(
  observation: Observation,
  valueSource: Observation | ObservationComponent,
  ctx: MappingContext,
  effectiveDate: string,
  componentIndex?: number,
): Measurement {
  const bestCoding = selectBestCoding(valueSource.code ?? observation.code);
  const sourceValue = bestCoding?.code ?? getSourceValue(valueSource.code ?? observation.code);
  const idSuffix = componentIndex != null ? `-comp-${componentIndex}` : "";
  const interpretation = "interpretation" in valueSource ? valueSource.interpretation : observation.interpretation;

  return {
    measurement_id: observation.id ? ctx.ids.getId("Observation", observation.id + idSuffix) : undefined,
    person_id: ctx.ids.resolveRef(observation.subject) ?? 0,
    measurement_concept_id: 0, // Requires vocabulary lookup
    measurement_date: effectiveDate,
    measurement_datetime: observation.effectiveDateTime ?? null,
    measurement_type_concept_id: TYPE_CONCEPT_EHR,
    operator_concept_id: valueSource.valueQuantity?.comparator
      ? (COMPARATOR_CONCEPTS[valueSource.valueQuantity.comparator] ?? null)
      : null,
    value_as_number: valueSource.valueQuantity?.value ?? null,
    value_as_concept_id: null, // Would need vocab lookup for valueCodeableConcept
    unit_concept_id: null, // Would need UCUM lookup
    unit_source_value: valueSource.valueQuantity?.unit ?? null,
    range_low: valueSource.referenceRange?.[0]?.low?.value ?? null,
    range_high: valueSource.referenceRange?.[0]?.high?.value ?? null,
    provider_id: ctx.ids.resolveRef(observation.performer?.[0]),
    visit_occurrence_id: ctx.ids.resolveRef(observation.encounter),
    measurement_source_value: sourceValue,
    measurement_source_concept_id: 0,
    unit_source_concept_id: 0,
    value_source_value: getValueSourceValue(valueSource),
  };
}

/** Build a single OMOP Observation record */
function buildObservation(
  observation: Observation,
  valueSource: Observation | ObservationComponent,
  ctx: MappingContext,
  effectiveDate: string,
  componentIndex?: number,
): OmopObservation {
  const bestCoding = selectBestCoding(valueSource.code ?? observation.code);
  const sourceValue = bestCoding?.code ?? getSourceValue(valueSource.code ?? observation.code);
  const idSuffix = componentIndex != null ? `-comp-${componentIndex}` : "";
  const interpretation = "interpretation" in valueSource ? valueSource.interpretation : observation.interpretation;
  const qualifierSource = getQualifierSourceValue(interpretation);

  return {
    observation_id: observation.id ? ctx.ids.getId("Observation", observation.id + idSuffix) : undefined,
    person_id: ctx.ids.resolveRef(observation.subject) ?? 0,
    observation_concept_id: 0, // Requires vocabulary lookup
    observation_date: effectiveDate,
    observation_datetime: observation.effectiveDateTime ?? null,
    observation_type_concept_id: TYPE_CONCEPT_EHR,
    value_as_number: valueSource.valueQuantity?.value ?? null,
    value_as_string: ("valueString" in valueSource ? valueSource.valueString : null)
      ?? (valueSource.valueCodeableConcept ? getSourceValue(valueSource.valueCodeableConcept) : null)
      ?? null,
    value_as_concept_id: null, // Would need vocab lookup for valueCodeableConcept
    qualifier_concept_id: null, // Would need vocab lookup for interpretation
    unit_concept_id: null,
    unit_source_value: valueSource.valueQuantity?.unit ?? null,
    provider_id: ctx.ids.resolveRef(observation.performer?.[0]),
    visit_occurrence_id: ctx.ids.resolveRef(observation.encounter),
    observation_source_value: sourceValue,
    observation_source_concept_id: 0,
    qualifier_source_value: qualifierSource,
    value_source_value: getValueSourceValue(valueSource),
  };
}
