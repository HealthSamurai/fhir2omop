# MedicationStatement — Unmapped Elements

FHIR MedicationStatement elements with no direct mapping to OMOP DRUG_EXPOSURE.

| FHIR Element | Reason | Potential Approach |
|---|---|---|
| `medicationReference` | Not implemented | Resolve reference → extract code |
| `reasonCode` | No column in drug_exposure | Map as condition_occurrence |
| `reasonReference` | No column | Link via visit_occurrence_id |
| `note` | No column | Map to note_nlp |
| `dosage[1..n]` | Only the first is used | Complex regimens are simplified |
| `dosage.timing` | No direct equivalent | Administration schedule |
| `dosage.site` | No column | Administration site |
| `dosage.method` | No column | Administration method |
| `dosage.maxDosePerPeriod` | No column | Maximum dose |
| `statusReason` | stop_reason — not mapped | Could map to stop_reason |
| `category` | No direct equivalent | Category (inpatient/outpatient/community) |
| `dateAsserted` | No column | Date asserted |
| `derivedFrom` | No direct equivalent | Data source |
| `partOf` | No direct equivalent | Part of another event |
| `identifier` | No standard field | Could store in drug_source_value |
