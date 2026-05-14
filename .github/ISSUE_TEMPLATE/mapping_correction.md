---
name: Mapping correction
about: Report a wrong field map, concept_id, cardinality, or vocabulary binding
title: 'mapping: '
labels: mapping
---

## Edge

`<FHIRResourceType>__<omop_table>` (e.g. `Patient__person`)

File: `mapspec/edges/<this>.json`

## What's wrong

Specify the OMOP column and what's incorrect:

- OMOP column:
- Current value in edge JSON:
- Correct value:

## Source of correction

Cite at least one of:
- OHDSI / OMOP CDM v5.4 documentation
- Reference implementation that does it differently (link to file + lines under `refs/`)
- HL7 FHIR R4 spec
- Athena vocab (a specific `concept_id` / `vocabulary_id`)

## Impact

- [ ] Wrong `*_concept_id` (data quality)
- [ ] Wrong cardinality (validation gate)
- [ ] Missing `fhir_path` (data drop)
- [ ] Wrong vocabulary binding
- [ ] Other:

## Proposed change

Show the edit (a diff or before/after JSON snippet).
