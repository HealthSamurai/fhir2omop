# MedicationStatement.dosage → OMOP DRUG_EXPOSURE dosage fields

## Source

FHIR `MedicationStatement.dosage[]`:
- `dosage[0].doseAndRate[0].doseQuantity.value` — dose amount
- `dosage[0].route` — route of administration

## Target

OMOP DRUG_EXPOSURE:
- `quantity` (float) — amount
- `route_concept_id` (integer) — route concept
- `route_source_value` (varchar(50)) — original route

## Mapping

| FHIR | OMOP | Notes |
|---|---|---|
| `dosage[0].doseAndRate[0].doseQuantity.value` | `quantity` | Numeric dose value |
| `dosage[0].route.coding[0].display` | `route_source_value` | Display preferred over code |
| `dosage[0].route` | `route_concept_id` | **null** (placeholder) |

## Differences from MedicationRequest

- No `refills` (MedicationStatement is patient self-report)
- `drug_type_concept_id` = **44787730** (Patient Self-Reported) instead of 38000177 (Prescription)
