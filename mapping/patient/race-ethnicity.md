# Patient US Core Race/Ethnicity → OMOP PERSON race/ethnicity fields

## Source

US Core extensions on `Patient`:
- **Race**: `http://hl7.org/fhir/us/core/StructureDefinition/us-core-race`
- **Ethnicity**: `http://hl7.org/fhir/us/core/StructureDefinition/us-core-ethnicity`

Each extension contains nested extensions:
- `ombCategory` — OMB (Office of Management and Budget) category
- `detailed` — detailed code (e.g., specific Asian ethnic group)
- `text` — textual description

We map `ombCategory` as the primary source.

## Target

OMOP PERSON:
- `race_concept_id` (integer, **required**) — FK → CONCEPT
- `race_source_value` (varchar(50)) — original value
- `race_source_concept_id` (integer) — source concept
- `ethnicity_concept_id` (integer, **required**) — FK → CONCEPT
- `ethnicity_source_value` (varchar(50)) — original value
- `ethnicity_source_concept_id` (integer) — source concept

## Race mapping

| OMB Race Code | Display | race_concept_id | OMOP Concept Name |
|---|---|---|---|
| `1002-5` | American Indian or Alaska Native | **8657** | American Indian or Alaska Native |
| `2028-9` | Asian | **8515** | Asian |
| `2054-5` | Black or African American | **8516** | Black or African American |
| `2076-8` | Native Hawaiian or Other Pacific Islander | **8557** | Native Hawaiian or Other Pacific Islander |
| `2106-3` | White | **8527** | White |
| absent | — | **0** | No matching concept |

- `race_source_value` — display from ombCategory coding. If no display — code.
- `race_source_concept_id` — 0 (OMB codes have no direct OMOP source concept).

## Ethnicity mapping

| OMB Ethnicity Code | Display | ethnicity_concept_id | OMOP Concept Name |
|---|---|---|---|
| `2135-2` | Hispanic or Latino | **38003563** | Hispanic or Latino |
| `2186-5` | Not Hispanic or Latino | **38003564** | Not Hispanic or Latino |
| absent | — | **0** | No matching concept |

- `ethnicity_source_value` — display from ombCategory coding. If no display — code.
- `ethnicity_source_concept_id` — 0.

## Decision on missing extensions

If US Core Race/Ethnicity extension is absent:
- `race_concept_id` = 0, `race_source_value` = NULL
- `ethnicity_concept_id` = 0, `ethnicity_source_value` = NULL

Concept 0 = "No matching concept". We do not use 8552 (Unknown) — that is for cases where the value is explicitly stated as "unknown". Absence of the extension means "not recorded", not "unknown".

## Limitations

- US-specific: US Core extensions are not used in Europe
- German data uses `ethnicGroup` extension (SNOMED) — incompatible with US Core
- `race_concept_id` and `ethnicity_concept_id` are required fields in OMOP. Even without data, 0 must be recorded.

## Implementation consensus

| Project | Race Source | Method | When absent |
|---|---|---|---|
| omoponfhir-v54-r4 | US Core ombCategory | Hardcoded map | null |
| FhirToCdm | US Core ombCategory display | Hardcoded map | 0 |
| NACHC | US Core ombCategory | DB lookup | 0 + "Not Available" |
| mends-on-fhir | OMOP concept | ConceptMap JSON | UNK |
| ETL-German-FHIR-Core | German ethnicGroup | SNOMED lookup | 8552 (Unknown) |

We follow the omoponfhir approach with direct OMB code → concept_id mapping and value 0 for missing data.
