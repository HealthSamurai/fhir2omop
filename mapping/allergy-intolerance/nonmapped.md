# AllergyIntolerance — Unmapped Elements

FHIR AllergyIntolerance elements with no direct mapping to OMOP OBSERVATION.

| FHIR Element | Reason | Potential Approach |
|---|---|---|
| `category` (food/medication/environment/biologic) | No direct OMOP equivalent | Map to qualifier_source_value |
| `asserter` | OMOP has a single provider_id; recorder is used | Alternative: prioritize asserter |
| `onsetAge` | Requires patient birthDate | Compute when context is available |
| `onsetPeriod` | Only onsetDateTime is supported | Use period.start |
| `onsetRange` | Imprecise temporal data | Not applicable |
| `onsetString` | Free text | NLP extraction |
| `lastOccurrence` | No column | Date of last reaction |
| `note` | No column | Map to note_nlp |
| `reaction.substance` | No separate field | Allergen is in the main code |
| `reaction.severity` | No direct equivalent | Map to value_as_string |
| `reaction.exposureRoute` | No direct equivalent | Exposure route |
| `reaction.onset` | No direct equivalent | Date of specific reaction |
| `identifier` | No standard field | Could store in observation_source_value |
