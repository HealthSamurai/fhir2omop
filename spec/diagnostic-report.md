# DiagnosticReport ↔ OMOP Mapping

## Overview

| FHIR Resource | OMOP Table | Direction |
|---------------|------------|-----------|
| DiagnosticReport | OBSERVATION, MEASUREMENT, PROCEDURE_OCCURRENCE | FHIR → OMOP |

**Note**: Domain-based routing - target table depends on LOINC code domain.

## Field Mapping

| FHIR Field | OMOP Field |
|------------|------------|
| `code` (LOINC) | `*_concept_id` |
| `conclusionCode` (SNOMED) | `*_source_concept_id` |
| `effectiveDateTime` | `*_date/datetime` |
| `subject` | `person_id` |
| `encounter` | `visit_occurrence_id` |
| `category` | `*_type_concept_id` |

## Implementations

- **ETL-German-FHIR-Core**: `DiagnosticReportMapper.java` - full implementation with domain routing
