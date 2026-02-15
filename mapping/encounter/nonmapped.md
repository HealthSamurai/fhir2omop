# Encounter — немаппированные элементы

Элементы FHIR Encounter, не имеющие прямого маппинга в OMOP VISIT_OCCURRENCE.

| FHIR элемент | Причина | Потенциальный подход |
|---|---|---|
| `type` | Нет прямой колонки; class уже определяет visit_concept_id | Можно хранить в visit_source_value или note |
| `serviceType` | Нет колонки | Создать отдельную запись |
| `priority` | Нет колонки | Можно маппить в observation |
| `reasonCode` | Нет колонки в visit_occurrence | Маппить как condition_occurrence с category=encounter-diagnosis |
| `reasonReference` | Нет колонки | Связать через visit_occurrence_id |
| `diagnosis` | Не маппируется в visit_occurrence | Маппить через Condition ресурсы |
| `hospitalization.admitSource` | admitted_from_concept_id — placeholder 0 | Требует vocabulary lookup |
| `hospitalization.dischargeDisposition` | discharged_to_concept_id — placeholder 0 | Требует vocabulary lookup |
| `hospitalization.dietPreference` | Нет колонки | Не применимо |
| `location` | Нет прямого маппинга | Маппить в CARE_SITE |
| `partOf` | Вложенные encounters | Маппить в VISIT_DETAIL |
| `participant[1..n]` | OMOP имеет один provider_id | Используем только первого |
| `length` | Нет колонки | Вычисляется из period |
| `identifier` | Нет стандартного поля | Можно хранить в visit_source_value |
| `account` | Нет колонки | Финансовые данные — вне OMOP CDM |
