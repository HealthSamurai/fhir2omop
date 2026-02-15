# MedicationRequest — немаппированные элементы

| FHIR элемент | Причина | Потенциальный подход |
|---|---|---|
| `intent` | Нет OMOP эквивалента | Используется для фильтрации/классификации |
| `priority` | Нет колонки | Маппить в note |
| `medicationReference` | Не реализовано | Разрешить ссылку → извлечь code из Medication |
| `reasonCode` | Нет колонки в drug_exposure | Маппить как condition_occurrence |
| `reasonReference` | Нет колонки | Связать через visit_occurrence_id |
| `note` | Нет колонки | Маппить в note_nlp |
| `substitution` | Нет колонки | Специфично для диспенсинга |
| `dosageInstruction[1..n]` | Берём только первую | Сложные схемы дозирования упрощены |
| `dosageInstruction.timing` | Нет прямого аналога | Расписание приёма |
| `dosageInstruction.site` | Нет колонки | Место введения |
| `dosageInstruction.method` | Нет колонки | Метод введения |
| `dosageInstruction.maxDosePerPeriod` | Нет колонки | Макс. доза |
| `dispenseRequest.quantity` | Не маппится в drug_exposure.quantity | Количество к выдаче |
| `dispenseRequest.expectedSupplyDuration` | days_supply — null | Можно вычислить |
| `identifier` | Нет стандартного поля | Можно хранить в drug_source_value |
| `courseOfTherapyType` | Нет колонки | Тип курса терапии |
| `insurance` | Нет колонки | Страховая информация |
| `performer` | Нет прямого аналога | Исполнитель назначения |
| `recorder` | Нет прямого аналога | Кто записал (vs requester) |
| `sig` | Нет колонки | Текст инструкции для пациента |
