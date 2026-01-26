# FHIR R4 to OMOP CDM v5.4 Mapping Overview

This document outlines the suggested mappings between FHIR R4 resources and OMOP CDM tables.

## Core Clinical Mappings

### Person & Demographics

| FHIR Resource | OMOP Table | Notes |
|---------------|------------|-------|
| **Patient** | **person** | Core demographics: gender, birth date, race, ethnicity |
| Patient.address | location | Patient address → location table |
| Patient.deceased[x] | death | Death date and cause |
| Patient (observation_period derived) | observation_period | Derived from earliest/latest clinical events |

### Encounters & Visits

| FHIR Resource | OMOP Table | Notes |
|---------------|------------|-------|
| **Encounter** | **visit_occurrence** | Inpatient, outpatient, ER visits |
| Encounter (detailed) | visit_detail | Sub-visits, transfers, detailed stay info |
| EpisodeOfCare | episode | Longitudinal care episodes (e.g., oncology) |
| Encounter + Condition/Procedure | episode_event | Links events to episodes |

### Conditions & Diagnoses

| FHIR Resource | OMOP Table | Notes |
|---------------|------------|-------|
| **Condition** | **condition_occurrence** | Diagnoses, problems, health concerns |
| Condition (aggregated) | condition_era | Derived: continuous condition periods |

### Medications

| FHIR Resource | OMOP Table | Notes |
|---------------|------------|-------|
| **MedicationRequest** | **drug_exposure** | Prescriptions, orders |
| **MedicationDispense** | **drug_exposure** | Pharmacy dispensing |
| **MedicationAdministration** | **drug_exposure** | Administered medications (inpatient) |
| **MedicationStatement** | **drug_exposure** | Patient-reported medications |
| Immunization | drug_exposure | Vaccines (type_concept distinguishes) |
| drug_exposure (aggregated) | drug_era | Derived: continuous drug periods |
| drug_exposure (aggregated) | dose_era | Derived: continuous dose periods |

### Procedures

| FHIR Resource | OMOP Table | Notes |
|---------------|------------|-------|
| **Procedure** | **procedure_occurrence** | Surgical, diagnostic, therapeutic procedures |
| ServiceRequest | procedure_occurrence | Procedure orders (if completed) |

### Observations & Measurements

| FHIR Resource | OMOP Table | Notes |
|---------------|------------|-------|
| **Observation** (lab results) | **measurement** | Laboratory tests with numeric/coded results |
| **Observation** (vitals) | **measurement** | Vital signs: BP, HR, temp, weight, height |
| **Observation** (other clinical) | **observation** | Social history, lifestyle, assessments |
| DiagnosticReport | measurement / observation | Results container → individual measurements |
| Observation (survey/questionnaire) | observation | Patient-reported outcomes |

### Devices

| FHIR Resource | OMOP Table | Notes |
|---------------|------------|-------|
| **DeviceUseStatement** | **device_exposure** | Device usage records |
| **Procedure** (with device) | **device_exposure** | Implanted devices |
| DeviceRequest | device_exposure | Device orders (if fulfilled) |

### Specimens

| FHIR Resource | OMOP Table | Notes |
|---------------|------------|-------|
| **Specimen** | **specimen** | Biological samples |

### Clinical Notes

| FHIR Resource | OMOP Table | Notes |
|---------------|------------|-------|
| **DocumentReference** | **note** | Clinical documents |
| **DiagnosticReport.conclusion** | **note** | Narrative conclusions |
| Composition | note | Structured clinical documents |
| note (NLP processed) | note_nlp | Derived: NLP extractions |

## Administrative Mappings

### Providers & Organizations

| FHIR Resource | OMOP Table | Notes |
|---------------|------------|-------|
| **Practitioner** | **provider** | Individual healthcare providers |
| **PractitionerRole** | **provider** | Provider with specialty/role context |
| **Organization** | **care_site** | Healthcare facilities, departments |
| **Location** | **location** | Physical addresses |
| Location (facility) | care_site | Facility locations |

### Financial & Coverage

| FHIR Resource | OMOP Table | Notes |
|---------------|------------|-------|
| **Coverage** | **payer_plan_period** | Insurance coverage periods |
| **Claim** | **cost** | Claim-level costs |
| **ExplanationOfBenefit** | **cost** | Adjudicated costs, payments |
| ChargeItem | cost | Itemized charges |

## Special Mappings

### Allergy & Adverse Events

| FHIR Resource | OMOP Table | Notes |
|---------------|------------|-------|
| **AllergyIntolerance** | **observation** | Allergies as observations (no dedicated OMOP table) |
| **AdverseEvent** | **observation** | Adverse events as observations |

### Family History

| FHIR Resource | OMOP Table | Notes |
|---------------|------------|-------|
| **FamilyMemberHistory** | **observation** | Family history as observations |

### Death

| FHIR Resource | OMOP Table | Notes |
|---------------|------------|-------|
| Patient.deceasedDateTime | **death** | Death date |
| Observation (cause of death) | death | death_type_concept_id, cause_concept_id |

### Relationships

| FHIR Resource | OMOP Table | Notes |
|---------------|------------|-------|
| Various resource references | **fact_relationship** | Links between clinical facts |

## Vocabulary Mappings

FHIR terminologies must be mapped to OMOP standard vocabularies:

| FHIR Terminology | OMOP Vocabulary | Usage |
|------------------|-----------------|-------|
| SNOMED CT | SNOMED | Conditions, procedures, observations |
| LOINC | LOINC | Measurements, observations |
| RxNorm | RxNorm / RxNorm Extension | Medications |
| ICD-10-CM | ICD10CM | Conditions (source) |
| ICD-10-PCS | ICD10PCS | Procedures (source) |
| CPT | CPT4 | Procedures (source) |
| NDC | NDC | Drug products (source) |
| CVX | CVX | Vaccines |
| UCUM | UCUM | Units of measure |
| HL7 AdministrativeGender | Gender | Male, Female, Unknown |
| OMB Race/Ethnicity | Race / Ethnicity | Demographics |

## Mapping Complexity

### Direct Mappings (1:1)
- Patient → person
- Encounter → visit_occurrence
- Condition → condition_occurrence
- Procedure → procedure_occurrence
- Specimen → specimen

### Context-Dependent Mappings
- Observation → **measurement** (if lab/vital) OR **observation** (if social/lifestyle)
- MedicationRequest/Dispense/Administration/Statement → drug_exposure (different type_concept)

### Derived/Aggregated Tables
- observation_period ← derived from all clinical events
- condition_era ← aggregated from condition_occurrence
- drug_era ← aggregated from drug_exposure
- dose_era ← aggregated from drug_exposure

### No Direct OMOP Equivalent
| FHIR Resource | Suggested OMOP Approach |
|---------------|------------------------|
| CarePlan | observation or custom extension |
| Goal | observation |
| CareTeam | provider + fact_relationship |
| Appointment | visit_occurrence (if completed) |
| Task | Not typically mapped |
| Consent | metadata or custom extension |
| QuestionnaireResponse | observation (individual answers) |

## Key Mapping Considerations

1. **Concept Mapping**: All codes must map to OMOP concept_ids via source_to_concept_map or standard vocabulary lookups

2. **Type Concepts**: OMOP uses *_type_concept_id to distinguish data provenance:
   - EHR data vs claims vs patient-reported
   - Primary vs secondary diagnosis

3. **Date Handling**: FHIR uses dateTime/Period; OMOP uses separate date and datetime columns

4. **Reference Resolution**: FHIR references must resolve to OMOP foreign keys (person_id, visit_occurrence_id, provider_id, etc.)

5. **Units**: FHIR Quantity.unit (UCUM) should map to OMOP unit_concept_id

6. **Status Filtering**: Only map FHIR resources with appropriate status (e.g., Condition.clinicalStatus = active, Encounter.status = finished)

## References

- [HL7 FHIR to OMOP IG](https://build.fhir.org/ig/HL7/fhir-omop-ig/)
- [OHDSI FHIR to CDM](https://github.com/OHDSI/ETL-Synthea) (Synthea example)
- [CodeX FHIR to OMOP Cookbook](https://codex-hl7-fhir-accelerator.github.io/fhir2omop-cookbook/)
