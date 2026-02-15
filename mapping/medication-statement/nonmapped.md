# MedicationStatement — немаппированные элементы

| FHIR элемент | Причина | Потенциальный подход |
|---|---|---|
| `medicationReference` | Не реализовано | Разрешить ссылку → извлечь code |
| `reasonCode` | Нет колонки в drug_exposure | Маппить как condition_occurrence |
| `reasonReference` | Нет колонки | Связать через visit_occurrence_id |
| `note` | Нет колонки | Маппить в note_nlp |
| `dosage[1..n]` | Берём только первую | Сложные схемы упрощены |
| `dosage.timing` | Нет прямого аналога | Расписание приёма |
| `dosage.site` | Нет колонки | Место введения |
| `dosage.method` | Нет колонки | Метод введения |
| `dosage.maxDosePerPeriod` | Нет колонки | Макс. доза |
| `statusReason` | stop_reason — не маппится | Можно маппить в stop_reason |
| `category` | Нет прямого аналога | Категория (inpatient/outpatient/community) |
| `dateAsserted` | Нет колонки | Дата утверждения |
| `derivedFrom` | Нет прямого аналога | Источник данных |
| `partOf` | Нет прямого аналога | Часть другого события |
| `identifier` | Нет стандартного поля | Можно хранить в drug_source_value |
