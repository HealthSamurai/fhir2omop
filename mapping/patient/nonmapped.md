# Patient — немаппированные элементы

Элементы FHIR Patient, не имеющие прямого маппинга в OMOP PERSON / LOCATION / DEATH.

| FHIR элемент | Причина | Потенциальный подход |
|---|---|---|
| `name` | Нет колонки в PERSON (OMOP деидентифицирован) | PII — не хранится в OMOP CDM |
| `telecom` | Нет колонки | PII — телефон/email |
| `maritalStatus` | Нет колонки в PERSON | Маппить в observation |
| `multipleBirth[x]` | Нет колонки | Маппить в observation |
| `photo` | Нет колонки | PII — не применимо |
| `contact` | Нет колонки | Контактные лица |
| `communication` | Нет колонки | Язык общения |
| `link` | Нет прямого аналога | Связи между записями пациентов |
| `active` | Не используется для фильтрации | Статус записи (не клинический) |
| `generalPractitioner[1..n]` | OMOP имеет один provider_id | Используем только первого |
| `extension` (кроме race/ethnicity) | Нет стандартных полей | Специфичные расширения |
| `identifier[1..n]` (кроме лучшего) | person_source_value — одно значение | Выбираем лучший по приоритету SSN > MRN > first |
| `address[1..n]` (кроме home) | Одна LOCATION на пациента | Выбираем home address |
