# Vulcan FHIR-to-OMOP Mapping Project

## Project Information

- **Project Name**: Vulcan FHIR-to-OMOP Mapping Project
- **Repository URL**: https://github.com/OMOP-FHIR-Terminologies-Subgroup/Vulcan-Fhir-to-OMOP-Mapping-Project
- **Organization**: OMOP-FHIR Terminologies Subgroup (part of HL7 Vulcan Accelerator)

## Purpose/Description

A collection of prior FHIR↔OMOP mapping artifacts contributed by various organizations. This repository serves as a reference archive of mapping work from different projects including DAF (Data Access Framework), NACHC, and Georgia Tech's OMOPonFHIR.

The repository is primarily a source of mapping documentation and examples rather than executable code.

## Contents

### Mapping Artifacts

| Directory | Contents |
|-----------|----------|
| `DAF Source Content/` | OMOP2FHIR Working Document.xlsx - comprehensive mapping spreadsheet |
| `Mapping_Templates/` | Template spreadsheet for mapping format |
| `NACHC/` | NACHC test data and mapping artifacts |
| `OMOPonFHIR_GT_mapping_artifacts/` | Georgia Tech OMOPonFHIR examples |

### Key Files

- **8Jun22 mapping format Scratch sheet.xlsx** - Working mapping document
- **OMOP2FHIR Working Document.xlsx** - DAF Source content with bidirectional mappings
- **Template from 8Jun22 mapping format Scratch sheet.xlsx** - Mapping template

### OMOPonFHIR GT Artifacts

Example mapping artifacts from Georgia Tech's OMOPonFHIR implementation:

| File | Description |
|------|-------------|
| Patient_Original.json | Original FHIR Patient sent to OMOPonFHIR |
| Person_and_fPerson.sql | SQL output from OMOPonFHIR mapping |
| Patient_From_OMOPonFHIR.json | OMOP→FHIR result from OMOPonFHIR |

## Directory Structure

```
Vulcan-Fhir-to-OMOP-Mapping-Project/
├── 8Jun22 mapping format Scratch sheet.xlsx
├── DAF Source Content/
│   └── OMOP2FHIR Working Document.xlsx
├── Mapping_Templates/
│   └── Template from 8Jun22 mapping format Scratch sheet.xlsx
├── NACHC/
│   └── test-data/
└── OMOPonFHIR_GT_mapping_artifacts/
    ├── Patient_Original.json
    ├── Person_and_fPerson.sql
    ├── Patient_From_OMOPonFHIR.json
    └── README.md
```

## Use Cases

- Reference for FHIR↔OMOP mapping decisions
- Starting point for new mapping implementations
- Understanding mapping patterns from different projects
- Template for documenting new mappings

## Related Projects

- **HL7 Vulcan Accelerator**: https://confluence.hl7.org/display/VA
- **OMOPonFHIR (Georgia Tech)**: https://github.com/omoponfhir
- **NACHC FHIR-to-OMOP**: https://github.com/NACHC-CAD/fhir-to-omop
- **HL7 FHIR-OMOP IG**: https://github.com/HL7/fhir-omop-ig

## License

Not explicitly specified in repository.

## Notes

- This is primarily a documentation/reference repository, not executable code
- Contains contributed mapping artifacts from multiple organizations
- Excel spreadsheets contain detailed field-level mappings
- Useful for understanding mapping decisions made by different implementers
- Part of the HL7 Vulcan FHIR Accelerator terminology harmonization efforts

---

## Patient → OMOP Mapping Example (Georgia Tech Artifacts)

**Source**: `OMOPonFHIR_GT_mapping_artifacts/`

This directory contains a complete example of FHIR Patient → OMOP Person mapping.

### Input: FHIR Patient (`Patient_Original.json`)

```json
{
  "resourceType": "Patient",
  "extension": [
    {
      "url": "http://hl7.org/fhir/us/core/StructureDefinition/us-core-race",
      "extension": [
        { "url": "ombCategory", "valueCoding": { "code": "2106-3", "display": "White" } },
        { "url": "text", "valueString": "White" }
      ]
    },
    {
      "url": "http://hl7.org/fhir/us/core/StructureDefinition/us-core-ethnicity",
      "extension": [
        { "url": "ombCategory", "valueCoding": { "code": "2186-5", "display": "Non Hispanic or Latino" } },
        { "url": "text", "valueString": "Non Hispanic or Latino" }
      ]
    }
  ],
  "identifier": [{ "value": "GTRI-WG-0001" }],
  "active": true,
  "name": [{ "family": "TEST", "given": ["NUMBERONE"] }],
  "gender": "male",
  "birthDate": "1964-06-01"
}
```

### Output: OMOP SQL (`Person_and_fPerson.sql`)

```sql
-- f_person table (extension table for FHIR-specific fields)
INSERT INTO f_person (person_id, family_name, given1_name, active)
SELECT coalesce(max(person_id), 0)+1, 'TEST', 'NUMBERONE', 1 FROM f_person;

-- person table (standard OMOP)
INSERT INTO person (
  person_id, gender_concept_id, year_of_birth, month_of_birth, day_of_birth,
  race_concept_id, ethnicity_concept_id, person_source_value,
  race_source_value, ethnicity_source_value, ethnicity_source_concept_id
)
SELECT coalesce(max(person_id), 0)+1,
  8507,           -- male
  1964, 6, 1,     -- 1964-06-01
  8527,           -- White race concept
  38003564,       -- Non Hispanic ethnicity concept
  'GTRI-WG-0001', -- identifier
  'White',
  'Non Hispanic or Latino',
  38003564
FROM person;
```

### Field-Level Mapping (from example)

| FHIR Patient Field | OMOP Table.Field | Value |
|--------------------|------------------|-------|
| `name[0].family` | `f_person.family_name` | `'TEST'` |
| `name[0].given[0]` | `f_person.given1_name` | `'NUMBERONE'` |
| `active` | `f_person.active` | `1` (true) |
| `gender` (male) | `person.gender_concept_id` | `8507` |
| `birthDate` (1964-06-01) | `person.year_of_birth` | `1964` |
| `birthDate` (1964-06-01) | `person.month_of_birth` | `6` |
| `birthDate` (1964-06-01) | `person.day_of_birth` | `1` |
| `identifier[0].value` | `person.person_source_value` | `'GTRI-WG-0001'` |
| US Core Race (2106-3) | `person.race_concept_id` | `8527` (White) |
| US Core Race display | `person.race_source_value` | `'White'` |
| US Core Ethnicity (2186-5) | `person.ethnicity_concept_id` | `38003564` |
| US Core Ethnicity display | `person.ethnicity_source_value` | `'Non Hispanic or Latino'` |

### Concept ID Reference

| Concept ID | Domain | Concept Name |
|------------|--------|--------------|
| 8507 | Gender | MALE |
| 8527 | Race | White |
| 38003564 | Ethnicity | Non Hispanic or Latino |

### Notes

- Uses Georgia Tech's `f_person` extension table for name fields and active status
- Standard OMOP `person` table stores demographics and coded values
- Race/Ethnicity codes from CDC Race & Ethnicity vocabulary (urn:oid:2.16.840.1.113883.6.238)
- Person ID generated via `SELECT coalesce(max(person_id), 0)+1` pattern

---

## Observation → OMOP Mapping

**Status**: **Documentation/Reference Only** (no executable code)

### Available Resources

The repository contains Excel-based mapping documentation in:
- `DAF Source Content/OMOP2FHIR Working Document.xlsx`
- `8Jun22 mapping format Scratch sheet.xlsx`

These spreadsheets contain field-level mapping specifications for multiple FHIR resources including Observation, but no code examples or JSON artifacts for Observation are included (only Patient examples exist in the GT artifacts directory).

### Purpose

This repository serves as a reference archive for FHIR↔OMOP mapping decisions made by various projects. For Observation mapping implementation, refer to:

- **OMOPonFHIR**: [omoponfhir-v54-r4.md](./omoponfhir-v54-r4.md) - bidirectional Java implementation
- **GT-FHIR**: [GT-FHIR.md](./GT-FHIR.md) - Georgia Tech's mapping documentation
- **HL7 FHIR-OMOP IG**: [fhir-omop-ig.md](./fhir-omop-ig.md) - official HL7 specification

### Notes

- Excel spreadsheets may contain Observation mapping specifications
- Repository is primarily for documentation, not executable mappings
- For implementation details, consult the actual code repositories listed above

---

## Encounter → OMOP VISIT_OCCURRENCE Mapping

**Status**: **Documentation/Reference Only** (no executable code)

### Available Resources

The repository contains Excel-based mapping documentation in:
- `DAF Source Content/OMOP2FHIR Working Document.xlsx`
- `8Jun22 mapping format Scratch sheet.xlsx`

These spreadsheets contain field-level mapping specifications for multiple FHIR resources including Encounter, but no code examples or JSON artifacts for Encounter are included.

### Purpose

For Encounter mapping implementation, refer to:

- **OMOPonFHIR**: [omoponfhir-v54-r4.md](./omoponfhir-v54-r4.md) - bidirectional Java implementation
- **GT-FHIR**: [GT-FHIR.md](./GT-FHIR.md) - Georgia Tech's mapping documentation
- **HL7 FHIR-OMOP IG**: [fhir-omop-ig.md](./fhir-omop-ig.md) - official HL7 specification

### Notes

- Excel spreadsheets may contain Encounter mapping specifications
- Repository is primarily for documentation, not executable mappings
- For implementation details, consult the actual code repositories listed above

---

## Condition → OMOP CONDITION_OCCURRENCE Mapping

**Status**: **Documentation/Reference Only** (no executable code)

### Available Resources

The repository contains Excel-based mapping documentation in:
- `DAF Source Content/OMOP2FHIR Working Document.xlsx`
- `8Jun22 mapping format Scratch sheet.xlsx`

These spreadsheets contain field-level mapping specifications for multiple FHIR resources including Condition, but no code examples or JSON artifacts for Condition are included.

### Purpose

For Condition mapping implementation, refer to:

- **OMOPonFHIR**: [omoponfhir-v54-r4.md](./omoponfhir-v54-r4.md) - bidirectional Java implementation
- **GT-FHIR**: [GT-FHIR.md](./GT-FHIR.md) - Georgia Tech's mapping documentation
- **HL7 FHIR-OMOP IG**: [fhir-omop-ig.md](./fhir-omop-ig.md) - official HL7 specification

### Notes

- Excel spreadsheets may contain Condition mapping specifications
- Repository is primarily for documentation, not executable mappings
- For implementation details, consult the actual code repositories listed above
