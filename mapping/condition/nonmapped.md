# Condition — Unmapped Elements

FHIR Condition elements with no direct mapping to OMOP CONDITION_OCCURRENCE.

| FHIR Element | Reason | Potential Approach |
|---|---|---|
| `severity` | No column in condition_occurrence | Create separate observation record |
| `bodySite` | No column in condition_occurrence | Map to observation or note |
| `stage` | No column in condition_occurrence | Create separate observation/measurement record |
| `evidence` | No column in condition_occurrence | Link to observation records |
| `note` | No column in condition_occurrence | Map to note_nlp table |
| `identifier` | No standard field | Could store in condition_source_value |
| `verificationStatus` | Used only for filtering | No OMOP equivalent beyond filtering |
| `onset[x]` as Age/Range/String | Imprecise temporal data | Requires patient context for calculation |
| `abatement[x]` as Age/Range | Imprecise temporal data | Requires patient context |
| `recorder` vs `asserter` | OMOP has a single provider_id | asserter is priority; recorder is fallback |
