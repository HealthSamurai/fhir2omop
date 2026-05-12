# FHIR CodeSystem / ValueSet → OMOP concept_id mapping registry

Inventory of every FHIR system / ValueSet URL referenced by our profiles
(`mapspec/profiles/`) and edges (`mapspec/edges/`), with the lookup path to an
OMOP `concept_id`. Loaded vocab counts are from the current Athena bundle
(`vocab.vocabulary`, ~59 vocabularies).

The categories below classify the lookup strategy. The runtime needs an
adapter for each.

---

## A. Canonical vocabulary — direct lookup

FHIR system URL maps 1:1 to an OMOP `vocabulary_id`. Resolve with:

```sql
SELECT concept_id, concept_name, domain_id, standard_concept
FROM vocab.concept
WHERE vocabulary_id = ? AND concept_code = ?
```

| FHIR system URL | OMOP `vocabulary_id` | Loaded? | Used by |
|---|---|---|---|
| `http://snomed.info/sct` | `SNOMED` | ✅ (~360K standard) | Condition, Procedure, Observation, AllergyIntolerance, Device, Specimen, Route, Encounter.class extensions |
| `http://loinc.org` | `LOINC` | ✅ (~88K standard) | Observation, Measurement, DiagnosticReport |
| `http://www.nlm.nih.gov/research/umls/rxnorm` | `RxNorm` | ✅ (~157K standard) | Medication, MedicationRequest, MedicationStatement, MedicationAdministration, MedicationDispense |

---

## B. URL alias — same content, different identifier

FHIR uses an `hl7.org/fhir/sid/*` shorthand or its own URL; OMOP names the
vocabulary differently. Map the system URL → `vocabulary_id`, then do the
same `concept_code` lookup as in (A).

| FHIR system URL | OMOP `vocabulary_id` | Loaded? | Notes |
|---|---|---|---|
| `http://hl7.org/fhir/sid/icd-10-cm` | `ICD10CM` | ✅ | ICD10CM is **non-standard** in OMOP; resolve to standard SNOMED via `concept_relationship` "Maps to" before writing concept_id. |
| `http://hl7.org/fhir/sid/icd-10-pcs` | `ICD10PCS` | ❌ **NOT loaded** | Add to next Athena bundle pick |
| `http://hl7.org/fhir/sid/ndc` | `NDC` | ✅ (~1.3M) | Non-standard; map to RxNorm via "Maps to" |
| `http://hl7.org/fhir/sid/cvx` | `CVX` | ❌ **NOT loaded** | Vaccine codes — blocks Immunization mapping. Re-bundle. |
| `http://www.ama-assn.org/go/cpt` | `CPT4` | ❌ **NOT loaded** | Needs post-processor (`cpt.sh` + UMLS API key) to hydrate concept names — see `athena/bundle/readme.txt` |
| `https://www.cms.gov/Medicare/Coding/place-of-service-codes` | `CMS Place of Service` | ✅ (63) | Used for Encounter routing → `visit_concept_id`. |

---

## C. Hardcoded enum → `concept_id`

Small fixed FHIR enums where OMOP has matching well-known concepts. These
are NOT looked up by `concept_code` — they're hand-curated maps. Each map
is inline in the relevant edge JSON under `vocabularies[]`.

### `http://hl7.org/fhir/ValueSet/administrative-gender` → `Gender`

| FHIR code | OMOP `concept_id` | OMOP name |
|---|---|---|
| `male` | 8507 | MALE |
| `female` | 8532 | FEMALE |
| `other` | 8521 | OTHER (vocab `Gender`, concept_class Gender — verify per bundle) |
| `unknown` | 8551 | UNKNOWN |
| (absent) | 0 | No matching concept |

Used by: `Patient__person.profile.json`, `Practitioner__provider.profile.json`. Edge: `mapspec/edges/Patient__person.json`.

### US Core race (OMB) → `Race` — `concept_id`

| OMB code | OMOP `concept_id` |
|---|---|
| `1002-5` | 8657 (American Indian or Alaska Native) |
| `2028-9` | 8515 (Asian) |
| `2054-5` | 8516 (Black or African American) |
| `2076-8` | 8557 (Native Hawaiian or Other Pacific Islander) |
| `2106-3` | 8527 (White) |

### US Core ethnicity (OMB) → `Ethnicity`

| OMB code | OMOP `concept_id` |
|---|---|
| `2135-2` | 38003563 (Hispanic or Latino) |
| `2186-5` | 38003564 (Not Hispanic or Latino) |

### `http://terminology.hl7.org/CodeSystem/v3-ActCode` → `Visit`

| FHIR `class.code` | OMOP `concept_id` |
|---|---|
| `IMP` | 9201 (Inpatient Visit) |
| `AMB` | 9202 (Outpatient Visit) |
| `EMER` | 9203 (Emergency Room Visit) |
| `OBSENC` | 581478 (Ambulance Visit) — verify |
| `HH` | 581476 (Home Visit) |
| `VR` (virtual) | 722455 (Telehealth) |
| `SS` (short stay) | 32037 (Intensive Care) — debatable |

Used by `Encounter__visit_occurrence.profile.json` as the routing key (class → visit_concept_id).

---

## D. Status filters — NOT mapped to concept_id

These FHIR ValueSets gate **which instances qualify for conversion** but
their codes don't become OMOP concept_ids. They serve as profile-level
filters (kept in the FHIR validation step).

| FHIR ValueSet | Filter rule | Used by |
|---|---|---|
| `http://hl7.org/fhir/ValueSet/observation-status` | accept `final`, `amended`, `corrected`; reject `entered-in-error`, `preliminary`, `cancelled`, `registered` | Observation profiles, DiagnosticReport |
| `http://hl7.org/fhir/ValueSet/condition-ver-status` | reject `entered-in-error` | Condition |
| `http://hl7.org/fhir/ValueSet/encounter-status` | accept `finished`, `in-progress`; reject `cancelled`, `entered-in-error`, `planned` | Encounter |
| `http://hl7.org/fhir/ValueSet/event-status` | (generic) accept `completed`, `in-progress` | Procedure, MedicationAdministration |
| `http://hl7.org/fhir/ValueSet/diagnostic-report-status` | accept `final`, `amended`, `corrected` | DiagnosticReport |
| `http://hl7.org/fhir/ValueSet/medicationrequest-status` | accept `active`, `completed`, `stopped` | MedicationRequest |
| `http://hl7.org/fhir/ValueSet/medication-statement-status` | accept `active`, `completed` | MedicationStatement |
| `http://hl7.org/fhir/ValueSet/medication-admin-status` | accept `in-progress`, `completed` | MedicationAdministration |
| `http://hl7.org/fhir/ValueSet/medicationdispense-status` | accept `in-progress`, `completed` | MedicationDispense |
| `http://hl7.org/fhir/ValueSet/allergyintolerance-clinical` | accept `active`, `recurrence`, `relapse`, `resolved` | AllergyIntolerance |
| `http://hl7.org/fhir/ValueSet/allergyintolerance-verification` | reject `entered-in-error`, `refuted` | AllergyIntolerance |
| `http://hl7.org/fhir/ValueSet/location-physical-type` | (no concept mapping — used as routing discriminator for Location → care_site vs location) | Location |

---

## E. Type concepts — derived, not from a FHIR ValueSet

OMOP `*_type_concept_id` tracks data provenance and source resource type.
Hardcoded per-edge constant (no FHIR enum to map), but the profile
choice (which edge fired) determines the value.

| OMOP type concept_id | OMOP name | Set when |
|---|---|---|
| 32817 | EHR | default for any EHR-sourced event |
| 32810 | Claim | claims-sourced procedure |
| 32840 | EHR problem list | Condition with category problem-list-item |
| 32865 | Patient self-report | MedicationStatement, patient-reported AllergyIntolerance |
| 38000175 | Prescription dispensed in pharmacy | MedicationDispense |
| 38000177 | Prescription written | MedicationRequest |
| 38000179 | Physician administered drug | MedicationAdministration, Immunization |
| 44787730 | Patient Self-Reported Medication | MedicationStatement |

These live in edge JSON `fields[]` with `constant: 32817` (etc.) on `*_type_concept_id` rows.

---

## F. Other / verify

| FHIR system URL | Status | Notes |
|---|---|---|
| `http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation` | Manual map needed | OMOP doesn't have a 1:1; map H/L/N/A → SNOMED concepts (e.g. H=High → 4328749). Curate inline. |

---

## Loaded-vocab gaps (need re-bundling from Athena)

- **CVX** — required for Immunization. Re-pick on Athena and download.
- **CPT4** — selected but needs `sh cpt.sh` post-processor (UMLS API key) to hydrate. Currently no rows in `vocab.concept`.
- **ICD10PCS** — required for Procedure source codes.

## Runtime adapter

The conversion engine needs one resolver function:

```ts
ctx.fns.concept.resolve(ctx, { system, code }) → { concept_id, vocabulary_id, domain_id, standard_concept }
```

Implementation:
1. Look up `system` in `mapspec/profiles/system-aliases.json` (categories A + B) to get `vocabulary_id`.
2. Query `vocab.concept WHERE vocabulary_id = ? AND concept_code = ?`.
3. If non-standard, follow `concept_relationship` "Maps to" to get the standard target.
4. For category C systems, consult the inline edge `vocabularies[]` table instead of the SQL path.

The status / type-concept (D, E) lookups are not part of `concept.resolve` — they live in the per-edge mapper.
