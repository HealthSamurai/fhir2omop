# Encounter ↔ OMOP VISIT_OCCURRENCE Mapping

## Overview

| FHIR Resource | OMOP Table | Direction |
|---------------|------------|-----------|
| Encounter | VISIT_OCCURRENCE, VISIT_DETAIL | Bidirectional |

## Field Mapping Summary

| FHIR Encounter Field | OMOP VISIT_OCCURRENCE Field | Notes |
|----------------------|----------------------------|-------|
| `Encounter.id` | `visit_source_value` | Source identifier |
| `Encounter.class` | `visit_concept_id` | Via vocabulary lookup |
| `Encounter.period.start` | `visit_start_date`, `visit_start_datetime` | Start date |
| `Encounter.period.end` | `visit_end_date`, `visit_end_datetime` | End date |
| `Encounter.subject` | `person_id` | Reference resolution |
| `Encounter.participant` | `provider_id` | Reference resolution |
| `Encounter.serviceProvider` | `care_site_id` | Reference resolution |
| `Encounter.hospitalization.admitSource` | `admitted_from_concept_id` | Admission source |
| `Encounter.hospitalization.dischargeDisposition` | `discharged_to_concept_id` | Discharge disposition |

## Visit Type Concept Mapping

| FHIR Encounter.class | OMOP Concept ID | Description |
|----------------------|-----------------|-------------|
| `IMP` (inpatient) | 9201 | Inpatient Visit |
| `AMB` (ambulatory) | 9202 | Outpatient Visit |
| `EMER` (emergency) | 9203 | Emergency Room Visit |
| `HH` (home health) | 581476 | Home Visit |

---

## Project Implementations

### omoponfhir-v54-r4 (Java)

**Source**: `omoponfhir-omopv5-r4-mapping/.../mapping/OmopEncounter.java`

**Direction**: Bidirectional

**Features**:
- Maps to VISIT_OCCURRENCE and VISIT_DETAIL
- Supports nested encounters via `partOf`
- Handles hospitalization details

---

### fhir-omop-ig (FML)

**Source**: `input/maps/encounter.fml`

**Direction**: FHIR → OMOP

```fml
group VisitOccurrence(source src: Encounter, target tgt : VisitOccurrenceTable) {
    src.class as c -> tgt then {
        c.code -> tgt.visit_concept_id, tgt.visit_source_value;
    };
    src.period as p -> tgt then {
        p.start as s -> tgt.visit_start_date = cast(s, "date"),
                        tgt.visit_start_datetime = s;
        p.end as e -> tgt.visit_end_date = cast(e, "date"),
                      tgt.visit_end_datetime = e;
    };
}
```

---

### ETL-German-FHIR-Core (Java)

**Source**: `src/main/java/.../mapper/EncounterMapper.java`

**Direction**: FHIR → OMOP

**Features**:
- German encounter classification mapping
- Supports incremental updates
- Department transfers via VISIT_DETAIL

---

### FhirToCdm (.NET)

**Source**: `FhirToCdmMappings.cs` - `CreateVisitOccurrence()`

**Direction**: FHIR → OMOP

---

## Gaps and Considerations

- **Nested encounters**: FHIR `partOf` vs OMOP `preceding_visit_occurrence_id`
- **Visit detail**: Not all projects populate VISIT_DETAIL
- **Class mapping**: Vocabulary alignment between FHIR and OMOP visit types
- **Length of stay**: Calculated from period, not stored directly
