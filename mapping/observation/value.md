# Observation.value[x] → OMOP value fields

## Источник

FHIR `Observation.value[x]` — полиморфное поле:
- `valueQuantity` — числовое значение с единицей
- `valueCodeableConcept` — кодированное значение
- `valueString` — текстовое значение
- `valueBoolean` — логическое значение
- `valueInteger` — целое число
- `valueRange` — диапазон
- `valueRatio` — соотношение
- `valueSampledData` — выборочные данные
- `valueTime` — время
- `valueDateTime` — дата/время
- `valuePeriod` — период

## Цель — MEASUREMENT

| OMOP поле | Тип | Описание |
|---|---|---|
| `value_as_number` | float | Числовое значение |
| `value_as_concept_id` | integer | Concept кодированного значения |
| `unit_source_value` | varchar(50) | Единица измерения |
| `unit_concept_id` | integer | Concept единицы |
| `operator_concept_id` | integer | Оператор сравнения |
| `value_source_value` | varchar(50) | Оригинальное значение |

## Цель — OBSERVATION

| OMOP поле | Тип | Описание |
|---|---|---|
| `value_as_number` | float | Числовое значение |
| `value_as_string` | varchar(60) | Текстовое значение |
| `value_as_concept_id` | integer | Concept кодированного значения |
| `unit_source_value` | varchar(50) | Единица измерения |
| `value_source_value` | varchar(50) | Оригинальное значение |

## Маппинг

### valueQuantity

| FHIR | OMOP | Примечания |
|---|---|---|
| `valueQuantity.value` | `value_as_number` | Числовое значение |
| `valueQuantity.unit` | `unit_source_value` | Текст единицы |
| `valueQuantity.unit` | `unit_concept_id` | **null** (placeholder — требует UCUM lookup) |
| `valueQuantity.comparator` | `operator_concept_id` | См. маппинг операторов |

### Operator concept mapping

| FHIR comparator | operator_concept_id | OMOP Concept |
|---|---|---|
| `<` | **4171756** | Less than |
| `<=` | **4171754** | Less than or equal to |
| `>=` | **4171755** | Greater than or equal to |
| `>` | **4172703** | Greater than |
| отсутствует | null | Точное значение |

### valueString (только observation)

| FHIR | OMOP | Примечания |
|---|---|---|
| `valueString` | `value_as_string` | Текстовое значение |

### valueCodeableConcept (только observation)

| FHIR | OMOP | Примечания |
|---|---|---|
| `valueCodeableConcept.coding[0].code` | `value_as_string` | Source code (не display) |
| `valueCodeableConcept` | `value_as_concept_id` | **null** (placeholder) |

### value_source_value

Формируется из оригинального значения:
- valueQuantity: `"{comparator}{value} {unit}"` (e.g., `"<10 mg/dL"`, `"95 mg/dL"`)
- valueString: текст строки
- valueCodeableConcept: source code

## Немаппированные типы value[x]

| Тип | Причина |
|---|---|
| `valueBoolean` | Нет прямого OMOP аналога; можно маппить в value_as_string |
| `valueInteger` | Можно маппить в value_as_number (не реализовано) |
| `valueRange` | Неоднозначный маппинг |
| `valueRatio` | Нет прямого аналога |
| `valueSampledData` | Сложная структура |
| `valueTime` | Нет прямого аналога |
| `valueDateTime` | Можно маппить в value_as_string |
| `valuePeriod` | Нет прямого аналога |
