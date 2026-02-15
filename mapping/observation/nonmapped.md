# Observation — немаппированные элементы

Элементы FHIR Observation, не имеющие прямого маппинга в OMOP MEASUREMENT / OBSERVATION.

| FHIR элемент | Причина | Потенциальный подход |
|---|---|---|
| `bodySite` | Нет колонки в measurement/observation | Маппить в anatomic_site_concept_id (measurement) |
| `method` | Нет колонки | Маппить в measurement_event_id или note |
| `specimen` | Не реализовано | Маппить в OMOP SPECIMEN таблицу |
| `device` | Нет прямого аналога | Маппить в DEVICE_EXPOSURE |
| `effectivePeriod` | Только effectiveDateTime поддерживается | Использовать period.start как date |
| `effectiveTiming` | Сложная структура | Не применимо |
| `effectiveInstant` | Не реализовано | Маппить как effectiveDateTime |
| `issued` | Нет прямого аналога | Время выдачи результата |
| `dataAbsentReason` | Нет прямого аналога | Маппить в value_source_value |
| `interpretation` | qualifier_source_value заполняется | qualifier_concept_id — placeholder (null) |
| `note` | Нет колонки | Маппить в note_nlp |
| `hasMember` | Группировка observations | Нет прямого аналога |
| `derivedFrom` | Вычисленные результаты | Нет прямого аналога |
| `identifier` | Нет стандартного поля | Можно хранить в source_value |
| `focus` | Нет прямого аналога | Специфично для генетических тестов |
| `value[x]` как Boolean/Range/Ratio/etc | Не реализованы | См. mapping/observation/value.md |
