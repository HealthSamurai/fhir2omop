# FHIR R4 → OMOP CDM v5.4 Mapping Overview

This directory contains per-resource mapping specifications for converting FHIR R4 resources to OMOP CDM v5.4 tables. See [_references.md](./_references.md) for external articles, papers, and official resources.

## Resource → OMOP Table Matrix

| FHIR Resource | Primary OMOP Table | Secondary Tables | Status |
|---|---|---|---|
| [Patient](./Patient/) | `person` | `death`, `location`, `observation_period` | Implemented |
| [Encounter](./Encounter/) | `visit_occurrence` | `visit_detail` | Implemented |
| [Condition](./Condition/) | `condition_occurrence` | — | Implemented |
| [Observation](./Observation/) | `measurement`, `observation` | — | Implemented |
| [Procedure](./Procedure/) | `procedure_occurrence` | `drug_exposure`, `device_exposure` | Not implemented |
| [MedicationRequest](./MedicationRequest/) | `drug_exposure` | — | Implemented |
| [MedicationStatement](./MedicationStatement/) | `drug_exposure` | — | Implemented |
| [MedicationDispense](./MedicationDispense/) | `drug_exposure` | — | Not implemented |
| [MedicationAdministration](./MedicationAdministration/) | `drug_exposure` | — | Not implemented |
| [Medication](./Medication/) (vocab) | (referenced concept) | — | Vocabulary linkage only |
| [Immunization](./Immunization/) | `drug_exposure` | — | Not implemented |
| [AllergyIntolerance](./AllergyIntolerance/) | `observation` | — | Implemented |
| [DiagnosticReport](./DiagnosticReport/) | `measurement`, `observation` | `note`, `procedure_occurrence` | Not implemented |
| [Practitioner](./Practitioner/) | `provider` | — | Not implemented |
| [PractitionerRole](./PractitionerRole/) | `provider` (enrichment) | — | Not implemented |
| [Organization](./Organization/) | `care_site` | `location` | Not implemented |
| [Location](./Location/) | `location` | `care_site` | Not implemented |
| [Device](./Device/) | `device_exposure` | — | Not implemented |
| [Specimen](./Specimen/) | `specimen` | — | Not implemented |
| Coverage | `payer_plan_period` | `cost` | Not started — no folder yet |

## Domain Routing

Some FHIR resources can route to different OMOP tables based on the OMOP vocabulary `domain_id` of their coded concepts:

| FHIR Resource | Possible OMOP Targets | Routing Method |
|---|---|---|
| Observation | measurement, observation | Category-based (our impl) or domain lookup |
| Condition | condition_occurrence, observation, procedure_occurrence | Domain lookup (not in our impl) |
| Procedure | procedure_occurrence, drug_exposure, device_exposure, observation | Domain lookup (not in our impl) |
| DiagnosticReport | measurement, observation, procedure_occurrence | Domain lookup |

## Vocabulary Dependencies

| Terminology | Used For | OMOP Vocabulary ID |
|---|---|---|
| SNOMED CT | Conditions, procedures, observations, body sites, allergies | SNOMED |
| LOINC | Lab tests, vitals, observations | LOINC |
| RxNorm | Medications | RxNorm |
| ICD-10-CM | Conditions (source) | ICD10CM |
| ICD-10-PCS | Procedures (source) | ICD10PCS |
| CPT-4 | Procedures (source) | CPT4 |
| CVX | Vaccines | CVX |
| UCUM | Units of measure | UCUM |
| NDC | Drug products (source) | NDC |

All `*_concept_id` fields require vocabulary lookup via OMOP CONCEPT tables (Athena download). Our current implementation uses 0 as placeholder for all concept IDs.

## Type Concepts

OMOP uses `*_type_concept_id` to track data provenance:

| Concept ID | Concept Name | Used For |
|---|---|---|
| 32817 | EHR | Default for all EHR-sourced data |
| 32810 | Claim | Claims-sourced procedures |
| 32840 | Problem list from EHR | Conditions from problem list |
| 38000177 | Prescription written | MedicationRequest |
| 38000175 | Prescription dispensed | MedicationDispense |
| 38000179 | Physician administered drug | MedicationAdministration, Immunization |
| 44787730 | Patient Self-Reported Medication | MedicationStatement |

## Reference Implementations Surveyed

| Project | Language | Direction | Resources Covered | Notes |
|---|---|---|---|---|
| fhir-omop-ig | FML | F→O | 9 (FML maps) | HL7 normative IG, minimal |
| omoponfhir | Java | F↔O | ~20 | Most complete, bidirectional |
| FhirToCdm | C# | F→O | 7 | OHDSI reference, minimal |
| ETL-German-FHIR-Core | Java | F→O | 13 | German MII, most comprehensive ETL |
| NACHC-fhir-to-omop | Java | F→O | 8 | DSTU3, DB-backed vocab |
| fhir-to-omop-demo | jq | F→O | 11 | Lightweight, US Core birthsex |
| fhir-x-omop | Python | F↔O | 9 | Early WIP, lossless round-trip |
| omopfhirmap | Java | F↔O | 6 | Bidirectional, stale |
| mends-on-fhir | Whistle | O→F | 8 | Reverse direction, maintained |
| HealthcareLakeETL | PySpark | F→O | 6 | Abandoned |
| GT-FHIR | Java | F↔O | ~15 | DSTU2, legacy |
| FHIROntopOMOP | R2RML | O→F | ~10 | Virtual graph, reverse |

## Directory Structure

One folder per FHIR ResourceType. Folders are strictly named for the
FHIR resource they document (no meta-groupings).

```
mapspec/
├── _overview.md             ← this file
├── _references.md           ← external links, papers, official IGs
├── TODO.md                  ← tracking
├── AllergyIntolerance/      ← observation
├── Condition/               ← condition_occurrence
├── Device/                  ← device_exposure
├── DiagnosticReport/        ← measurement, observation, note, procedure_occurrence
├── Encounter/               ← visit_occurrence
├── Immunization/            ← drug_exposure
├── Location/                ← location, care_site
├── Medication/              ← vocabulary linkage (no direct OMOP target)
├── MedicationAdministration/← drug_exposure
├── MedicationDispense/      ← drug_exposure
├── MedicationRequest/       ← drug_exposure (canonical drug_exposure field map)
├── MedicationStatement/     ← drug_exposure
├── Observation/             ← measurement, observation
├── Organization/            ← care_site
├── Patient/                 ← person, death, location, observation_period
├── Practitioner/            ← provider
├── PractitionerRole/        ← provider (enrichment of Practitioner)
├── Procedure/               ← procedure_occurrence
└── Specimen/                ← specimen
```
