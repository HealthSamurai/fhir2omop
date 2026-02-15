# Observation — Unmapped Elements

FHIR Observation elements with no direct mapping to OMOP MEASUREMENT / OBSERVATION.

| FHIR Element | Reason | Potential Approach |
|---|---|---|
| `bodySite` | No column in measurement/observation | Map to anatomic_site_concept_id (measurement) |
| `method` | No column | Map to measurement_event_id or note |
| `specimen` | Not implemented | Map to OMOP SPECIMEN table |
| `device` | No direct equivalent | Map to DEVICE_EXPOSURE |
| `effectivePeriod` | Only effectiveDateTime is supported | Use period.start as date |
| `effectiveTiming` | Complex structure | Not applicable |
| `effectiveInstant` | Not implemented | Map as effectiveDateTime |
| `issued` | No direct equivalent | Time the result was issued |
| `dataAbsentReason` | No direct equivalent | Map to value_source_value |
| `interpretation` | qualifier_source_value is populated | qualifier_concept_id — placeholder (null) |
| `note` | No column | Map to note_nlp |
| `hasMember` | Observation grouping | No direct equivalent |
| `derivedFrom` | Computed results | No direct equivalent |
| `identifier` | No standard field | Could store in source_value |
| `focus` | No direct equivalent | Specific to genetic tests |
| `value[x]` as Boolean/Range/Ratio/etc | Not implemented | See mapping/observation/value.md |
