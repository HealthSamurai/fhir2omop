# FHIR to OMOP Implementation Guide (fhir-omop-ig)

## Project Information

- **Name**: FHIR to OMOP FHIR IG
- **ID**: hl7.fhir.uv.omop
- **URL**: https://github.com/HL7/fhir-omop-ig
- **Canonical URL**: http://hl7.org/fhir/uv/omop
- **Version**: 1.0.0-ballot
- **Status**: Active (Informative 1 - Ballot)
- **License**: CC0-1.0 (Creative Commons Zero)
- **Publisher**: HL7 International / Biomedical Research and Regulation (BR&R)
- **FHIR Version**: R5 (5.0.0)
- **OMOP CDM Version**: v5.4

## Purpose/Description

This Implementation Guide provides standardized mappings and guidance for transforming FHIR (Fast Healthcare Interoperability Resources) data to the OMOP (Observational Medical Outcomes Partnership) Common Data Model. It focuses exclusively on the FHIR-to-OMOP direction, enabling healthcare organizations to leverage real-time clinical data in FHIR format with OHDSI's analytics tools and methods.

The IG aims to:
- Establish a foundation for stable, reliable FHIR-to-OMOP transformation artifacts
- Reduce implementation costs
- Increase the speed of ETL in projects
- Increase the quality of transformed data for a core set of patient data
- Support AI model training and classification using standardized OMOP data

## Key Features

1. **Logical Models**: OMOP CDM tables expressed as FHIR Logical Models
2. **Structure Maps**: Mappings using FHIR Mapping Language (FML)
3. **Comprehensive Guidance**: Best practices for ETL development
4. **Code Prioritization Framework**: Systematic hierarchy for handling multiple codes
5. **Terminology Server Integration**: API-based vocabulary lookup methodology
6. **Validation Package**: Jupyter notebook for FHIR JSON and OMOP CSV validation

## Technology/Language

- **Specification Language**: FHIR Shorthand (FSH) via SUSHI
- **Mapping Language**: FHIR Mapping Language (FML)
- **Build Tools**: HL7 FHIR Publisher
- **Terminology Server**: Echidna (FHIR terminology server for OHDSI vocabularies)
- **Vocabulary Lookup**: OHDSI Athena

## FHIR Resources Covered

Based on International Patient Access (IPA) profiles plus US Core Encounter/Procedure:

| FHIR Resource | Target OMOP Table |
|---------------|-------------------|
| Patient | Person |
| Condition | Condition Occurrence |
| Encounter | Visit Occurrence |
| Procedure | Procedure Occurrence |
| MedicationStatement | Drug Exposure |
| MedicationRequest | Drug Exposure (discussed) |
| Observation | Measurement / Observation |
| Immunization | Drug Exposure |
| AllergyIntolerance | Observation |

## OMOP Tables Mapped (Logical Models)

The IG provides FHIR Logical Models for these OMOP CDM v5.4 tables:

### Clinical Data Tables
- **Person** - Central identity management
- **Condition Occurrence** - Diagnoses and conditions
- **Condition Era** - Aggregated condition periods
- **Drug Exposure** - Medications and drugs
- **Drug Era** - Aggregated drug exposure periods
- **Dose Era** - Aggregated dose periods
- **Procedure Occurrence** - Medical procedures
- **Device Exposure** - Medical devices
- **Measurement** - Lab results and vitals
- **Observation** - Clinical observations
- **Observation Period** - Patient observation windows
- **Specimen** - Biological specimens
- **Death** - Mortality information
- **Note** - Clinical notes
- **Note NLP** - NLP-extracted data from notes

### Visit/Encounter Tables
- **Visit Occurrence** - Healthcare encounters
- **Visit Detail** - Detailed visit information

### Provider/Location Tables
- **Provider** - Healthcare providers
- **Care Site** - Healthcare facilities
- **Location** - Physical addresses

### Administrative Tables
- **Cost** - Healthcare costs
- **Payer Plan Period** - Insurance coverage
- **Episode** - Clinical episodes
- **Episode Event** - Events within episodes
- **Fact Relationship** - Relationships between facts

## Structure Maps (FML Mappings)

Nine formal mappings are defined:

1. **PersonMap** - FHIR Patient to OMOP Person
2. **ConditionMap** - FHIR Condition to OMOP Condition Occurrence
3. **EncounterVisitMap** - FHIR Encounter to OMOP Visit Occurrence
4. **MedicationMap** - FHIR MedicationStatement to OMOP Drug Exposure
5. **MeasurementMap** - FHIR Observation to OMOP Measurement
6. **ObservationMap** - FHIR Observation to OMOP Observation
7. **ProcedureMap** - FHIR Procedure to OMOP Procedure Occurrence
8. **ImmunizationMap** - FHIR Immunization to OMOP Drug Exposure
9. **AllergyMap** - FHIR AllergyIntolerance to OMOP Observation

## Mapping Details

### Key Mapping Considerations

1. **Domain Assignment**: Vocabulary-driven approach using OMOP concept domain_id, not FHIR resource type
2. **Code Prioritization**: SNOMED CT > RxNorm > LOINC > ICD-10 > CPT/HCPCS > Local codes
3. **Source Value Preservation**: Always preserve original codes in `*_source_value` fields
4. **Type Concepts**: Use `*_type_concept_id` fields to indicate data provenance (EHR, claims, patient-reported)
5. **Status Filtering**: Only map completed activities; filter out planned/cancelled data

### Identifier Management Strategies

| Strategy | Use Case |
|----------|----------|
| Direct Mapping | System-generated integer identifiers without PII |
| External Storage | Separate mapping tables for FHIR-to-OMOP ID links |
| Exclusion | MRNs, names, and other PII-containing identifiers |

### Temporal Handling

- OMOP uses date-level precision (YYYY-MM-DD)
- Partial dates require documented imputation rules
- Store imputations in `*_source_value` fields

### Code Mapping Workflow

1. Translate source code via ConceptMap/$translate
2. Lookup concept properties via CodeSystem/$lookup
3. If non-standard, find "Maps to" Standard concept
4. Store source in `*_source_value`, standard concept in `*_concept_id`

## Use Cases

1. **NIH All of Us Research Program** - Large-scale EHR data transformation
2. **Vulcan Real-World Data IG** - Clinical trial data retrieval
3. **AI Training and Classification** - Transform FHIR for OMOP-trained AI models

## Key Challenges Addressed

- Identifier management and de-identification
- Status and intent element filtering
- Data completeness and missingness
- Contextual gaps in mapping
- HL7 Flavors of Null handling
- Temporal precision differences
- Historical code transformations
- Multiple coding system prioritization

## Primary Authors

- Davera Gabriel (Evidentli, Inc)
- Jean Duteau (Dogwood Consulting)

## Contributing Organizations

- Vulcan FHIR Accelerator
- OHDSI OMOP + FHIR Working Group
- CareEvolution, Inc
- Georgia Tech Research Institute
- Evidentli, Inc
- NACHC
- TU Dresden
- Johns Hopkins University
- Columbia University
- Duke University
- University of North Carolina

## Related Resources

- [OHDSI Athena Vocabulary](https://athena.ohdsi.org/)
- [Echidna Terminology Server](https://echidna.fhir.org)
- [International Patient Access IG](https://hl7.org/fhir/uv/ipa/)
- [Vulcan Real-World Data IG](https://hl7.org/fhir/uv/vulcan-rwd/)
- [Discussion Forum](https://chat.fhir.org/#narrow/stream/286658-omop-.2B-fhir)
- [Project Page](https://confluence.hl7.org/spaces/VA/pages/325451879/FHIR+to+OMOP+2025)

---

## Patient → OMOP Mapping Details

**Logical Model**: [`input/fsh/Person.fsh`](https://github.com/HL7/fhir-omop-ig/blob/master/input/fsh/Person.fsh)

**Structure Map (FML)**: [`input/maps/PersonMap.fml`](https://github.com/HL7/fhir-omop-ig/blob/master/input/maps/PersonMap.fml)

**Documentation**: [`input/pagecontent/StructureMap-PersonMap-intro.md`](https://github.com/HL7/fhir-omop-ig/blob/master/input/pagecontent/StructureMap-PersonMap-intro.md)

### FHIR Patient → OMOP PERSON (FML Structure Map)

| OMOP PERSON Field | FHIR Patient Source | Notes |
|-------------------|---------------------|-------|
| `person_id` | (implementation-specific) | Not mapped in FML; generated by target system |
| `gender_concept_id` | `Patient.gender` | Direct mapping (requires vocabulary translate) |
| `gender_source_value` | `Patient.gender` | Cast to string |
| `year_of_birth` | `Patient.birthDate` | Substring(0,4) |
| `month_of_birth` | `Patient.birthDate` | Substring(5,2) |
| `day_of_birth` | `Patient.birthDate` | Substring(8,2) |
| `birth_datetime` | `Patient.birthDate` | Direct mapping |
| `race_concept_id` | (not in core map) | Required field - see guidance |
| `ethnicity_concept_id` | (not in core map) | Required field - see guidance |
| `location_id` | (not in core map) | FK to Location table |
| `provider_id` | (not in core map) | FK to Provider table |
| `care_site_id` | (not in core map) | FK to CareSite table |
| `person_source_value` | (not in core map) | Link back to source patient ID |

### Gender Concept Mapping

| FHIR Gender Value | OMOP Concept ID | OMOP Concept Name |
|-------------------|-----------------|-------------------|
| `male` | 8507 | MALE |
| `female` | 8532 | FEMALE |
| `other` | 44814653 | Other |
| `unknown` | 8551 | UNKNOWN |
| (null/missing) | 0 | No matching concept (recommended) |

### OMOP PERSON Logical Model Fields

From `Person.fsh`:

| Field | Cardinality | Type | Description |
|-------|-------------|------|-------------|
| `person_id` | 1..1 | integer | Unique person identifier |
| `gender_concept_id` | 1..1 | code | Biological sex at birth (NOT gender identity) |
| `year_of_birth` | 1..1 | integer | Year of birth |
| `month_of_birth` | 0..1 | integer | Month of birth |
| `day_of_birth` | 0..1 | integer | Day of birth |
| `birth_datetime` | 0..1 | dateTime | Full birth datetime |
| `race_concept_id` | 1..1 | code | Race or ethnic background |
| `ethnicity_concept_id` | 1..1 | code | Hispanic vs Non-Hispanic (US OMB) |
| `location_id` | 0..1 | Reference(Location) | Last known physical address |
| `provider_id` | 0..1 | Reference(Provider) | Primary care provider |
| `care_site_id` | 0..1 | Reference(CareSite) | Primary care site |
| `person_source_value` | 0..1 | string | Source system identifier |
| `gender_source_value` | 0..1 | string | Source gender value |
| `gender_source_concept_id` | 0..1 | code | Non-standard gender concept |
| `race_source_value` | 0..1 | string | Source race value |
| `race_source_concept_id` | 0..1 | code | OMOP-supported race concept |
| `ethnicity_source_value` | 0..1 | string | Source ethnicity value |
| `ethnicity_source_concept_id` | 0..1 | code | OMOP-supported ethnicity concept |

### Sex vs Gender Identity Guidance

The IG provides extensive guidance on handling sex and gender:

1. **`gender_concept_id` represents biological sex**, not gender identity
   - OHDSI acknowledges this field should be renamed to `sex_concept_id` in future CDM versions

2. **Gender identity should be stored in OBSERVATION table**, not PERSON table
   - Gender identity can change over time
   - Use observation concepts and dates to track changes

3. **HL7 Gender Harmony Project** considerations:
   - Recorded Sex or Gender (RSG): Official document sex/gender
   - Sex for Clinical Use (SFCU): Clinically relevant sex
   - Gender Identity: Personal identification (→ OBSERVATION table)

### Notes

- The FML Structure Map is intentionally minimal as a reference implementation
- Required fields (`race_concept_id`, `ethnicity_concept_id`) need implementation-specific handling
- US-centric ethnicity (Hispanic/Non-Hispanic) may not apply to all jurisdictions
- Implementations should establish clear null-handling policies

---

## Observation → OMOP Mapping Details

**Measurement Logical Model**: [`input/fsh/Measurement.fsh`](https://github.com/HL7/fhir-omop-ig/blob/master/input/fsh/Measurement.fsh)

**Observation Logical Model**: [`input/fsh/Observation.fsh`](https://github.com/HL7/fhir-omop-ig/blob/master/input/fsh/Observation.fsh)

**Measurement Structure Map (FML)**: [`input/maps/Measurement.fml`](https://github.com/HL7/fhir-omop-ig/blob/master/input/maps/Measurement.fml)

**Observation Structure Map (FML)**: [`input/maps/Observation.fml`](https://github.com/HL7/fhir-omop-ig/blob/master/input/maps/Observation.fml)

**Note**: FHIR Observation maps to **two different OMOP tables** based on category:
- `measurement` table (category = `vital-signs` or `laboratory`)
- `observation` table (category = `social-history`, `imaging`, `survey`, `exam`, `therapy`, `activity`, or `procedure`)

### Domain Routing by Category

| FHIR Observation Category | OMOP Target Table |
|---------------------------|-------------------|
| `vital-signs` | measurement |
| `laboratory` | measurement |
| `social-history` | observation |
| `imaging` | observation |
| `survey` | observation |
| `exam` | observation |
| `therapy` | observation |
| `activity` | observation |
| `procedure` | observation |

### FHIR Observation → OMOP MEASUREMENT (FML Structure Map)

| OMOP MEASUREMENT Field | FHIR Observation Source | Notes |
|------------------------|-------------------------|-------|
| `measurement_concept_id` | `Observation.code.coding[].code` | Requires vocabulary lookup |
| `measurement_date` | `Observation.effectiveDateTime` | Cast to date |
| `measurement_datetime` | `Observation.effectiveDateTime` | Direct; also from `effectivePeriod.start` or `instant` |
| `measurement_source_value` | `Observation.issued` | Only if different from effectiveDate |
| `value_as_number` | `Observation.valueQuantity.value` | Numeric result |
| `unit_concept_id` | `Observation.valueQuantity.unit` | Unit mapping |
| `value_as_concept_id` | `Observation.valueCodeableConcept.coding[].code` | Coded result; also from `interpretation` |
| `value_source_value` | `Observation.valueString` | String value |
| `measurement_source_value` | `Observation.note` | Note content (complex notes → Note table) |
| `person_id` | `Observation.subject` | Commented out in FML (implementation-specific) |
| `visit_occurrence_id` | `Observation.encounter` | Commented out in FML (implementation-specific) |
| `provider_id` | `Observation.performer` | Commented out in FML (implementation-specific) |

### FHIR Observation → OMOP OBSERVATION (FML Structure Map)

| OMOP OBSERVATION Field | FHIR Observation Source | Notes |
|------------------------|-------------------------|-------|
| `observation_concept_id` | `Observation.code.coding[].code` | Requires vocabulary lookup |
| `observation_date` | `Observation.effectiveDateTime` | Cast to date |
| `observation_datetime` | `Observation.effectiveDateTime` | Direct; also from `effectivePeriod.start` or `instant` |
| `observation_source_value` | `Observation.issued` | Only if different from effectiveDate |
| `value_as_number` | `Observation.valueQuantity.value` | Numeric result |
| `unit_concept_id` | `Observation.valueQuantity.unit` | Unit mapping |
| `value_as_concept_id` | `Observation.valueCodeableConcept.coding[].code` | Coded result |
| `value_as_string` | `Observation.valueString` | String value |
| `observation_source_value` | `Observation.note` | Note content |
| `person_id` | `Observation.subject` | Commented out in FML (implementation-specific) |
| `visit_occurrence_id` | `Observation.encounter` | Commented out in FML (implementation-specific) |
| `provider_id` | `Observation.performer` | Commented out in FML (implementation-specific) |

### OMOP MEASUREMENT Logical Model Fields

From `Measurement.fsh`:

| Field | Cardinality | Type | Description |
|-------|-------------|------|-------------|
| `measurement_id` | 1..1 | code | Measurement identifier |
| `person_id` | 1..1 | Reference(Person) | Person reference |
| `measurement_concept_id` | 1..1 | code | Standard measurement concept |
| `measurement_date` | 1..1 | date | Date of measurement |
| `measurement_datetime` | 0..1 | dateTime | Datetime of measurement |
| `measurement_time` | 0..1 | string | Time of measurement |
| `measurement_type_concept_id` | 1..1 | code | Provenance (EHR, claim, etc.) |
| `operator_concept_id` | 0..1 | code | Operator (<, =, >, etc.) |
| `value_as_number` | 0..1 | integer | Numeric result |
| `value_as_concept_id` | 0..1 | code | Categorical result |
| `unit_concept_id` | 0..1 | code | Unit of measurement |
| `range_low` | 0..1 | integer | Reference range low |
| `range_high` | 0..1 | integer | Reference range high |
| `provider_id` | 0..1 | Reference(Provider) | Provider who ordered/recorded |
| `visit_occurrence_id` | 0..1 | Reference(VisitOccurrence) | Associated visit |
| `visit_detail_id` | 0..1 | Reference(VisitDetail) | Associated visit detail |
| `measurement_source_value` | 0..1 | string | Source measurement code |
| `measurement_source_concept_id` | 0..1 | code | Source concept |
| `unit_source_value` | 0..1 | string | Source unit |
| `unit_source_concept_id` | 0..1 | code | Source unit concept |
| `value_source_value` | 0..1 | string | Source result value |
| `measurement_event_id` | 0..1 | string | Linked record ID |
| `meas_event_field_concept_id` | 0..1 | code | Linked record table |

### OMOP OBSERVATION Logical Model Fields

From `Observation.fsh`:

| Field | Cardinality | Type | Description |
|-------|-------------|------|-------------|
| `observation_id` | 1..1 | code | Observation identifier |
| `person_id` | 1..1 | Reference(Person) | Person reference |
| `observation_concept_id` | 1..1 | code | Standard observation concept |
| `observation_date` | 1..1 | date | Date of observation |
| `observation_datetime` | 0..1 | dateTime | Datetime of observation |
| `observation_type_concept_id` | 1..1 | code | Provenance (EHR, claim, etc.) |
| `value_as_number` | 0..1 | integer | Numeric result |
| `value_as_string` | 0..1 | string | Categorical/text result |
| `value_as_concept_id` | 0..1 | code | Coded result (e.g., ICD10 family history) |
| `qualifier_concept_id` | 0..1 | code | Qualifiers (severity, etc.) |
| `unit_concept_id` | 0..1 | code | Unit of observation |
| `provider_id` | 0..1 | Reference(Provider) | Provider who ordered/recorded |
| `visit_occurrence_id` | 0..1 | Reference(VisitOccurrence) | Associated visit |
| `visit_detail_id` | 0..1 | Reference(VisitDetail) | Associated visit detail |
| `observation_source_value` | 0..1 | string | Source observation code |
| `observation_source_concept_id` | 0..1 | code | Source concept |
| `unit_source_value` | 0..1 | string | Source unit |
| `qualifier_source_value` | 0..1 | string | Source qualifier |
| `value_source_value` | 0..1 | string | Source result value |
| `observation_event_id` | 0..1 | string | Linked record ID |
| `obs_event_field_concept_id` | 0..1 | code | Linked record table |

### Blood Pressure Handling

As noted in the logical model: "Measurements such as blood pressures will be split into their component parts i.e. one record for systolic, one record for diastolic."

### Notes

- The FML maps are minimal reference implementations; many fields are commented out
- `person_id`, `visit_occurrence_id`, and `provider_id` require implementation-specific reference resolution
- Category-based routing is the primary decision mechanism for Measurement vs Observation
- `interpretation` can be mapped to `value_as_concept_id` in measurement table
- Complex notes should be stored in the Note table, not observation_source_value

---

## Encounter → OMOP VISIT_OCCURRENCE Mapping

**Source**: [`input/maps/EncounterVisit.fml`](https://github.com/HL7/fhir-omop-ig/blob/master/input/maps/EncounterVisit.fml)

### FML StructureMap

```
/// url = 'http://hl7.org/fhir/uv/omop/StructureMap/EncounterVisitMap'
/// name = 'EncounterVisitMap'
/// title = 'Mapping Encounter resource to VisitOccurrence OMOP Domain'

uses "http://hl7.org/fhir/StructureDefinition/Encounter" alias Encounter as source
uses "http://hl7.org/fhir/uv/omop/StructureDefinition/VisitOccurrence" alias VisitTable as target
```

### Field-Level Mapping

| FHIR Encounter Field | OMOP VISIT_OCCURRENCE Field | FML Logic |
|---------------------|----------------------------|-----------|
| `Encounter.class.coding[0].code` | `visit_concept_id`, `visit_source_value`, `visit_source_concept_id` | Direct mapping |
| `Encounter.actualPeriod.start` | `visit_start_date` | `cast(std, "date")` |
| `Encounter.actualPeriod.start` | `visit_start_datetime` | Direct |
| `Encounter.actualPeriod.end` | `visit_end_date` | `cast(ed, "date")` |
| `Encounter.actualPeriod.end` | `visit_end_datetime` | Direct |
| `Encounter.admission.admitSource.coding[0].code` | `admitted_from_concept_id`, `admitted_from_source_value` | Direct |
| `Encounter.admission.dischargeDisposition.coding[0].code` | `discharged_to_concept_id`, `discharged_to_source_value` | Direct |

### FML Implementation (from EncounterVisit.fml)

```fml
group VisitOccurrence(source src: Encounter, target tgt : VisitTable) {
    // Class → visit concept
    src.class as s -> tgt then {
        s.coding as sc -> tgt then {
            sc.code as a-> tgt.visit_concept_id = a,
                          tgt.visit_source_value = a,
                          tgt.visit_source_concept_id = a;
        };
    };

    // Period → visit dates
    src.actualPeriod as s -> tgt then {
        s.start as std -> tgt.visit_start_date = cast(std, "date"),
                         tgt.visit_start_datetime = std;
        s.end as ed -> tgt.visit_end_date = cast(ed, "date"),
                      tgt.visit_end_datetime = ed;
    };

    // Hospitalization → admit/discharge
    src.admission as s -> tgt then {
        s.admitSource as sa -> tgt then {
            sa.coding as sc -> tgt then {
                sc.code as code -> tgt.admitted_from_concept_id = code,
                                  tgt.admitted_from_source_value = code;
            };
        };
        s.dischargeDisposition as sd -> tgt then {
            sd.coding as sc -> tgt then {
                sc.code as code -> tgt.discharged_to_concept_id = code,
                                  tgt.discharged_to_source_value = code;
            };
        };
    };
}
```

### Fields NOT Mapped (commented out in FML)

- `visit_occurrence_id` - Auto-generated
- `person_id` - Requires patient reference resolution
- `visit_type_concept_id` - Implementation-specific
- `provider_id` - Requires reference resolution
- `care_site_id` - Requires reference resolution
- `preceding_visit_occurrence_id` - Requires historical lookup

### Notes

- Uses FHIR R5 `actualPeriod` (R4 uses `period`)
- Uses FHIR R5 `admission` (R4 uses `hospitalization`)
- `visit_concept_id` should be looked up via terminology server
- Reference resolution for `person_id` is implementation-specific
- Status mapping not implemented (OMOP has no status field)

---

## Condition → OMOP CONDITION_OCCURRENCE Mapping

**Source**: [`input/maps/condition.fml`](https://github.com/HL7/fhir-omop-ig/blob/master/input/maps/condition.fml)

### FML StructureMap

```
/// url = 'http://hl7.org/fhir/uv/omop/StructureMap/ConditionMap'
/// name = 'ConditionMap'
/// title = 'Mapping Condition resource to Condition Occurrence OMOP Domain'

uses "http://hl7.org/fhir/StructureDefinition/Condition" alias Condition as source
uses "http://hl7.org/fhir/uv/omop/StructureDefinition/ConditionOccurrence" alias ConOccTable as target
```

### Field-Level Mapping

| FHIR Condition Field | OMOP CONDITION_OCCURRENCE Field | FML Logic |
|---------------------|--------------------------------|-----------|
| `Condition.code.coding[0].code` | `condition_concept_id` | Direct |
| `Condition.recordedDate` | `condition_start_datetime`, `condition_start_date` | Cast to dateTime |
| `Condition.onset:dateTime` | `condition_start_datetime`, `condition_start_date` | Direct; date cast |
| `Condition.abatement:dateTime` | `condition_end_datetime`, `condition_end_date` | Direct; date cast |
| `Condition.category.coding[0].code` | `condition_type_concept_id` | Direct |
| `Condition.clinicalStatus.coding[0].code` | `condition_status_concept_id` | Direct |
| `Condition.evidence.concept.coding[0].code` | `condition_source_concept_id` | Direct |

### FML Implementation (from condition.fml)

```fml
group ConditionOccurrence(source src : Condition, target tgt : ConOccTable) {
    // Code → concept
    src.code as s -> tgt then {
        s.coding as sc -> tgt then {
            sc.code as a -> tgt.condition_concept_id = a;
        };
    };

    // Dates
    src.recordedDate as rd -> tgt.condition_start_datetime = cast(rd,"dateTime"),
                              tgt.condition_start_date = rd;
    src.onset : dateTime as osd -> tgt.condition_start_datetime = osd,
                                   tgt.condition_start_date = cast(osd, "date");
    src.abatement : dateTime as abdt -> tgt.condition_end_datetime = adt,
                                        tgt.condition_end_date = cast(abdt, "date");

    // Category → type concept
    src.category as s -> tgt then {
        s.coding as sc -> tgt then {
            sc.code as a -> tgt.condition_type_concept_id = a;
        };
    };

    // Clinical status
    src.clinicalStatus as s -> tgt then {
        s.coding as sc -> tgt then {
            sc.code as a -> tgt.condition_status_concept_id = a;
        };
    };

    // Evidence → source concept
    src.evidence as s -> tgt then {
        s.concept as sc -> tgt then {
            sc.coding as sci -> tgt then {
                sci.code as a -> tgt.condition_source_concept_id = a;
            };
        };
    };
}
```

### Fields NOT Mapped (commented out in FML)

- `condition_occurrence_id` - Auto-generated
- `person_id` - Requires patient reference resolution
- `visit_occurrence_id` - Requires encounter reference resolution
- `provider_id` - Requires reference resolution
- `condition_source_value` - Not in current mapping
- `stop_reason` - Not in current mapping

### Notes

- FML is reference implementation - many fields need implementation-specific handling
- `condition_status_concept_id` maps from `clinicalStatus` (active, resolved, etc.)
- Date priority: `onset` preferred over `recordedDate` when both present
- Evidence concepts can be stored as source concepts for traceability
