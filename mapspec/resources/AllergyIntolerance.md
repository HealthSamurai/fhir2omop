# AllergyIntolerance → OMOP Mapping

FHIR `AllergyIntolerance` records patient allergies and intolerances. OMOP has no dedicated allergy table — allergies are stored as observations with allergy-specific SNOMED concepts.

## Target OMOP Tables

| OMOP Table | Purpose | Required? |
|---|---|---|
| `observation` | One row per allergy/intolerance | Yes |

## Mapping Strategy

1. **Target table.** All implementations agree: AllergyIntolerance → OMOP `observation`. The allergy substance code maps to `observation_concept_id` (SNOMED allergy concepts) or `value_as_concept_id` (substance concept, with a category concept in `observation_concept_id`). Reaction manifestations can map to `value_as_string` or create separate observation rows.

2. **observation_concept_id strategy.** Two approaches exist. omoponfhir uses category-based concept selection: `food` allergy → 4188027 ("Allergy to food"), `medication` → 439224 ("Allergy to drug"), default → 40772948 ("Allergy"). This approach places the substance in `value_as_concept_id`. Other implementations (FhirToCdm, HL7 IG FML) look up the substance code directly in the OMOP vocabulary and place it in `observation_concept_id`. This project currently uses 0 as a placeholder — vocabulary lookup is required.

3. **Date handling.** `AllergyIntolerance.onsetDateTime` → `observation_date`. Fallback chain: `onsetPeriod.start` → `recordedDate`. If none exist, the allergy is skipped (this project) or the encounter date is used (FhirToCdm).

4. **Status filtering.** `clinicalStatus` = `active` should be mapped. `inactive` and `resolved` represent historical state and are skipped. `verificationStatus` = `entered-in-error` or `refuted` should always be skipped. When `clinicalStatus` is absent, map permissively.

5. **Allergy type.** `AllergyIntolerance.type` (`allergy` vs `intolerance`) and `category` (`food`, `medication`, `environment`, `biologic`) inform the observation_concept_id selection in omoponfhir. This project stores `type` in `qualifier_source_value`. No standard OMOP concept exists for type/criticality.

6. **Reactions.** `AllergyIntolerance.reaction[].manifestation` maps to `value_as_string` (concatenated display names). The first manifestation could also map to `value_as_concept_id` with vocabulary lookup. The HL7 IG FML maps reaction manifestation code directly to `value_as_concept_id`.

7. **Provider resolution.** `recorder` (who documented it) and `asserter` (who states it's true) are both candidates for `provider_id`. This project prefers `asserter`, falling back to `recorder`. omoponfhir uses `recorder` only.

## Reference Implementations

- **fhir-omop-ig** (HL7) — FML at `refs/refs/fhir-omop-ig/input/maps/Allergy.fml` (51 lines). Maps `code` → `observation_concept_id`, `onset` → `observation_date`, `reaction.manifestation` → `value_as_concept_id`. Patient/encounter/provider references are commented out (TODO). Status: draft.
- **omoponfhir** (Georgia Tech, Java) — `refs/refs/omoponfhir-omopv5-r4-mapping/src/main/java/edu/gatech/chai/omoponfhir/omopv5/r4/mapping/OmopAllergyIntolerance.java` (449 lines). Bidirectional. Category-driven concept selection (food→4188027, medication→439224, default→40772948). Substance → `value_as_concept_id`. Type concept = 38000280 ("Observation recorded from EHR"). Status: maintained.
- **omoponfhir-v54** (Georgia Tech, Java, v5.4) — `refs/refs/omoponfhir-v54-r4/omoponfhir-omopv5-r4-mapping/src/main/java/edu/gatech/chai/omoponfhir/omopv5/r4/mapping/OmopAllergyIntolerance.java` (450 lines). Identical logic to omoponfhir. Status: maintained.
- **FhirToCdm** (OHDSI, C#) — `refs/refs/FhirToCdm/FhirToCdmMappings.cs` lines 453-480 `CreateObservation()`. Maps AllergyIntolerance → observation via vocabulary lookup on `code`. Uses `recordedDate` for date. No status filtering. Minimal field coverage.
- **fhir-to-omop-demo** (jq) — `refs/refs/fhir-to-omop-demo/demo/translate/map/AllergyIntolerance.jq` (48 lines). Maps to **condition_occurrence** (not observation) — divergent approach. Uses `recordedDate` for start date. Type concept = 32817.
- **ETL-German-FHIR-Core** — No dedicated AllergyIntolerance mapper.
- **NACHC-fhir-to-omop** — No dedicated AllergyIntolerance mapper (handles via generic observation).

## Status in This Project

Implemented: `src/mapper/allergy-intolerance.ts` (103 lines). Tests: `tests/allergy-intolerance.test.ts` (312 lines). Maps substance code, onset date with fallback chain, recorder/asserter, reaction manifestations, type, criticality. Status filtering implemented. Vocabulary lookup is placeholder (concept_id = 0).
