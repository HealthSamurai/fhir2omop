# Procedure ↔ OMOP PROCEDURE_OCCURRENCE Mapping

## Overview

| FHIR Resource | OMOP Table | Direction |
|---------------|------------|-----------|
| Procedure | PROCEDURE_OCCURRENCE | Bidirectional |

## Domain-Based Routing

| Concept Domain | OMOP Target Table |
|----------------|-------------------|
| Procedure | procedure_occurrence |
| Drug | drug_exposure |
| Device | device_exposure |
| Observation | observation |

## Field Mapping Summary

| FHIR Procedure Field | OMOP PROCEDURE_OCCURRENCE Field | Notes |
|----------------------|--------------------------------|-------|
| `Procedure.code` | `procedure_concept_id` | Via vocabulary lookup |
| `Procedure.performed[x]` | `procedure_date`, `procedure_datetime` | Start date |
| `Procedure.performedPeriod.end` | `procedure_end_date`, `procedure_end_datetime` | End date |
| `Procedure.subject` | `person_id` | Reference resolution |
| `Procedure.encounter` | `visit_occurrence_id` | Reference resolution |
| `Procedure.performer[].actor` | `provider_id` | Reference resolution |
| `Procedure.bodySite` | `modifier_concept_id` | Body site modifier |
| `Procedure.code.coding[].code` | `procedure_source_value` | Original code |

## Type Concept

| Source | OMOP Type Concept ID | Description |
|--------|---------------------|-------------|
| EHR | 32817 | EHR procedure record |
| Claim | 32810 | Claim procedure |

---

## Project Implementations

### omoponfhir-v54-r4 (Java)

**Source**: `omoponfhir-omopv5-r4-mapping/.../mapping/OmopProcedure.java`

**Direction**: Bidirectional

**Features**:
- Domain-based routing (procedure, drug, device, observation)
- CPT, SNOMED, ICD-10-PCS vocabulary support
- Body site modifier mapping

---

### fhir-omop-ig (FML)

**Source**: `input/maps/procedure.fml`

**Direction**: FHIR → OMOP

```fml
group ProcedureOccurrence(source src: Procedure, target tgt : ProcedureOccurrenceTable) {
    src.code as s -> tgt then {
        s.coding as sc -> tgt then {
            sc.code -> tgt.procedure_concept_id,
                       tgt.procedure_source_value,
                       tgt.procedure_source_concept_id;
        };
    };
    src.performed : dateTime as pdt ->
        tgt.procedure_date = cast(pdt, "date"),
        tgt.procedure_datetime = pdt;
}
```

---

### ETL-German-FHIR-Core (Java)

**Source**: `src/main/java/.../mapper/ProcedureMapper.java`

**Direction**: FHIR → OMOP

**Features**:
- OPS (German procedure classification) support
- Domain-based routing
- Incremental update support

---

### FhirToCdm (.NET)

**Source**: `FhirToCdmMappings.cs` - `CreateProcedureOccurrence()`

**Direction**: FHIR → OMOP

---

## Gaps and Considerations

- **Status mapping**: FHIR has status; OMOP assumes completed
- **Reason/indication**: Requires linking to condition
- **Used devices**: May create device_exposure records
- **Complications**: No direct OMOP field
