# Condition ↔ OMOP CONDITION_OCCURRENCE Mapping

## Overview

| FHIR Resource | OMOP Table | Direction |
|---------------|------------|-----------|
| Condition | CONDITION_OCCURRENCE | Bidirectional |

## Field Mapping Summary

| FHIR Condition Field | OMOP CONDITION_OCCURRENCE Field | Notes |
|----------------------|--------------------------------|-------|
| `Condition.code` | `condition_concept_id` | Via vocabulary lookup (ICD-10, SNOMED) |
| `Condition.onsetDateTime` | `condition_start_date`, `condition_start_datetime` | Start date |
| `Condition.abatementDateTime` | `condition_end_date`, `condition_end_datetime` | End date |
| `Condition.subject` | `person_id` | Reference resolution |
| `Condition.encounter` | `visit_occurrence_id` | Reference resolution |
| `Condition.asserter` | `provider_id` | Reference resolution |
| `Condition.category` | `condition_type_concept_id` | Problem list vs encounter diagnosis |
| `Condition.clinicalStatus` | `condition_status_concept_id` | Active, resolved, etc. |
| `Condition.code.coding[].code` | `condition_source_value` | Original code |
| `Condition.abatementString` | `stop_reason` | Reason for resolution |

## Type Concept Mapping

| FHIR Category | OMOP Type Concept ID | Description |
|---------------|---------------------|-------------|
| `problem-list-item` | 32840 | Problem list entry |
| `encounter-diagnosis` | 32817 | EHR encounter diagnosis |

---

## Project Implementations

### omoponfhir-v54-r4 (Java)

**Source**: `omoponfhir-omopv5-r4-mapping/.../mapping/OmopCondition.java`

**Direction**: Bidirectional

**Features**:
- ICD-10 and SNOMED vocabulary support
- Clinical status mapping
- Category-based type concept assignment

---

### fhir-omop-ig (FML)

**Source**: `input/maps/condition.fml`

**Direction**: FHIR → OMOP

```fml
group ConditionOccurrence(source src: Condition, target tgt : ConditionOccurrenceTable) {
    src.code as s -> tgt then {
        s.coding as sc -> tgt then {
            sc.code -> tgt.condition_concept_id, 
                       tgt.condition_source_value,
                       tgt.condition_source_concept_id;
        };
    };
    src.onset : dateTime as odt -> 
        tgt.condition_start_date = cast(odt, "date"),
        tgt.condition_start_datetime = odt;
}
```

---

### ETL-German-FHIR-Core (Java)

**Source**: `src/main/java/.../mapper/ConditionMapper.java`

**Direction**: FHIR → OMOP

**Features**:
- ICD-10-GM (German Modification) support
- Primary/secondary diagnosis ranking
- Supports bulk and incremental loading

---

### FhirToCdm (.NET)

**Source**: `FhirToCdmMappings.cs` - `CreateConditionOccurrence()`

**Direction**: FHIR → OMOP

---

## Gaps and Considerations

- **Clinical status**: OMOP `condition_status_concept_id` is newer field, not all projects map it
- **Verification status**: No direct OMOP equivalent
- **Severity**: May require separate observation record
- **Body site**: Limited support in OMOP
