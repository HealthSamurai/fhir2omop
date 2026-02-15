# Encounter references → OMOP VISIT_OCCURRENCE FK fields

## Источник

FHIR `Encounter`:
- `subject` — Reference(Patient)
- `participant[].individual` — Reference(Practitioner)
- `serviceProvider` — Reference(Organization)

## Цель

OMOP VISIT_OCCURRENCE:
- `person_id` (integer, **required**) — FK → PERSON
- `provider_id` (integer) — FK → PROVIDER
- `care_site_id` (integer) — FK → CARE_SITE

## Маппинг

| FHIR Reference | OMOP Field | Примечания |
|---|---|---|
| `subject` | `person_id` | Через `ctx.ids.resolveRef()` |
| `participant[0].individual` | `provider_id` | Первый участник визита |
| `serviceProvider` | `care_site_id` | Организация-провайдер |

## Решение по participant

FHIR Encounter может иметь множество participants. OMOP VISIT_OCCURRENCE имеет один `provider_id`. Берём первого participant (`participant[0].individual`).

## Немаппированные ссылки

| FHIR Reference | Причина |
|---|---|
| `participant[1..n]` | OMOP имеет один provider_id |
| `location` | Не маппируется в visit_occurrence (отдельная таблица CARE_SITE) |
| `partOf` | Не маппируется (вложенные encounters) |
| `reasonReference` | Не маппируется (причина визита) |
