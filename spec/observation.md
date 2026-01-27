# Observation ↔ OMOP OBSERVATION/MEASUREMENT Mapping

## Overview

| FHIR Resource | OMOP Table | Direction |
|---------------|------------|-----------|
| Observation | OBSERVATION, MEASUREMENT | Bidirectional |

## Domain-Based Routing

| Concept Domain | OMOP Target Table |
|----------------|-------------------|
| Observation | observation |
| Measurement | measurement |
| Procedure | procedure_occurrence |

## Field Mapping Summary

| FHIR Observation Field | OMOP Field | Notes |
|------------------------|------------|-------|
| `Observation.code` | `*_concept_id` | Via vocabulary lookup |
| `Observation.effectiveDateTime` | `*_date`, `*_datetime` | Date extraction |
| `Observation.valueQuantity.value` | `value_as_number` | Numeric results |
| `Observation.valueCodeableConcept` | `value_as_concept_id` | Coded results |
| `Observation.valueString` | `value_as_string` | Text results |
| `Observation.valueQuantity.unit` | `unit_concept_id` | Unit mapping |
| `Observation.subject` | `person_id` | Reference resolution |
| `Observation.encounter` | `visit_occurrence_id` | Reference resolution |
| `Observation.performer` | `provider_id` | Reference resolution |
| `Observation.category` | (routing logic) | Lab vs vitals vs survey |

---

## Project Implementations

### omoponfhir-v54-r4 (Java)

**Source**: `omoponfhir-omopv5-r4-mapping/.../mapping/OmopObservation.java`

**Direction**: Bidirectional

**Features**:
- Uses `FObservationView` to merge observation and measurement tables
- Category-based routing (laboratory, vital-signs, survey)
- Supports component observations

---

### fhir-omop-ig (FML)

**Source**: `input/maps/observation.fml`

**Direction**: FHIR → OMOP

```fml
group Observation(source src: Observation, target tgt : ObservationTable) {
    src.code as s -> tgt then {
        s.coding as sc -> tgt then {
            sc.code -> tgt.observation_concept_id;
        };
    };
    src.effective : dateTime as edt -> 
        tgt.observation_date = cast(edt, "date"),
        tgt.observation_datetime = edt;
    src.value : Quantity as vq -> tgt then {
        vq.value as v -> tgt.value_as_number = v;
    };
}
```

---

### ETL-German-FHIR-Core (Java)

**Source**: `src/main/java/.../mapper/ObservationMapper.java`

**Direction**: FHIR → OMOP

**Features**:
- Domain-based routing to observation or measurement
- Supports LOINC and SNOMED vocabularies
- Handles reference ranges

---

### FhirToCdm (.NET)

**Source**: `FhirToCdmMappings.cs` - `CreateMeasurement()`

**Direction**: FHIR → OMOP (measurement table only)

---

### mends-on-fhir (Whistle)

**Source**: `whistle-mappings/.../Measurement_Observation.wstl`

**Direction**: OMOP → FHIR

---

## Gaps and Considerations

- **Category routing**: Different projects use different logic for observation vs measurement
- **Component observations**: Some projects flatten, others ignore
- **Reference ranges**: Not all projects map `referenceRange`
- **Interpretation**: `Observation.interpretation` mapping varies
