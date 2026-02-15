# Patient.generalPractitioner / managingOrganization → OMOP PERSON provider_id / care_site_id

## Source

- `Patient.generalPractitioner` — array of Reference(Practitioner | Organization | PractitionerRole). Primary care provider.
- `Patient.managingOrganization` — Reference(Organization). Organization managing the patient record.

## Target

OMOP PERSON:
- `provider_id` (integer) — FK → PROVIDER
- `care_site_id` (integer) — FK → CARE_SITE

## Mapping

| FHIR | OMOP | Notes |
|---|---|---|
| `generalPractitioner[0]` | `provider_id` | First from the array, Reference resolution → integer ID |
| `managingOrganization` | `care_site_id` | Reference resolution → integer ID |

## Reference resolution rules

FHIR Reference has the format `"ResourceType/id"` (e.g. `"Practitioner/123"`).

1. Extract ID from the reference string: `"Practitioner/123"` → `123`
2. If ID is a number, use directly as FK
3. If ID is not a number (UUID), a mapping table FHIR ID → OMOP integer ID is required
4. If reference is absent — NULL

## Decision on multiple generalPractitioner

FHIR allows an array of `generalPractitioner`. OMOP PERSON has a single `provider_id` field.

**Rule**: take `generalPractitioner[0]` — the first element in the array. The rest are lost.

## Decision on Reference type

`generalPractitioner` can reference Practitioner, Organization, or PractitionerRole. For `provider_id` we are only interested in Practitioner. If the reference points to Organization — it should be ignored for provider_id (closer to care_site).

At this stage: we map any generalPractitioner[0] to provider_id, without filtering by type.

## Missing values

| Situation | provider_id | care_site_id |
|---|---|---|
| generalPractitioner present | ID from reference | — |
| generalPractitioner absent | NULL | — |
| managingOrganization present | — | ID from reference |
| managingOrganization absent | — | NULL |

We do not use default values (like 1 or 0) — NULL correctly reflects the absence of data.

## Implementation consensus

| Project | generalPractitioner → provider_id | managingOrganization → care_site_id |
|---|---|---|
| omoponfhir-v54-r4 | yes | yes |
| omopfhirmap | yes | yes |
| mends-on-fhir | yes | — |
| GT-FHIR | yes | — |
| ETL-German-FHIR-Core | — | — |
| FhirToCdm | — | — |
| NACHC | — (defaults to 1) | — (defaults to 1) |

- **4/9** map generalPractitioner
- **2/9** map managingOrganization
- NACHC uses default 1 — we consider this incorrect
