# MedicationRequest.dosageInstruction → OMOP DRUG_EXPOSURE dosage fields

## Source

FHIR `MedicationRequest.dosageInstruction[]` — array of dosage instructions:
- `dosageInstruction[0].doseAndRate[0].doseQuantity.value` — dose amount
- `dosageInstruction[0].route` — route of administration

## Target

OMOP DRUG_EXPOSURE:
- `quantity` (float) — amount
- `route_concept_id` (integer) — route concept
- `route_source_value` (varchar(50)) — original route

## Mapping

| FHIR | OMOP | Notes |
|---|---|---|
| `dosageInstruction[0].doseAndRate[0].doseQuantity.value` | `quantity` | Numeric dose value |
| `dosageInstruction[0].route.coding[0].display` | `route_source_value` | Display preferred over code |
| `dosageInstruction[0].route` | `route_concept_id` | **null** (placeholder — requires vocabulary lookup) |

## Additional fields

| FHIR | OMOP | Notes |
|---|---|---|
| `dispenseRequest.numberOfRepeatsAllowed` | `refills` | Number of allowed refills |
| — | `days_supply` | null (requires calculation from dosage) |
| — | `stop_reason` | null |

## Limitations

Only the first instruction (`dosageInstruction[0]`) and first dose (`doseAndRate[0]`) are used. FHIR allows complex dosing regimens — they are simplified for OMOP.
