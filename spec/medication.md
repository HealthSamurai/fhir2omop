# MedicationStatement/MedicationRequest ↔ OMOP DRUG_EXPOSURE Mapping

## Overview

| FHIR Resource | OMOP Table | Direction |
|---------------|------------|-----------|
| MedicationStatement | DRUG_EXPOSURE | Bidirectional |
| MedicationRequest | DRUG_EXPOSURE | Bidirectional |
| MedicationAdministration | DRUG_EXPOSURE | FHIR → OMOP |
| MedicationDispense | DRUG_EXPOSURE | FHIR → OMOP |

## Field Mapping Summary

| FHIR Field | OMOP DRUG_EXPOSURE Field | Notes |
|------------|-------------------------|-------|
| `medication[x]` | `drug_concept_id` | Via RxNorm/ATC vocabulary |
| `effective[x]` | `drug_exposure_start_date/datetime` | Start date |
| `effectivePeriod.end` | `drug_exposure_end_date/datetime` | End date |
| `subject` | `person_id` | Reference resolution |
| `context`/`encounter` | `visit_occurrence_id` | Reference resolution |
| `informationSource`/`requester` | `provider_id` | Reference resolution |
| `dosage[].route` | `route_concept_id` | Administration route |
| `dosage[].doseAndRate[]` | `quantity` | Dose amount |
| `statusReason` | `stop_reason` | Reason for discontinuation |
| `medication.coding[].code` | `drug_source_value` | Original code |

## Type Concept Mapping

| FHIR Resource | OMOP Type Concept ID | Description |
|---------------|---------------------|-------------|
| MedicationStatement | 44787730 | Patient Self-Reported Medication |
| MedicationRequest | 38000177 | Prescription written |
| MedicationDispense | 38000175 | Prescription dispensed |
| MedicationAdministration | 38000179 | Physician administered drug |

---

## Project Implementations

### omoponfhir-v54-r4 (Java)

**Source**: 
- `OmopMedicationStatement.java`
- `OmopMedicationRequest.java`

**Direction**: Bidirectional

**Features**:
- RxNorm vocabulary support
- Dosage instruction parsing
- Route concept mapping

---

### fhir-omop-ig (FML)

**Source**: `input/maps/medication.fml`

**Direction**: FHIR → OMOP

```fml
group DrugExposure(source src: MedicationStatement, target tgt : DrugExposureTable) {
    src.medication : CodeableConcept as med -> tgt then {
        med.coding as mc -> tgt then {
            mc.code -> tgt.drug_concept_id, 
                       tgt.drug_source_value,
                       tgt.drug_source_concept_id;
        };
    };
    src.effective : Period as ep -> tgt then {
        ep.start as s -> tgt.drug_exposure_start_date = cast(s, "date");
        ep.end as e -> tgt.drug_exposure_end_date = cast(e, "date");
    };
}
```

---

### ETL-German-FHIR-Core (Java)

**Source**: `src/main/java/.../mapper/MedicationStatementMapper.java`

**Direction**: FHIR → OMOP

**Features**:
- ATC (German) vocabulary support
- Dose form and route mapping
- Reasonably detailed dosage parsing

---

### FhirToCdm (.NET)

**Source**: `FhirToCdmMappings.cs` - `CreateDrugExposure()`

**Direction**: FHIR → OMOP (MedicationRequest only)

---

## Status Filtering

### MedicationRequest

| Status | Action |
|--------|--------|
| active | Map |
| completed | Map |
| on-hold | Skip |
| cancelled | Skip |
| entered-in-error | Skip |
| stopped | Skip |
| draft | Skip |
| unknown | Skip |

### MedicationStatement

| Status | Action |
|--------|--------|
| active | Map |
| completed | Map |
| entered-in-error | Skip |
| intended | Skip |
| stopped | Skip |
| not-taken | Skip |
| on-hold | Skip |
| unknown | Skip |

## Validation Rules

Resources are skipped (return null) when:
- Status is not active or completed
- `medicationCodeableConcept.coding` is empty
- Start date is missing (authoredOn for Request, effective[x] for Statement)

## Vocabulary Priority

Code selection follows this priority order (via `selectBestCoding`):

1. RxNorm (`http://www.nlm.nih.gov/research/umls/rxnorm`)
2. SNOMED CT (`http://snomed.info/sct`)
3. NDC (`http://hl7.org/fhir/sid/ndc`)

## Unmapped FHIR Elements — MedicationRequest

| FHIR Element | Reason Not Mapped | Potential Approach |
|--------------|-------------------|--------------------|
| `intent` | No OMOP equivalent | Used for classification only |
| `priority` | No column | Map to note |
| `medicationReference` | Not implemented | Resolve reference → extract code from Medication |
| `reasonCode` | No column in drug_exposure | Map as condition_occurrence |
| `reasonReference` | No column | Link via visit_occurrence_id |
| `note` | No column | Map to note_nlp table |
| `dosageInstruction[1..n]` | Only first used | Complex dosing simplified |
| `dosageInstruction.timing` | No direct equivalent | Dosing schedule |
| `dosageInstruction.site` | No column | Administration site |
| `dosageInstruction.method` | No column | Administration method |
| `dispenseRequest.expectedSupplyDuration` | days_supply is null | Could calculate |
| `substitution` | No column | Dispensing-specific |
| `courseOfTherapyType` | No column | Therapy course type |
| `insurance` | No column | Insurance data outside OMOP CDM |
| `recorder` vs `requester` | OMOP has single provider_id | Using requester |
| `sig` | No column | Free-text dosage instruction for patient |

## Unmapped FHIR Elements — MedicationStatement

| FHIR Element | Reason Not Mapped | Potential Approach |
|--------------|-------------------|--------------------|
| `medicationReference` | Not implemented | Resolve reference → extract code |
| `reasonCode` | No column in drug_exposure | Map as condition_occurrence |
| `reasonReference` | No column | Link via visit_occurrence_id |
| `note` | No column | Map to note_nlp |
| `dosage[1..n]` | Only first used | Complex dosing simplified |
| `dosage.timing` | No direct equivalent | Dosing schedule |
| `dosage.site` | No column | Administration site |
| `dosage.method` | No column | Administration method |
| `statusReason` | stop_reason not mapped | Could map to stop_reason |
| `category` | No direct equivalent | inpatient/outpatient/community classification |
| `dateAsserted` | No column | Date of assertion |
| `derivedFrom` | No direct equivalent | Source of data |
| `partOf` | No direct equivalent | Part of another event |

## Gaps and Future Work

- **Concept ID resolution**: `drug_concept_id` and `drug_source_concept_id` are placeholders (0) pending Athena vocabulary integration
- **Route concept mapping**: `route_concept_id` is null — requires vocabulary lookup
- **Dosage complexity**: FHIR dosage instructions are complex; simplified in OMOP
- **Days supply**: Calculation from dosage and quantity not implemented
- **medicationReference**: Only medicationCodeableConcept is supported; Reference requires resolving linked Medication resource
