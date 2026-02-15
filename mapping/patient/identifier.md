# Patient.id / Patient.identifier → OMOP PERSON person_source_value

## Source

- `Patient.id` — logical resource identifier
- `Patient.identifier` — array of business identifiers (SSN, MRN, etc.), each with `system` and `value`

## Target

OMOP PERSON:
- `person_source_value` (varchar(50)) — original patient identifier

## Decision: identifier selection strategy

Record format: `"{system}|{value}"` — we preserve the system for uniqueness when integrating data from multiple sources.

**Selection priority:**

1. `identifier` with `system = "http://hl7.org/fhir/sid/us-ssn"` (SSN)
2. `identifier` with `type.coding.code = "MR"` (MRN — Medical Record Number)
3. `identifier[0]` (first in the array)
4. `Patient.id` (fallback, without system — just the id)

## Examples

| FHIR | person_source_value |
|---|---|
| identifier: system=`http://hospital.org/mrn`, value=`12345` | `http://hospital.org/mrn\|12345` |
| identifier: system=`http://hl7.org/fhir/sid/us-ssn`, value=`999-99-9999` | `http://hl7.org/fhir/sid/us-ssn\|999-99-9999` |
| only Patient.id = `abc-123` | `abc-123` |

## Additional fields

- `person_source_concept_id` — 0 (no standard concept for identifier type)

## Limitations

- `person_source_value` — varchar(50). Long system URIs + value may exceed the limit. In this case, the system is truncated to a minimally distinguishable part.

## Implementation consensus

- **9/9**: store identifier in person_source_value
- **omoponfhir**: format `system^value` — we use a similar approach with `system|value`
- **Others**: just Patient.id without system
