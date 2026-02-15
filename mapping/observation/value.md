# Observation.value[x] → OMOP value fields

## Source

FHIR `Observation.value[x]` — polymorphic field:
- `valueQuantity` — numeric value with unit
- `valueCodeableConcept` — coded value
- `valueString` — text value
- `valueBoolean` — boolean value
- `valueInteger` — integer
- `valueRange` — range
- `valueRatio` — ratio
- `valueSampledData` — sampled data
- `valueTime` — time
- `valueDateTime` — date/time
- `valuePeriod` — period

## Target — MEASUREMENT

| OMOP field | Type | Description |
|---|---|---|
| `value_as_number` | float | Numeric value |
| `value_as_concept_id` | integer | Concept of coded value |
| `unit_source_value` | varchar(50) | Unit of measurement |
| `unit_concept_id` | integer | Unit concept |
| `operator_concept_id` | integer | Comparison operator |
| `value_source_value` | varchar(50) | Original value |

## Target — OBSERVATION

| OMOP field | Type | Description |
|---|---|---|
| `value_as_number` | float | Numeric value |
| `value_as_string` | varchar(60) | Text value |
| `value_as_concept_id` | integer | Concept of coded value |
| `unit_source_value` | varchar(50) | Unit of measurement |
| `value_source_value` | varchar(50) | Original value |

## Mapping

### valueQuantity

| FHIR | OMOP | Notes |
|---|---|---|
| `valueQuantity.value` | `value_as_number` | Numeric value |
| `valueQuantity.unit` | `unit_source_value` | Unit text |
| `valueQuantity.unit` | `unit_concept_id` | **null** (placeholder — requires UCUM lookup) |
| `valueQuantity.comparator` | `operator_concept_id` | See operator mapping |

### Operator concept mapping

| FHIR comparator | operator_concept_id | OMOP Concept |
|---|---|---|
| `<` | **4171756** | Less than |
| `<=` | **4171754** | Less than or equal to |
| `>=` | **4171755** | Greater than or equal to |
| `>` | **4172703** | Greater than |
| absent | null | Exact value |

### valueString (observation only)

| FHIR | OMOP | Notes |
|---|---|---|
| `valueString` | `value_as_string` | Text value |

### valueCodeableConcept (observation only)

| FHIR | OMOP | Notes |
|---|---|---|
| `valueCodeableConcept.coding[0].code` | `value_as_string` | Source code (not display) |
| `valueCodeableConcept` | `value_as_concept_id` | **null** (placeholder) |

### value_source_value

Formed from the original value:
- valueQuantity: `"{comparator}{value} {unit}"` (e.g., `"<10 mg/dL"`, `"95 mg/dL"`)
- valueString: text string
- valueCodeableConcept: source code

## Unmapped value[x] types

| Type | Reason |
|---|---|
| `valueBoolean` | No direct OMOP equivalent; could map to value_as_string |
| `valueInteger` | Could map to value_as_number (not implemented) |
| `valueRange` | Ambiguous mapping |
| `valueRatio` | No direct equivalent |
| `valueSampledData` | Complex structure |
| `valueTime` | No direct equivalent |
| `valueDateTime` | Could map to value_as_string |
| `valuePeriod` | No direct equivalent |
