# FHIR-to-OMOP Cookbook

## Project Information

- **Project Name:** FHIR-to-OMOP Cookbook
- **URL:** https://github.com/CodeX-HL7-FHIR-Accelerator/fhir2omop-cookbook
- **Organization:** CodeX HL7 FHIR Accelerator
- **License:** Apache License 2.0

## Purpose/Description

The FHIR-to-OMOP Cookbook is a starter guide for implementers seeking to convert HL7 FHIR resources to the OMOP CDM (Common Data Model). The cookbook compares the purpose and design principles of both FHIR and OMOP CDM, proposes a methodology for mapping with example use cases, and provides patterns for mapping FHIR resources to equivalent OMOP CDM elements.

## Background

The conversion of Electronic Health Record (EHR) data from Health Level 7 (HL7) Fast Healthcare Interoperability Resources (FHIR) to the Observational Medical Outcomes Partnership (OMOP) Common Data Model (CDM) is becoming increasingly standardized for research, though inconsistent in use among implementers. To address this, HL7 and the Observational Health Data Sciences and Informatics (OHDSI) formed a partnership in 2021, focusing on better alignment between FHIR and the OMOP CDM, including mapping minimal Common Oncology Data Elements (mCODE) v2.0 FHIR resources to OMOP CDM v5.4.

## Key Features

- Holistic mapping approach
- Starter guide for implementers
- Step-by-step practical guidelines
- Example use cases and patterns
- Guidance for seamless integration of FHIR resources with the OMOP CDM

## Mapping Methodology

The cookbook outlines an 8-step method:

1. **Define the FHIR elements** that are relevant to represent in OMOP
2. **Identify the OMOP concept** that best matches each of the FHIR element
3. **Determine the OMOP CDM table** based on the OHDSI-assigned domain for the OMOP concept
4. **Map related FHIR resources** to the OMOP CDM table required fields
5. **Populate the OMOP CDM records** at the source record level
6. **Apply references and relationships** among the OMOP CDM records, linking back to the original resource where possible
7. **Test OMOP CDM mapping** and completeness
8. **Compare FHIR and OMOP representations** for a known set of patient information for accuracy and identify gaps

## Test Environment

The FHIR-to-OMOP Cookbook methodology was tested in the May 2022 HL7 FHIR Connectathon with mappings from mCODE v2.0 and OMOP CDM v5.4.

Components used:
- FHIR server
- OMOP CDM 5.4 Database

## FHIR Resources Covered

Based on the mCODE (minimal Common Oncology Data Elements) v2.0 focus:
- Cancer-related FHIR resources from mCODE implementation guide

## OMOP Tables Mapped

- OMOP CDM v5.4 tables (specific tables determined by OHDSI-assigned domains for mapped concepts)

## Results

Over 80% of the mCODE FHIR-based elements were mapped. Gaps and learnings from the mapping and testing process were documented in the FHIR-to-OMOP Cookbook.

## Conclusion

Although FHIR and OMOP are widely adopted standards, their purpose and data modeling differences require further guidance, including a methodology on how to integrate both process and technical transformations. The FHIR-to-OMOP Cookbook is an initial step in providing this guidance, and can be used to inform other interoperability efforts such as the HL7 Vulcan FHIR to OMOP project.

## Technology/Language

- Documentation-based (Word document, poster)
- No specific programming language implementation
- Methodology and guidance document

## Principal Artifacts

1. FHIR to OMOP Cookbook (Word document)
2. FHIR to OMOP Cookbook Poster (PNG image)

## Contact Information

- May Terry, MITRE - mayT@mitre.org
- Guy Livne, Kineret - Ministry of Health Israel - guy.livne@moh.gov.il
- Qi Yang, IQVIA - qi.yang1@iqvia.com

## Contributing Organizations

- IQVIA
- Kineret (Ministry of Health Israel)
- MITRE
- OHDSI

## Status

Work in progress - the cookbook will evolve over time to incorporate new insights and community feedback. Contributions are encouraged via:
- Email to the authors
- GitHub issues: https://github.com/CodeX-HL7-FHIR-Accelerator/fhir2omop-cookbook/issues
- GitHub notifications for updates

---

## Patient → OMOP Mapping Details

**Source**: `FHIR to OMOP Cookbook.docx` (Word document - not programmatic)

The cookbook provides conceptual guidance rather than executable code. Key points from the document regarding Patient→Person mapping:

### FHIR Patient → OMOP PERSON

| OMOP PERSON Field | FHIR Patient Source | Notes from Cookbook |
|-------------------|---------------------|---------------------|
| `person_id` | (generated) | Need to link from PERSON table with join to Person_Source_Value |
| `year_of_birth` | `Patient.birthDate` | Direct mapping mentioned |
| `gender_concept_id` | `Patient.gender` | See gender identity considerations below |
| `race_concept_id` | (extensions) | OMB Race codes don't have direct OMOP concept IDs |
| `ethnicity_concept_id` | (extensions) | OMB Ethnicity codes don't have direct OMOP concept IDs |
| `provider_id` | `Patient.generalPractitioner` | Referenced as Patient.provider |
| `care_site_id` | `Patient.managingOrganization` | Organization managing the patient |
| `person_source_value` | `Patient.identifier` | Used for joining back to PERSON table |

### Patterns Documented

The cookbook mentions these relevant patterns:

1. **FHIR Patient, Person, and Practitioner Patterns** - General demographic mapping guidance
2. **Pattern: Handling person names** - FHIR supports multiple names with qualifiers (legal, birth, etc.)
3. **Patient-stated Conditions** - Handling patient-reported data

### Gender Identity Mapping

The cookbook addresses gender identity mapping challenges:
- References HL7 Gender Identity ValueSet: https://terminology.hl7.org/5.5.0/ValueSet-gender-identity.html
- Notes complexity of mapping "Identifies as female gender" and similar values
- Acknowledges race and ethnicity concepts that are more detailed than existing OMOP vocabulary

### Gaps Identified

- OMB Race and Ethnicity category codes do not have direct OMOP concept IDs
- FHIR supports multiple person names; OMOP has single name fields
- Patient residential addresses (beyond postal/zip code) handling
- Gender identity vs biological sex distinction

### Notes

- This is a **guidance document**, not executable code
- Mapping methodology is conceptual (8-step process)
- Tested at May 2022 HL7 FHIR Connectathon with mCODE v2.0 → OMOP CDM v5.4
- Over 80% of mCODE elements were successfully mapped

---

## Observation → OMOP Mapping Details

**Source**: `FHIR to OMOP Cookbook.docx` (Word document - not programmatic)

**Note**: This is a **guidance document** providing conceptual mapping methodology rather than executable code. The Observation mapping follows the 8-step methodology outlined in the cookbook.

### FHIR Observation → OMOP (Conceptual Guidance)

Based on the cookbook methodology:

1. **Define the FHIR elements**: Identify Observation attributes (code, value, effective date, etc.)
2. **Identify the OMOP concept**: Map `Observation.code` to OMOP standard concept via vocabulary lookup
3. **Determine the OMOP CDM table**: Based on concept's domain_id:
   - Domain = "Measurement" → `measurement` table
   - Domain = "Observation" → `observation` table
   - Domain = "Procedure" → `procedure_occurrence` table
4. **Map related FHIR resources**: Link to Person (via `subject`) and Visit (via `encounter`)
5. **Populate the OMOP CDM records**: At source record level

### Expected Mappings (Conceptual)

| OMOP Field | FHIR Observation Source | Notes |
|------------|-------------------------|-------|
| `*_concept_id` | `Observation.code` | Via vocabulary translation |
| `*_date` | `Observation.effectiveDateTime` | Date component |
| `*_datetime` | `Observation.effectiveDateTime` | Full timestamp |
| `value_as_number` | `Observation.valueQuantity.value` | Numeric results |
| `value_as_concept_id` | `Observation.valueCodeableConcept` | Coded results |
| `unit_concept_id` | `Observation.valueQuantity.unit` | Unit mapping |
| `person_id` | `Observation.subject` | Reference to Patient→Person |
| `visit_occurrence_id` | `Observation.encounter` | Reference to Encounter→Visit |
| `provider_id` | `Observation.performer` | Reference to Practitioner→Provider |
| `*_source_value` | `Observation.code.coding[].code` | Original source code |

### Patterns Documented

The cookbook addresses laboratory and clinical observation patterns within the mCODE context, including:
- Cancer-related lab results (tumor markers, etc.)
- Staging observations
- Performance status observations

### Notes

- The cookbook is conceptual guidance, not executable code
- Domain-based routing (Measurement vs Observation) follows OHDSI vocabulary
- Specific mCODE-related observations were tested at HL7 Connectathon
- Reference resolution (person_id, visit_occurrence_id) requires implementation-specific handling

---

## Encounter → OMOP VISIT_OCCURRENCE Mapping

**Status**: Conceptual guidance (Word document)

### General Guidance

The cookbook provides conceptual mapping guidance for Encounter → VISIT_OCCURRENCE following the 8-step ETL methodology:

1. **Source Analysis**: Identify Encounter resources in source FHIR data
2. **Target Analysis**: Review OMOP VISIT_OCCURRENCE table requirements
3. **Gap Analysis**: Identify mapping challenges
4. **Value Mapping**: Map class codes to visit concepts
5. **Business Rules**: Define visit type assignment rules
6. **Technical Specification**: Document field-level mappings
7. **Implementation**: Build ETL logic
8. **Validation**: Test transformed data

### Key Mapping Concepts

| FHIR Encounter Field | OMOP VISIT_OCCURRENCE Field | Notes |
|---------------------|----------------------------|-------|
| `Encounter.id` | `visit_source_value` | Source identifier |
| `Encounter.class` | `visit_concept_id` | Via vocabulary lookup |
| `Encounter.period.start` | `visit_start_date/datetime` | Date extraction |
| `Encounter.period.end` | `visit_end_date/datetime` | Date extraction |
| `Encounter.subject` | `person_id` | Reference resolution |
| `Encounter.participant` | `provider_id` | Reference resolution |
| `Encounter.serviceProvider` | `care_site_id` | Reference resolution |
| `Encounter.hospitalization.admitSource` | `admitted_from_concept_id` | Via vocabulary lookup |
| `Encounter.hospitalization.dischargeDisposition` | `discharged_to_concept_id` | Via vocabulary lookup |

### Notes

- The cookbook is conceptual guidance, not executable code
- Visit type assignment (IP, OP, ER) follows OHDSI vocabulary patterns
- Reference resolution requires implementation-specific handling
- Documented as part of mCODE/CodeX FHIR Accelerator project

---

## Condition → OMOP CONDITION_OCCURRENCE Mapping

**Source**: `FHIR to OMOP Cookbook.docx` (Word document - not programmatic)

**Note**: This is a **guidance document** providing conceptual mapping methodology rather than executable code.

### Mapping Methodology (8-Step Process)

Following the cookbook's methodology for Condition:

1. **Define the FHIR elements**: Identify Condition attributes (code, onset, clinical status, etc.)
2. **Identify the OMOP concept**: Map `Condition.code` to OMOP standard concept via vocabulary lookup
3. **Determine the OMOP CDM table**: Based on concept's domain_id:
   - Domain = "Condition" → `condition_occurrence` table
   - Domain = "Observation" → `observation` table (for some findings)
4. **Map related FHIR resources**: Link to Person (via `subject`) and Visit (via `encounter`)
5. **Populate the OMOP CDM records**: At source record level
6. **Apply references and relationships**: Link to visit, provider
7. **Test mapping**: Validate completeness
8. **Compare representations**: Verify accuracy

### Expected Mappings (Conceptual)

| OMOP CONDITION_OCCURRENCE Field | FHIR Condition Source | Notes |
|---------------------------------|----------------------|-------|
| `condition_concept_id` | `Condition.code` | Via vocabulary translation (ICD-10, SNOMED) |
| `condition_start_date` | `Condition.onsetDateTime` | Date component |
| `condition_start_datetime` | `Condition.onsetDateTime` | Full timestamp |
| `condition_end_date` | `Condition.abatementDateTime` | If resolved |
| `condition_end_datetime` | `Condition.abatementDateTime` | If resolved |
| `condition_type_concept_id` | `Condition.category` | Problem list vs encounter diagnosis |
| `condition_status_concept_id` | `Condition.clinicalStatus` | Active, resolved, etc. |
| `person_id` | `Condition.subject` | Reference to Patient→Person |
| `visit_occurrence_id` | `Condition.encounter` | Reference to Encounter→Visit |
| `provider_id` | `Condition.asserter` | Reference to Practitioner→Provider |
| `condition_source_value` | `Condition.code.coding[].code` | Original source code |
| `stop_reason` | `Condition.abatementString` | Reason for resolution |

### Category Mapping Guidance

| FHIR Category | OMOP Type Concept Guidance |
|---------------|---------------------------|
| `problem-list-item` | Problem list entry type |
| `encounter-diagnosis` | Encounter diagnosis type |
| (other) | Implementation-specific |

### Gaps Identified

- Clinical status mapping (active, resolved) to OMOP `condition_status_concept_id`
- Verification status has no direct OMOP equivalent
- Severity and stage may require separate observation records
- Body site handling for detailed anatomical location

### Notes

- This is a **guidance document**, not executable code
- Domain-based routing follows OHDSI vocabulary
- mCODE-specific conditions (cancer staging, etc.) were tested at HL7 Connectathon
- Reference resolution (person_id, visit_occurrence_id) requires implementation-specific handling
