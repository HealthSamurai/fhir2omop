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

## Gaps and Considerations

- **Dosage complexity**: FHIR dosage instructions are complex; simplified in OMOP
- **Days supply**: Calculation from dosage and quantity
- **Refills**: `MedicationRequest.dispenseRequest.numberOfRepeatsAllowed`
- **Sig**: Free-text dosage instructions in `sig` field
