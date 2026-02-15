# Observation.category → OMOP domain routing (measurement vs observation)

## Source

FHIR `Observation.category` — CodeableConcept from `observation-category`: laboratory, vital-signs, social-history, survey, activity, imaging, procedure, exam, therapy.

## Target

Determines the target OMOP table: `MEASUREMENT` or `OBSERVATION`.

## Mapping

| FHIR category | OMOP table | Rationale |
|---|---|---|
| `laboratory` | measurement | Laboratory results |
| `vital-signs` | measurement | Vital signs |
| `social-history` | observation | Social data |
| `survey` | observation | Questionnaires (PHQ-9, AUDIT) |
| `activity` | observation | Physical activity |
| absent | measurement | Default — laboratory is the most common case |

## Current limitation

Category-based routing is a simplified approach. A full OMOP ETL determines domain by `concept.domain_id` from Athena vocabulary. For example:
- A SNOMED concept may belong to the Measurement, Condition, or Procedure domain
- A LOINC code may be Measurement or Observation

## Future work

When integrating Athena vocabulary — switch to domain-based routing:
```
domain = athena.lookupDomain(concept_id)
if domain == 'Measurement' → measurement table
if domain == 'Observation' → observation table
```
