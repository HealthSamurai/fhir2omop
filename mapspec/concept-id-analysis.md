# OMOP `*_concept_id` coverage analysis

Across our 28 edges, there are **64 distinct `*_concept_id` columns** (118
instances). Each must be populated with a `vocab.concept.concept_id`. This
document classifies the FHIR source for each column and the gap to OMOP's
standard vocabulary surface.

Status legend:
- ✅ **mapped** — FHIR source exists, OMOP standard concepts cover all values.
- ⚠️ **partial** — most values covered, some FHIR codes have no OMOP target.
- 🟠 **legacy** — populated with non-standard OMOP concepts (deprecated by CDM v5.4 but still common in production ETLs).
- ❌ **gap** — FHIR carries clinical signal that has **no OMOP target field**. To preserve it we need either (a) a new OMOP concept, (b) a new OMOP CDM field, or (c) the data is dropped.

---

## ✅ Direct mappings — well covered by current Athena bundle

| OMOP column | FHIR source | Target vocab | Standard concepts |
|---|---|---|---|
| `gender_concept_id` | `Patient.gender` / `Practitioner.gender` | Gender | 2 + 8521/8551 (Other/Unknown live in same vocab) |
| `race_concept_id` | `extension[us-core-race].ombCategory` | Race | 1,406 (5 OMB headlines used) |
| `ethnicity_concept_id` | `extension[us-core-ethnicity].ombCategory` | Ethnicity | 150 (2 OMB used) |
| `condition_concept_id` | `Condition.code` (SNOMED direct, ICD10CM/ICD9CM via Maps-to) | SNOMED | 105K |
| `drug_concept_id` | `medication[x]` / `vaccineCode` (RxNorm direct, NDC via Maps-to) | RxNorm | 2.0M |
| `procedure_concept_id` | `Procedure.code` (SNOMED) | SNOMED | 58K |
| `measurement_concept_id` | `Observation.code` | LOINC + SNOMED | 95K |
| `observation_concept_id` | `Observation.code` | SNOMED + LOINC | 132K |
| `device_concept_id` | `Device.type` (SNOMED) | SNOMED Device | 32K |
| `specimen_concept_id` | `Specimen.type` (SNOMED) | SNOMED Specimen | 1.9K |
| `unit_concept_id` | `Quantity.code` (UCUM) | UCUM | 1,039 |
| `route_concept_id` | `dosageInstruction.route.coding` | SNOMED Route | 165 |
| `condition_status_concept_id` | `Condition.clinicalStatus` | Condition Status | 22 |
| `value_as_concept_id` | `Observation.valueCodeableConcept` | SNOMED | (open) |
| `anatomic_site_concept_id` | `Specimen.collection.bodySite` | SNOMED body structure | (open) |
| `language_concept_id` | `presentedForm.language` | Language (ISO 639) | 1 (loaded vocab thin — see below) |
| `currency_concept_id` | n/a (admin) | Currency | 180 (ISO 4217) |
| `*_source_concept_id` (all) | original source `code.coding[].code` | (same source vocab) | per-vocab |

---

## 🟠 Legacy / mis-pointed — using deprecated CDM v5.4 vocabs

CDM v5.4 unified all `*_type_concept_id` fields under the **Type Concept**
vocabulary. The older vocab-specific Type vocabs (`Drug Type`, `Visit Type`,
`Procedure Type`, `Death Type`, `Meas Type`, `Note Type`, `Observation Type`,
`Obs Period Type`, `Condition Type`, `Device Type`, `Specimen Type`,
`Cost Type`, `Visit Type`) contain **zero standard concepts** in the current
bundle — they're deprecated.

Today our edges hardcode legacy IDs like:

| OMOP column | Edge value (legacy) | Vocab | Replacement (CDM v5.4) |
|---|---|---|---|
| `drug_type_concept_id` | 38000177 "Prescription written" | Drug Type (deprecated) | **32838 EHR prescription record** in Type Concept |
| `drug_type_concept_id` | 38000175 "Prescription dispensed in pharmacy" | Drug Type (deprecated) | **32839 EHR dispensing record** |
| `drug_type_concept_id` | 38000179 "Physician administered drug" | Drug Type (deprecated) | **32833 EHR administration record** |
| `drug_type_concept_id` | 44787730 "Patient Self-Reported Medication" | Drug Type (deprecated) | **32865 Patient self-report** (Type Concept) |
| `*_type_concept_id` everywhere | 32817 "EHR" | **Type Concept** ✅ | already correct |

**Action:** sweep all `*_type_concept_id` constants in `mapspec/edges/*.json`
and migrate to Type Concept vocab. Otherwise consumers using strict CDM v5.4
will see non-standard type concepts on every row.

---

## ⚠️ Partial — Athena has *some* concepts but our specific FHIR ValueSet has gaps

| OMOP column | FHIR source | Gap |
|---|---|---|
| `visit_concept_id` | `Encounter.class` (v3-ActCode IMP/AMB/EMER/HH/OBSENC/SS/VR/ACUTE…) | `OBSENC` (Observation encounter), `SS` (Short stay), `ACUTE`, `NONAC` (Non-acute) have no direct OMOP Visit concept. Usually folded into 32037 ICU or 581478 Ambulance — lossy. |
| `admitted_from_concept_id` | `Encounter.hospitalization.admitSource` (FHIR ValueSet `encounter-admit-source`) | Half of FHIR's 13 codes have no clean OMOP analogue (`outp` outpatient dept, `born` born in hospital, `nursing` nursing home — some map, some don't). |
| `discharged_to_concept_id` | `Encounter.hospitalization.dischargeDisposition` | Same — FHIR's 8 codes vs OMOP discharge concepts; `home-hosp` (home health), `aadvice` (against medical advice) need verification per bundle. |
| `condition_type_concept_id` | `Condition.category` (`problem-list-item` vs `encounter-diagnosis`) | OMOP has `32840 EHR problem list` and `32827 EHR encounter diagnosis` — these are 1:1 but the edge has to know to look at `category[0].coding[0].code`. |
| `note_class_concept_id` | `DiagnosticReport.category` (LOINC document classes) | Coverage depends on which LOINC document-ontology subset is loaded; LOINC Document Ontology codes are present but their domain assignment ≠ `Meas Value` — verify. |
| `modifier_concept_id` (Procedure) | `Procedure.bodySite[0]` | Standard SNOMED body structure usually exists, but the column name implies "CPT modifier" — semantic mismatch worth documenting. |
| `meas_event_field_concept_id` / `obs_event_field_concept_id` | n/a (CDM 5.4 cross-reference) | These are internal OMOP "which-field-am-I-referencing" concepts (a closed enum like 1147127 etc). Edges currently leave them as `0` / blank. Fixable, but the FHIR side has nothing to contribute. |

---

## ❌ Gaps — FHIR has clinical data with no OMOP target field

These are signals the FHIR side carries but **OMOP CDM v5.4 has no column for them**. Today they get dropped. Each is a candidate for an OMOP CDM extension or a custom local concept (`concept_id ≥ 2_000_000_000` per OHDSI convention).

| FHIR path | What's lost | OMOP CDM situation | Proposed fix |
|---|---|---|---|
| `AllergyIntolerance.criticality` (`low \| high \| unable-to-assess`) | Risk if exposed | No `criticality_concept_id` | Add custom concepts under "Severity" vocab + store in `observation.qualifier_concept_id` when AllergyIntolerance routes to observation. |
| `AllergyIntolerance.severity` (`mild \| moderate \| severe`) | Reaction severity | No field | Same approach — qualifier_concept_id on observation. |
| `AllergyIntolerance.reaction.manifestation[]` (SNOMED clinical findings) | Symptoms experienced | OMOP has no AllergyIntolerance.reaction — one allergy, one row | Spawn extra observation rows per manifestation. Documented in `mapping_cardinality: fan-out`. |
| `Condition.severity` (SNOMED 24484000 Severe etc.) | Disease severity | No `condition_severity_concept_id` | Either (a) store in `condition_source_value` as suffix, (b) propose new column to OHDSI. Real omop ETLs drop it. |
| `Procedure.outcome` (SNOMED) | Procedure result | No `procedure_outcome_concept_id` | Same — usually dropped. |
| `Procedure.complication[]` | Adverse outcomes | No field | Spawn `condition_occurrence` rows linked by `visit_occurrence_id`. |
| `Patient.maritalStatus` (`M \| D \| W \| S \| L \| P \| T \| U`) | Demographics | No `marital_status_concept_id` on person | Spawn `observation` row with `observation_concept_id` = "Marital status" (LOINC 45404-7 or SNOMED 224125008). |
| `Patient.communication[].language` (BCP-47) | Preferred language | `person` has no `language_concept_id` (note tbl has one) | Spawn observation row, or propose new person column. |
| `Patient.contact[]` (emergency contacts) | Next of kin | No equivalent | Out of scope — fact_relationship can hold; not worth wiring. |
| `Encounter.priority` (e.g. urgent/routine) | Triage priority | No field | Drop. |
| `Observation.method` | How obs was made | `observation` has no method; `measurement` has no method | Spawn qualifier observation, or drop. |
| `MedicationRequest.intent` (`proposal \| plan \| order…`) | Workflow stage | Drug Type partially covers this via the 38000177-family | Mostly served by drug_type_concept_id today. |
| `Specimen.collection.method` (SNOMED) | How collected | No field on specimen | Could route to `note` or drop. |
| `Coverage.relationship` (subscriber vs dependent) | Family role on plan | `payer_plan_period` has no relationship field | Drop or document. |
| `Encounter.reasonCode` / `Encounter.diagnosis` | Reasons + ranked diagnoses | OMOP links via `condition_occurrence.visit_occurrence_id` (no direct field on visit_occurrence) | Spawn condition rows. |

---

## Loaded-vocab gaps surfaced by this analysis

These are bundles to **re-pick on Athena** to close mapping coverage:

- **CVX** — needed for Immunization (currently missing → `drug_concept_id` falls back to RxNorm Maps-to with limited overlap).
- **ICD10PCS** — needed for Procedure source codes (currently can't map ICD-10-PCS at all).
- **CPT4** — needs the licensed post-processor (`cpt.sh` + UMLS API key) to hydrate concept names; rows currently absent.
- **Language** (ISO 639) — only 1 standard concept loaded; if we want full `language_concept_id` we need the full Language vocab.
- **LOINC Document Ontology** — verify the document-class concepts (for `note_class_concept_id`) are domain-tagged correctly in the current bundle.

---

## How "concept requests" become part of the spec

Two structured additions:

1. **`mapspec/concept-requests.json`** — machine-readable list of every gap above (FHIR field → loss + proposed remediation). The runtime emits a warning per row where it skips data.
2. **Per-field flag in `mapspec/edges/<R>__<t>.json`** — add `"concept_status": "mapped" | "partial" | "legacy" | "gap"` on `*_concept_id` fields. The edge-page UI can then surface a banner ("3 fields are gap status") instead of silent loss.
