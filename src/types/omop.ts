// OMOP CDM v5.4 type definitions (subset for mapping)

export interface Person {
  person_id?: number;
  gender_concept_id: number;
  year_of_birth: number;
  month_of_birth?: number | null;
  day_of_birth?: number | null;
  birth_datetime?: string | null;
  race_concept_id: number;
  ethnicity_concept_id: number;
  location_id?: number | null;
  provider_id?: number | null;
  care_site_id?: number | null;
  person_source_value?: string | null;
  gender_source_value?: string | null;
  gender_source_concept_id?: number;
  race_source_value?: string | null;
  race_source_concept_id?: number;
  ethnicity_source_value?: string | null;
  ethnicity_source_concept_id?: number;
}

export interface Location {
  location_id?: number;
  address_1?: string | null;
  address_2?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  county?: string | null;
  country_concept_id?: number;
  country_source_value?: string | null;
  location_source_value?: string | null;
}

export interface Death {
  person_id: number;
  death_date: string;
  death_datetime?: string | null;
  death_type_concept_id: number;
  cause_concept_id?: number;
  cause_source_value?: string | null;
  cause_source_concept_id?: number;
}

export interface VisitOccurrence {
  visit_occurrence_id?: number;
  person_id: number;
  visit_concept_id: number;
  visit_start_date: string;
  visit_start_datetime?: string | null;
  visit_end_date: string;
  visit_end_datetime?: string | null;
  visit_type_concept_id: number;
  provider_id?: number | null;
  care_site_id?: number | null;
  visit_source_value?: string | null;
  visit_source_concept_id?: number;
  admitted_from_concept_id?: number;
  discharged_to_concept_id?: number;
  preceding_visit_occurrence_id?: number | null;
}

export interface ConditionOccurrence {
  condition_occurrence_id?: number;
  person_id: number;
  condition_concept_id: number;
  condition_start_date: string;
  condition_start_datetime?: string | null;
  condition_end_date?: string | null;
  condition_end_datetime?: string | null;
  condition_type_concept_id: number;
  condition_status_concept_id?: number;
  stop_reason?: string | null;
  provider_id?: number | null;
  visit_occurrence_id?: number | null;
  condition_source_value?: string | null;
  condition_source_concept_id?: number;
}

export interface Measurement {
  measurement_id?: number;
  person_id: number;
  measurement_concept_id: number;
  measurement_date: string;
  measurement_datetime?: string | null;
  measurement_type_concept_id: number;
  value_as_number?: number | null;
  value_as_concept_id?: number | null;
  unit_concept_id?: number | null;
  unit_source_value?: string | null;
  range_low?: number | null;
  range_high?: number | null;
  provider_id?: number | null;
  visit_occurrence_id?: number | null;
  measurement_source_value?: string | null;
  measurement_source_concept_id?: number;
}

export interface OmopObservation {
  observation_id?: number;
  person_id: number;
  observation_concept_id: number;
  observation_date: string;
  observation_datetime?: string | null;
  observation_type_concept_id: number;
  value_as_number?: number | null;
  value_as_string?: string | null;
  value_as_concept_id?: number | null;
  unit_concept_id?: number | null;
  unit_source_value?: string | null;
  provider_id?: number | null;
  visit_occurrence_id?: number | null;
  observation_source_value?: string | null;
  observation_source_concept_id?: number;
}

export interface DrugExposure {
  drug_exposure_id?: number;
  person_id: number;
  drug_concept_id: number;
  drug_exposure_start_date: string;
  drug_exposure_start_datetime?: string | null;
  drug_exposure_end_date?: string | null;
  drug_exposure_end_datetime?: string | null;
  drug_type_concept_id: number;
  stop_reason?: string | null;
  refills?: number | null;
  quantity?: number | null;
  days_supply?: number | null;
  route_concept_id?: number | null;
  route_source_value?: string | null;
  provider_id?: number | null;
  visit_occurrence_id?: number | null;
  drug_source_value?: string | null;
  drug_source_concept_id?: number;
}

/** Result of mapping a Patient resource — may produce multiple OMOP records */
export interface PatientMappingResult {
  person: Person | null;
  location: Location | null;
  death: Death | null;
}

/** Observation mapping result — routes to measurement or observation */
export interface ObservationMappingResult {
  measurement: Measurement | null;
  observation: OmopObservation | null;
}
