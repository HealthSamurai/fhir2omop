# FHIR-to-OMOP Gap Analysis

## Current State

6 mappers implemented covering 8 OMOP tables:

| FHIR Resource | OMOP Table(s) | Status |
|---------------|---------------|--------|
| Patient | person, location, death | Done |
| Encounter | visit_occurrence | Done |
| Condition | condition_occurrence | Done |
| Observation | measurement, observation | Done |
| MedicationRequest | drug_exposure | Done |
| MedicationStatement | drug_exposure | Done |

---

## Missing Clinical Mappings

### Priority 1 — High Impact

These are implemented by 3+ reference projects and cover core OMOP clinical tables.

#### 1. Procedure -> procedure_occurrence

**Why**: Procedures are a core OMOP clinical domain. Supported by HL7 IG, FhirToCdm, ETL-German, omoponfhir. Already spec'd in `spec/procedure.md` and planned in `plan.md`.

| FHIR Field | OMOP Field |
|------------|------------|
| code | procedure_concept_id / procedure_source_value |
| performed[x] | procedure_date / procedure_datetime |
| performedPeriod.end | procedure_end_date |
| subject | person_id |
| encounter | visit_occurrence_id |
| performer[].actor | provider_id |
| bodySite | modifier_concept_id |

Vocabularies: SNOMED, CPT4, ICD-10-PCS, HCPCS.
Status filter: `completed` only.

#### 2. Immunization -> drug_exposure

**Why**: Vaccines are drugs in OMOP. Supported by HL7 IG, FhirToCdm, ETL-German. Already spec'd in `spec/immunization.md`. Simple mapper — single-event with CVX codes.

| FHIR Field | OMOP Field |
|------------|------------|
| vaccineCode | drug_concept_id / drug_source_value |
| occurrenceDateTime | drug_exposure_start_date (= end_date) |
| patient | person_id |
| encounter | visit_occurrence_id |
| performer[].actor | provider_id |
| lotNumber | lot_number |
| doseQuantity | quantity |
| route | route_concept_id / route_source_value |

Type concept: 38000179 (Physician administered drug).
CVX vocabulary required.

#### 3. AllergyIntolerance -> observation

**Why**: Allergies are common clinical data with no dedicated OMOP table. Supported by HL7 IG, FhirToCdm, omoponfhir. Already spec'd in `spec/allergy-intolerance.md`.

| FHIR Field | OMOP Field |
|------------|------------|
| code | observation_concept_id / observation_source_value |
| onsetDateTime | observation_date |
| patient | person_id |
| encounter | visit_occurrence_id |
| recorder | provider_id |
| reaction[].manifestation | value_as_concept_id |
| type (allergy\|intolerance) | qualifier_concept_id |

Status filter: `active`, `confirmed` only.

### Priority 2 — Administrative / Supporting

These populate OMOP tables referenced by FK from clinical tables. Without them, `provider_id`, `care_site_id`, and `visit_detail_id` remain unresolved.

#### 4. Practitioner / PractitionerRole -> provider

**Why**: Clinical mappers already extract `provider_id` from references (performer, requester, asserter) but there is no mapper to actually populate the `provider` table with name, specialty, NPI etc. This is a dangling FK.

| FHIR Field | OMOP Field |
|------------|------------|
| name | provider_name |
| identifier (NPI) | provider_source_value |
| PractitionerRole.specialty | specialty_concept_id / specialty_source_value |
| PractitionerRole.organization | care_site_id |

#### 5. Organization -> care_site

**Why**: Encounter mapper references `care_site_id` via `serviceProvider`. No mapper populates the `care_site` table.

| FHIR Field | OMOP Field |
|------------|------------|
| name | care_site_name |
| identifier | care_site_source_value |
| type | place_of_service_concept_id |
| address | location_id (FK to location) |

#### 6. Encounter (visit_detail level) -> visit_detail

**Why**: OMOP `visit_detail` captures sub-visits (ward transfers, department stays). Only ETL-German implements this but it matters for inpatient analytics. Lower priority than the above.

| FHIR Field | OMOP Field |
|------------|------------|
| Encounter (partOf != null) | visit_detail_id |
| class | visit_detail_concept_id |
| period | visit_detail_start/end_date |
| location | care_site_id |

### Priority 3 — Extended Clinical

#### 7. DiagnosticReport -> measurement / observation / note

**Why**: DiagnosticReport wraps lab panels and radiology reports. Only ETL-German fully implements this. The `result` references to Observations are already handled, but `conclusionCode` and narrative `conclusion` are lost.

Key fields: `code` (LOINC), `conclusionCode` (SNOMED), `conclusion` (text -> note table), `effectiveDateTime`.

#### 8. MedicationDispense -> drug_exposure

**Why**: Captures actual pharmacy dispensing (vs. orders in MedicationRequest). Different type_concept_id (32838 = EHR dispensing). Listed in `spec/overview.md` but no spec file or mapper exists.

#### 9. MedicationAdministration -> drug_exposure

**Why**: Captures inpatient medication administrations with exact timing and dose. Different type_concept_id (38000179 = Physician administered drug). Listed in `spec/overview.md` but no spec file.

#### 10. Specimen -> specimen

**Why**: Links lab measurements to biological samples. Direct 1:1 mapping. Listed in overview but no spec.

#### 11. DocumentReference / Composition -> note

**Why**: Clinical notes are valuable for NLP pipelines (note_nlp table). Listed in overview but no spec.

---

## Missing Cross-Cutting Concerns

### A. observation_period (derived table)

**What**: OMOP requires `observation_period` — the time window during which a patient's data is expected to be captured. Derived from earliest/latest events per patient.

**Gap**: No generation logic exists. This is required for most OMOP analytics tools (ATLAS, CohortDiagnostics).

### B. Vocabulary Lookup (concept_id resolution)

**What**: All mappers currently set `*_concept_id = 0` and store codes in `*_source_value`. Real OMOP usage requires mapping source codes to standard concept_ids via Athena vocabularies.

**Gap**: `plan.md` includes vocabulary loader design but nothing is implemented. Without this, the output is not usable for standard OMOP analytics.

### C. Domain-Based Routing

**What**: ETL-German routes Condition/Observation/Procedure to different OMOP tables based on concept `domain_id`. For example, a Condition with a SNOMED code in the "Observation" domain should go to `observation`, not `condition_occurrence`.

**Gap**: Current mappers use simple category-based routing (Observation) or fixed table (Condition). No vocabulary-driven domain routing exists.

### D. Unit Concept Resolution

**What**: FHIR Quantity uses UCUM units; OMOP needs `unit_concept_id`. Current mappers store `unit_source_value` but `unit_concept_id = 0`.

**Gap**: No UCUM-to-OMOP concept mapping.

---

## Summary Matrix

| # | Mapping | OMOP Table | Priority | Refs | Spec |
|---|---------|------------|----------|------|------|
| 1 | Procedure | procedure_occurrence | P1 | 4/4 | Yes |
| 2 | Immunization | drug_exposure | P1 | 3/4 | Yes |
| 3 | AllergyIntolerance | observation | P1 | 3/4 | Yes |
| 4 | Practitioner | provider | P2 | 3/4 | No |
| 5 | Organization | care_site | P2 | 3/4 | No |
| 6 | Encounter (detail) | visit_detail | P2 | 1/4 | No |
| 7 | DiagnosticReport | measurement/note | P3 | 1/4 | Yes |
| 8 | MedicationDispense | drug_exposure | P3 | 2/4 | No |
| 9 | MedicationAdministration | drug_exposure | P3 | 2/4 | No |
| 10 | Specimen | specimen | P3 | 1/4 | No |
| 11 | DocumentReference | note | P3 | 0/4 | No |
| A | observation_period | observation_period | P1 | all | No |
| B | Vocabulary lookup | (all tables) | P1 | all | No |
| C | Domain routing | (all tables) | P2 | 2/4 | No |
| D | Unit concept mapping | (all tables) | P2 | 3/4 | No |

## Recommended Next Steps

1. **Procedure, Immunization, AllergyIntolerance** — specs already written, straightforward to implement following existing mapper patterns
2. **Practitioner + Organization** — resolve dangling FKs in existing mappers
3. **observation_period generation** — required for OMOP tooling compatibility
4. **Vocabulary integration** — move from concept_id=0 to real lookups
