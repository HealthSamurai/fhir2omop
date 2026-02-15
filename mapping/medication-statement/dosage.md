# MedicationStatement.dosage → OMOP DRUG_EXPOSURE dosage fields

## Источник

FHIR `MedicationStatement.dosage[]`:
- `dosage[0].doseAndRate[0].doseQuantity.value` — количество
- `dosage[0].route` — маршрут введения

## Цель

OMOP DRUG_EXPOSURE:
- `quantity` (float) — количество
- `route_concept_id` (integer) — concept маршрута
- `route_source_value` (varchar(50)) — оригинальный маршрут

## Маппинг

| FHIR | OMOP | Примечания |
|---|---|---|
| `dosage[0].doseAndRate[0].doseQuantity.value` | `quantity` | Числовое значение дозы |
| `dosage[0].route.coding[0].display` | `route_source_value` | Display предпочтительнее code |
| `dosage[0].route` | `route_concept_id` | **null** (placeholder) |

## Отличия от MedicationRequest

- Нет `refills` (MedicationStatement — самоотчёт пациента)
- `drug_type_concept_id` = **44787730** (Patient Self-Reported) вместо 38000177 (Prescription)
