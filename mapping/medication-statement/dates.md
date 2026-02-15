# MedicationStatement.effective[x] → OMOP DRUG_EXPOSURE date fields

## Источник

FHIR `MedicationStatement.effective[x]` — полиморфное поле:
- `effectiveDateTime` — точная дата/время
- `effectivePeriod` — период (start/end)

## Цель

OMOP DRUG_EXPOSURE:
- `drug_exposure_start_date` (date, **required**) — начало
- `drug_exposure_start_datetime` (datetime) — начало
- `drug_exposure_end_date` (date) — конец
- `drug_exposure_end_datetime` (datetime) — конец

## Маппинг

| FHIR | OMOP | Примечания |
|---|---|---|
| `effectiveDateTime` | `drug_exposure_start_date` | Извлечение YYYY-MM-DD |
| `effectiveDateTime` | `drug_exposure_start_datetime` | Полное значение |
| `effectivePeriod.start` | `drug_exposure_start_date` | Fallback если нет dateTime |
| `effectivePeriod.start` | `drug_exposure_start_datetime` | Полное значение |
| `effectivePeriod.end` | `drug_exposure_end_date` | Извлечение YYYY-MM-DD |
| `effectivePeriod.end` | `drug_exposure_end_datetime` | Полное значение |

## Fallback chain

1. `effectiveDateTime` → start_date
2. `effectivePeriod.start` → start_date (если нет dateTime)
3. Ничего → запись **не создаётся**

## Валидация

Если нет ни effectiveDateTime, ни effectivePeriod.start — запись не создаётся.
