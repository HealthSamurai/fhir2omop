# MedicationRequest.dosageInstruction → OMOP DRUG_EXPOSURE dosage fields

## Источник

FHIR `MedicationRequest.dosageInstruction[]` — массив инструкций по дозировке:
- `dosageInstruction[0].doseAndRate[0].doseQuantity.value` — количество
- `dosageInstruction[0].route` — маршрут введения

## Цель

OMOP DRUG_EXPOSURE:
- `quantity` (float) — количество
- `route_concept_id` (integer) — concept маршрута
- `route_source_value` (varchar(50)) — оригинальный маршрут

## Маппинг

| FHIR | OMOP | Примечания |
|---|---|---|
| `dosageInstruction[0].doseAndRate[0].doseQuantity.value` | `quantity` | Числовое значение дозы |
| `dosageInstruction[0].route.coding[0].display` | `route_source_value` | Display предпочтительнее code |
| `dosageInstruction[0].route` | `route_concept_id` | **null** (placeholder — требует vocabulary lookup) |

## Дополнительные поля

| FHIR | OMOP | Примечания |
|---|---|---|
| `dispenseRequest.numberOfRepeatsAllowed` | `refills` | Количество повторных выдач |
| — | `days_supply` | null (требует вычисления из дозировки) |
| — | `stop_reason` | null |

## Ограничения

Берём только первую инструкцию (`dosageInstruction[0]`) и первую дозу (`doseAndRate[0]`). FHIR допускает сложные схемы дозирования — они упрощены для OMOP.
