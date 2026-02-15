# MedicationRequest — Unmapped Elements

FHIR MedicationRequest elements with no direct mapping to OMOP DRUG_EXPOSURE.

| FHIR Element | Reason | Potential Approach |
|---|---|---|
| `intent` | No OMOP equivalent | Used for filtering/classification |
| `priority` | No column | Map to note |
| `medicationReference` | Not implemented | Resolve reference → extract code from Medication |
| `reasonCode` | No column in drug_exposure | Map as condition_occurrence |
| `reasonReference` | No column | Link via visit_occurrence_id |
| `note` | No column | Map to note_nlp |
| `substitution` | No column | Specific to dispensing |
| `dosageInstruction[1..n]` | Only the first is used | Complex dosing regimens are simplified |
| `dosageInstruction.timing` | No direct equivalent | Administration schedule |
| `dosageInstruction.site` | No column | Administration site |
| `dosageInstruction.method` | No column | Administration method |
| `dosageInstruction.maxDosePerPeriod` | No column | Maximum dose |
| `dispenseRequest.quantity` | Not mapped to drug_exposure.quantity | Quantity to dispense |
| `dispenseRequest.expectedSupplyDuration` | days_supply — null | Could be computed |
| `identifier` | No standard field | Could store in drug_source_value |
| `courseOfTherapyType` | No column | Therapy course type |
| `insurance` | No column | Insurance information |
| `performer` | No direct equivalent | Prescription performer |
| `recorder` | No direct equivalent | Who recorded (vs requester) |
| `sig` | No column | Patient instruction text |
