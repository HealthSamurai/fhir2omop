# AllergyIntolerance.reaction → OMOP OBSERVATION value_as_string

## Source

FHIR `AllergyIntolerance.reaction[]` — array of reactions:
- `reaction[].manifestation[]` — CodeableConcept with manifestations (Hives, Nausea, etc.)

## Target

OMOP OBSERVATION:
- `value_as_string` (varchar(60)) — textual description of reactions

## Mapping

All manifestations from all reactions are collected into a single string, separated by `"; "`.

For each manifestation:
1. `manifestation.coding[0].display` — preferred
2. `manifestation.text` — fallback

## Examples

| FHIR reactions | value_as_string |
|---|---|
| 1 reaction, 1 manifestation: Hives | `"Hives"` |
| 1 reaction, 2 manifestations: Hives, SOB | `"Hives; Shortness of breath"` |
| 2 reactions: Hives + Nausea | `"Hives; Nausea"` |
| No reactions | null |

## Additional mappings

| FHIR | OMOP | Notes |
|---|---|---|
| `type` (allergy/intolerance) | `qualifier_source_value` | Type of allergic reaction |
| `criticality` (low/high/unable-to-assess) | `value_source_value` | Criticality |

## Unmapped reaction fields

| FHIR | Reason |
|---|---|
| `reaction.substance` | No separate field; allergen code is in the main `code` |
| `reaction.severity` | No direct equivalent |
| `reaction.exposureRoute` | No direct equivalent |
| `reaction.onset` | No direct equivalent (reaction date) |
| `reaction.note` | No column |
