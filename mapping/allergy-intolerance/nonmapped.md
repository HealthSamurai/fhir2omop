# AllergyIntolerance — немаппированные элементы

| FHIR элемент | Причина | Потенциальный подход |
|---|---|---|
| `category` (food/medication/environment/biologic) | Нет прямого OMOP аналога | Маппить в qualifier_source_value |
| `asserter` | OMOP имеет один provider_id; используем recorder | Альтернатива: приоритизировать asserter |
| `onsetAge` | Требует birthDate пациента | Вычислить при наличии контекста |
| `onsetPeriod` | Только onsetDateTime поддерживается | Использовать period.start |
| `onsetRange` | Неточные временные данные | Не применимо |
| `onsetString` | Свободный текст | NLP extraction |
| `lastOccurrence` | Нет колонки | Дата последней реакции |
| `note` | Нет колонки | Маппить в note_nlp |
| `reaction.substance` | Нет отдельного поля | Аллерген в основном code |
| `reaction.severity` | Нет прямого аналога | Маппить в value_as_string |
| `reaction.exposureRoute` | Нет прямого аналога | Путь воздействия |
| `reaction.onset` | Нет прямого аналога | Дата конкретной реакции |
| `identifier` | Нет стандартного поля | Можно хранить в observation_source_value |
