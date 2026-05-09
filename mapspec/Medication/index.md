# Medication (Vocabulary Resource) → OMOP Mapping

The FHIR `Medication` resource is a **vocabulary / codeable concept**, not a medication event. It does NOT directly produce a `drug_exposure` row. Instead, it gets resolved into the `drug_concept_id` and `drug_source_value` of `drug_exposure` rows produced by the four event resources.

For the four event resources that DO produce `drug_exposure` rows, see:
- `../MedicationRequest/` — prescription/order stage.
- `../MedicationDispense/` — pharmacy dispensing stage.
- `../MedicationAdministration/` — inpatient administration stage.
- `../MedicationStatement/` — patient self-report stage.

## What `Medication` Carries

A FHIR `Medication` resource may include:
- `code` — CodeableConcept with RxNorm / ATC / NDC / SNOMED codings (the primary contribution to `drug_concept_id`).
- `form` — dosage form (tablet, capsule, etc.).
- `ingredient[]` — active substance(s) and strength.
- `manufacturer`, `batch`, etc.

Only `code` and (for some implementations) `ingredient` are used in OMOP mapping. The rest is dropped.

## Resolution Strategies

When an event resource (MedicationRequest/Dispense/Administration/Statement) carries `medicationReference` rather than inline `medicationCodeableConcept`, the implementation must resolve the reference to extract the code:

| Strategy | Implementations | Notes |
|---|---|---|
| **Contained reference** (`#id`) | omoponfhir | Iterates the event resource's `contained[]` array to find the Medication by ID fragment. Extracts `Medication.code` and falls back to `Reference.display` if no code is found. |
| **Bundle merge / two-phase** | fhir-to-omop-demo | The event mapper produces a partial `drug_exposure` row; a separate `Medication.jq` produces matching partial rows; rows are merged by ID in a post-processing phase. |
| **Pre-indexed map** | ETL-German | `MedicationMapper` walks all Medication resources up front and builds a `medication_id_map` keyed by resource ID. Event resource mappers look up references in this map. ATC codes are extracted from the Medication's ingredients. |
| **Inline-only (skip references)** | FhirToCdm, NACHC, fhir-x-omop, this project | Process `medicationCodeableConcept` only. Skip / return null when the event resource has only `medicationReference`. |

## Vocabulary Mappings

The Medication resource's `code` field carries codes from the same vocabularies used in inline `medicationCodeableConcept`:

- **RxNorm** (US, primary OMOP vocabulary).
- **NDC** (US, National Drug Code).
- **ATC** (Europe, used by ETL-German for German MII data).
- **SNOMED CT** (product codes).

For the full vocabulary lookup table, priority order, and code-system URIs, see [`../MedicationRequest/drug_exposure.md#vocabulary-mappings`](../MedicationRequest/drug_exposure.md#vocabulary-mappings) — that table applies identically when resolving the `Medication.code` field.

## OMOP Output Path

The `Medication` resource itself does NOT produce a row in any OMOP table. Its content flows into the event resources' `drug_exposure` rows:

| FHIR `Medication.*` | OMOP field on `drug_exposure` (set by event mapper) |
|---|---|
| `Medication.code.coding[best].code` | `drug_source_value` |
| `Medication.code.coding[best]` (after vocab lookup) | `drug_concept_id`, `drug_source_concept_id` |
| `Medication.ingredient[].itemCodeableConcept` (ATC) | Used by ETL-German as the source for `drug_source_value` |
| `Medication.form` | Not directly mapped to OMOP. Dose form is captured implicitly via `drug_concept_id` (RxNorm products encode form). |

## Reference Implementations (Medication-resolution aspects only)

- **omoponfhir-omopv5-r4-mapping** (Georgia Tech, Java) — Resolves contained `#`-references in event resources. Code paths: `OmopMedicationRequest.java` lines 547-597 (medication resolution including contained ref), `OmopMedicationStatement.java` lines 751-805 (same logic).
- **fhir-to-omop-demo** (jq) — Two-phase merge. `refs/refs/fhir-to-omop-demo/demo/translate/map/Medication.jq` (71 lines) produces partial `drug_exposure` rows with concept info only; these are merged by ID with rows from `MedicationRequest.jq`.
- **ETL-German-FHIR-Core** (OHDSI, Java) — Pre-indexed map. `refs/refs/ETL-German-FHIR-Core/src/main/java/org/miracum/etl/fhirtoomop/mapper/MedicationMapper.java` (274 lines). Walks all Medication resources, builds `medication_id_map` for reference resolution, extracts ATC codes from ingredients.
- **FhirToCdm** (OHDSI, C#), **NACHC**, **fhir-x-omop**, **this project** — Inline-only; medicationReference is skipped.
- **HL7 IG FML** (`refs/refs/fhir-omop-ig/input/maps/medication.fml`) — Maps MedicationStatement only and assumes inline coding. Does not address Medication resource resolution.

## Status in This Project

- `medicationReference` resolution is not implemented in either `src/mapper/medication.ts` or `src/mapper/medication-statement.ts`. Both return null when only `medicationReference` is present.
- The Medication resource itself is not pre-indexed or otherwise consumed.
- TODO: implement contained-reference resolution (omoponfhir-style) as a minimum, and consider pre-indexing for Bundle-level inputs.
