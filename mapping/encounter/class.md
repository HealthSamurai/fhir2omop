# Encounter.class → OMOP VISIT_OCCURRENCE visit concept

## Источник

FHIR `Encounter.class` — Coding из value set `v3-ActEncounterCode`: IMP, AMB, EMER, HH, SS, OBSENC, FLD, VR.

## Цель

OMOP VISIT_OCCURRENCE:
- `visit_concept_id` (integer, required) — FK → CONCEPT
- `visit_source_value` (varchar(50)) — оригинальный код класса

## Маппинг

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
| неизвестный код | **0** | No matching concept |

- `visit_source_value` — оригинальный код класса encounter. Если class отсутствует — NULL.

## Решение по SS/OBSENC/FLD/VR

Маппим в ближайший OMOP concept:
- SS (Short Stay), FLD (Field), VR (Virtual) → 9202 (Outpatient) — краткие/дистанционные визиты
- OBSENC (Observation Encounter) → 9201 (Inpatient) — наблюдение в стационаре
- ACUTE → 9201 (Inpatient) — острое состояние

## Консенсус реализаций

- **Все**: IMP→9201, AMB→9202, EMER→9203
- **omoponfhir**: наиболее полный маппинг с HH→581476
