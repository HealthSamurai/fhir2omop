# Immunization ↔ OMOP DRUG_EXPOSURE Mapping

## Overview

| FHIR Resource | OMOP Table | Direction |
|---------------|------------|-----------|
| Immunization | DRUG_EXPOSURE | Bidirectional |

**Key**: Immunizations are identified by filtering DRUG_EXPOSURE where `drug_concept_id` maps to CVX vocabulary.

## Field Mapping Summary

| FHIR Immunization Field | OMOP DRUG_EXPOSURE Field | Notes |
|-------------------------|--------------------------|-------|
| `Immunization.vaccineCode` | `drug_concept_id` | CVX vocabulary lookup |
| `Immunization.occurrenceDateTime` | `drug_exposure_start_date/datetime` | Administration date |
| `Immunization.occurrenceDateTime` | `drug_exposure_end_date/datetime` | Same as start (single event) |
| `Immunization.patient` | `person_id` | Reference resolution |
| `Immunization.encounter` | `visit_occurrence_id` | Reference resolution |
| `Immunization.performer[].actor` | `provider_id` | Reference resolution |
| `Immunization.lotNumber` | `lot_number` | Vaccine lot tracking |
| `Immunization.route` | `route_concept_id` | Administration route |
| `Immunization.doseQuantity` | `quantity` | Dose amount |
| `Immunization.vaccineCode.coding[].code` | `drug_source_value` | Original CVX code |

## Type Concept Mapping

| Source | OMOP Type Concept ID | Description |
|--------|---------------------|-------------|
| Administered | 38000179 | Physician administered drug (inpatient) |
| Self-reported | 44787730 | Patient Self-Reported Medication |

## CVX Vocabulary Filter

```sql
-- Immunization records identified by CVX vocabulary
SELECT * FROM drug_exposure de
JOIN concept c ON de.drug_concept_id = c.concept_id
WHERE c.vocabulary_id = 'CVX'
```

---

## Project Implementations

### omoponfhir-v54-r4 (Java)

**Source**: `omoponfhir-omopv5-r4-mapping/.../mapping/OmopImmunization.java`

**Direction**: Bidirectional

**Features**:
- Uses `FImmunizationView` filtered by CVX vocabulary
- Lot number tracking
- Route concept mapping

```java
private String _where = "c2.vocabulary_id = 'CVX'";
```

---

### fhir-omop-ig (FML)

**Source**: `input/maps/ImmunizationMap.fml`

**Direction**: FHIR → OMOP

```fml
group DrugExposure(source src: Immunization, target tgt : DrugExposureTable) {
    src.vaccineCode as s -> tgt then {
        s.coding as sc -> tgt then {
            sc.code -> tgt.drug_concept_id, tgt.drug_source_value;
        };
    };
    src.occurrence : dateTime as odt -> 
        tgt.drug_exposure_start_date = cast(odt, "date"),
        tgt.drug_exposure_end_date = cast(odt, "date");
    src.lotNumber as s -> tgt.lot_number = cast(s, "string");
}
```

---

### ETL-German-FHIR-Core (Java)

**Source**: `src/main/java/.../mapper/ImmunizationMapper.java`

**Direction**: FHIR → OMOP

**Features**:
- ATC and SNOMED vocabulary support (German codes)
- Domain-based routing

---

### FhirToCdm (.NET)

**Source**: `FhirToCdmMappings.cs` - `CreateDrugExposure()`

**Direction**: FHIR → OMOP

---

## Gaps and Considerations

- **Single event**: Start and end dates are the same
- **CVX mapping**: CVX codes need mapping to OMOP standard concepts
- **Series tracking**: `Immunization.protocolApplied` not directly mapped
- **Reaction**: Adverse reactions stored separately
