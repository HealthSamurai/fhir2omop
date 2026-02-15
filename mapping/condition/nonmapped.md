# Condition — немаппированные элементы

Элементы FHIR Condition, не имеющие прямого маппинга в OMOP CONDITION_OCCURRENCE.

| FHIR элемент | Причина | Потенциальный подход |
|---|---|---|
| `severity` | Нет колонки в condition_occurrence | Создать отдельную запись observation |
| `bodySite` | Нет колонки в condition_occurrence | Маппить в observation или note |
| `stage` | Нет колонки в condition_occurrence | Создать отдельную запись observation/measurement |
| `evidence` | Нет колонки в condition_occurrence | Связать с observation записями |
| `note` | Нет колонки в condition_occurrence | Маппить в note_nlp таблицу |
| `identifier` | Нет стандартного поля | Можно хранить в condition_source_value |
| `verificationStatus` | Используется только для фильтрации | Нет OMOP эквивалента помимо фильтрации |
| `onset[x]` как Age/Range/String | Неточные временные данные | Требует контекста пациента для вычисления |
| `abatement[x]` как Age/Range | Неточные временные данные | Требует контекста пациента |
| `recorder` vs `asserter` | OMOP имеет один provider_id | asserter приоритетный; recorder — fallback |
