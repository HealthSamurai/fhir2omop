# MedicationRequest dates → OMOP DRUG_EXPOSURE date fields

## Источник

FHIR `MedicationRequest`:
- `authoredOn` (dateTime) — дата назначения
- `dispenseRequest.validityPeriod.end` (dateTime) — конец периода действия

## Цель

OMOP DRUG_EXPOSURE:
- `drug_exposure_start_date` (date, **required**) — начало
- `drug_exposure_start_datetime` (datetime) — начало
- `drug_exposure_end_date` (date) — конец
- `drug_exposure_end_datetime` (datetime) — конец

## Маппинг

| FHIR | OMOP | Примечания |
|---|---|---|
| `authoredOn` | `drug_exposure_start_date` | Извлечение YYYY-MM-DD |
| `authoredOn` | `drug_exposure_start_datetime` | Полное значение |
| `dispenseRequest.validityPeriod.end` | `drug_exposure_end_date` | Извлечение YYYY-MM-DD |
| `dispenseRequest.validityPeriod.end` | `drug_exposure_end_datetime` | Полное значение |
| отсутствует end | null | Открытый рецепт |

## Валидация

Если `authoredOn` отсутствует — запись **не создаётся**. drug_exposure_start_date обязательное поле.
