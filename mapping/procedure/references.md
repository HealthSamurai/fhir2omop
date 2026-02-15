# Procedure references → OMOP PROCEDURE_OCCURRENCE FK fields

## Источник

FHIR Procedure ссылки:
- `subject` (Reference(Patient)) — пациент
- `encounter` (Reference(Encounter)) — визит
- `performer[].actor` (Reference(Practitioner|Organization|...)) — исполнитель

## Цель

OMOP PROCEDURE_OCCURRENCE:
- `person_id` (integer, **required**) — FK → PERSON
- `visit_occurrence_id` (integer) — FK → VISIT_OCCURRENCE
- `provider_id` (integer) — FK → PROVIDER

## Маппинг

| FHIR Reference | OMOP FK | Обязательность |
|---|---|---|
| `subject` → Patient/id | `person_id` | required (default 0) |
| `encounter` → Encounter/id | `visit_occurrence_id` | optional (null) |
| `performer[0].actor` → Practitioner/id | `provider_id` | optional (null) |

## Решение по performer

FHIR `performer` — массив. Каждый элемент имеет `actor` и опциональную `function`. OMOP `provider_id` — одно значение. Берём `performer[0].actor` — первого исполнителя.

## Решение по отсутствующим ссылкам

- `subject` отсутствует или не резолвится → `person_id` = 0
- `encounter` отсутствует → `visit_occurrence_id` = NULL
- `performer` отсутствует → `provider_id` = NULL

## Консенсус реализаций

- **4/4**: маппят subject → person_id
- **4/4**: маппят encounter → visit_occurrence_id
- **3/4**: маппят performer[0].actor → provider_id
