# Encounter — Unmapped Elements

FHIR Encounter elements with no direct mapping to OMOP VISIT_OCCURRENCE.

| FHIR Element | Reason | Potential Approach |
|---|---|---|
| `type` | No direct column; class already determines visit_concept_id | Could store in visit_source_value or note |
| `serviceType` | No column | Create separate record |
| `priority` | No column | Could map to observation |
| `reasonCode` | No column in visit_occurrence | Map as condition_occurrence with category=encounter-diagnosis |
| `reasonReference` | No column | Link via visit_occurrence_id |
| `diagnosis` | Not mapped to visit_occurrence | Map via Condition resources |
| `hospitalization.admitSource` | admitted_from_concept_id — placeholder 0 | Requires vocabulary lookup |
| `hospitalization.dischargeDisposition` | discharged_to_concept_id — placeholder 0 | Requires vocabulary lookup |
| `hospitalization.dietPreference` | No column | Not applicable |
| `location` | No direct mapping | Map to CARE_SITE |
| `partOf` | Nested encounters | Map to VISIT_DETAIL |
| `participant[1..n]` | OMOP has a single provider_id | Use only the first |
| `length` | No column | Computed from period |
| `identifier` | No standard field | Could store in visit_source_value |
| `account` | No column | Financial data — outside OMOP CDM |
