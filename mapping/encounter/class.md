# Encounter.class → OMOP VISIT_OCCURRENCE visit concept

## Source

FHIR `Encounter.class` — Coding from value set `v3-ActEncounterCode`: IMP, AMB, EMER, HH, SS, OBSENC, FLD, VR.

## Target

OMOP VISIT_OCCURRENCE:
- `visit_concept_id` (integer, required) — FK → CONCEPT
- `visit_source_value` (varchar(50)) — original class code

## Mapping

| FHIR class.code | visit_concept_id | OMOP Concept Name |
|---|---|---|
| `IMP` | **9201** | Inpatient Visit |
| `ACUTE` | **9201** | Inpatient Visit |
| `AMB` | **9202** | Outpatient Visit |
| `EMER` | **9203** | Emergency Room Visit |
| `HH` | **581476** | Home Visit |
| `SS` | **9202** | Outpatient Visit (Short Stay) |
| `OBSENC` | **9201** | Inpatient Visit (Observation Encounter) |
| `FLD` | **9202** | Outpatient Visit (Field) |
| `VR` | **9202** | Outpatient Visit (Virtual) |
| unknown code | **0** | No matching concept |

- `visit_source_value` — original encounter class code. If class is absent — NULL.

## Decision on SS/OBSENC/FLD/VR

Mapped to the nearest OMOP concept:
- SS (Short Stay), FLD (Field), VR (Virtual) → 9202 (Outpatient) — brief/remote visits
- OBSENC (Observation Encounter) → 9201 (Inpatient) — observation in hospital
- ACUTE → 9201 (Inpatient) — acute condition

## Implementation consensus

- **All**: IMP→9201, AMB→9202, EMER→9203
- **omoponfhir**: most complete mapping with HH→581476
