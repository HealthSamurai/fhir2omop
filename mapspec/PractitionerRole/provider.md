# PractitionerRole → provider (enrichment)

OMOP CDM v5.4. PractitionerRole does not create a new `provider` row. It enriches the row created from the underlying `Practitioner` resource by populating specialty and care_site columns. For Practitioner-driven fields (name, NPI, gender, year_of_birth), see [`../Practitioner/provider.md`](../Practitioner/provider.md).

## Field Mapping (PractitionerRole-sourced)

| FHIR Path | OMOP Field | Type | Required | Notes |
|---|---|---|---|---|
| `PractitionerRole.specialty[0]` | `specialty_concept_id` | CodeableConcept → integer (FK CONCEPT) | No | SNOMED or NUCC specialty → OMOP concept. Represents the most common or most specific specialty. 0 if unmapped. fhir-to-omop-demo extracts from `PractitionerRole.specialty[0].coding[0]` (lines 10-23, 44). |
| `PractitionerRole.specialty[0]` text/code | `specialty_source_value` | string → varchar(50) | No | Raw specialty code as it appears in source data. Includes physician specialties (internal medicine, emergency medicine) and allied health professionals (nurses, midwives, pharmacists). fhir-to-omop-demo uses `specialty.concept_code` (line 49). |
| (none) | `specialty_source_concept_id` | integer (FK CONCEPT) | No | 0. Often zero as many sites use proprietary codes to store physician specialty. |
| `PractitionerRole.organization` | `care_site_id` | ref → integer (FK CARE_SITE) | No | Organization affiliation from PractitionerRole. This is the location that the provider primarily practices in. fhir-to-omop-demo uses `location_ids[0]` (line 45). omoponfhir creates a CareSite from the Practitioner's address if no PractitionerRole link exists (OmopPractitioner.java lines 358-375); see [`../Practitioner/provider.md`](../Practitioner/provider.md). |

FHIR fields with no OMOP target: `PractitionerRole.active`, `PractitionerRole.period` (used to pick the most recent role but not stored), `PractitionerRole.code` (role type), `PractitionerRole.location[]` (resolved via `organization` for care_site_id), `PractitionerRole.healthcareService`, `PractitionerRole.telecom`, `PractitionerRole.availableTime`, `PractitionerRole.notAvailable`, `PractitionerRole.endpoint`.

## Vocabulary Mappings

### Specialty (`PractitionerRole.specialty` → `specialty_concept_id`)

Specialty mapping depends on the source vocabulary. Common vocabularies:

| Source Vocabulary | System URI | OMOP Vocabulary | Notes |
|---|---|---|---|
| NUCC Provider Taxonomy | `http://nucc.org/provider-taxonomy` | NUCC | US healthcare provider taxonomy; ~800 codes. Most common for US data. |
| SNOMED CT | `http://snomed.info/sct` | SNOMED | International; specialty concepts in hierarchy under `394658006 Clinical specialty`. |
| HL7 v2 Provider Role | `http://terminology.hl7.org/CodeSystem/practitioner-role` | — | Coarse granularity (doctor, nurse, etc.); requires custom mapping. |

Example NUCC specialty mappings:

| NUCC Code | Display | OMOP concept_id | OMOP concept_name |
|---|---|---|---|
| `207Q00000X` | Family Medicine | 38004459 | Family Medicine |
| `207R00000X` | Internal Medicine | 38004456 | Internal Medicine |
| `207V00000X` | Obstetrics & Gynecology | 38004461 | Obstetrics/Gynecology |
| `208D00000X` | General Practice | 38004446 | General Practice |
| `208600000X` | Surgery | 38004447 | Surgery |
| (unmapped) | — | 0 | No matching concept |

fhir-to-omop-demo comments reference concept 38004459 as an example for "General Practice" (Practitioner.jq line 28).

## Practitioner vs PractitionerRole

| Aspect | Practitioner | PractitionerRole |
|---|---|---|
| Identity (name, NPI) | Yes | No (references Practitioner) |
| Specialty | No | Yes (`specialty[]`) |
| Organization | No | Yes (`organization`) |
| Location | Via `address[]` | Via `location[]` |
| Period of practice | No | Yes (`period`) |
| OMOP provider row | One per Practitioner | Enriches the Practitioner's provider row |

Strategy: Create one `provider` row per Practitioner. If PractitionerRole exists, use it to populate `specialty_concept_id` and `care_site_id`. If multiple PractitionerRoles exist for one Practitioner, use the first or most recent.

## Reference Resolution

### PractitionerRole → Practitioner + Provider enrichment

PractitionerRole links a Practitioner to an Organization with role/specialty context. Resolution strategy:

1. **Extract Practitioner reference**: `PractitionerRole.practitioner.reference` → resolve to find/create the provider row.
2. **Extract specialty**: `PractitionerRole.specialty[0].coding[0]` → look up OMOP concept via NUCC or SNOMED vocabulary tables. Store code in `specialty_source_value`, mapped concept in `specialty_concept_id`.
3. **Extract organization**: `PractitionerRole.organization.reference` → resolve to `care_site_id` via the Organization/care_site mapper.
4. **Multiple PractitionerRoles per Practitioner**: OMOP `provider` has a single `specialty_concept_id` and `care_site_id`. If multiple roles exist:
   - Use the most recent (by `PractitionerRole.period.end`) or the most specific specialty.
   - fhir-to-omop-demo emits separate rows for Practitioner and PractitionerRole, then merges them (PractitionerRole.jq lines 31-53).
   - omoponfhir does not handle PractitionerRole separately — it processes only the Practitioner resource.

## Edge Cases

| Case | Handling |
|---|---|
| Multiple PractitionerRoles | Single `provider` row. Use first/most-recent role for specialty and care_site. Log if multiple roles found. fhir-to-omop-demo warns via `debug()` (PractitionerRole.jq line 12). |
| PractitionerRole without Practitioner reference | Cannot create or enrich provider row (no identity). Log and skip. |
| Specialty system not recognized (not NUCC, not SNOMED) | `specialty_concept_id` = 0, `specialty_source_value` = raw code. |
| `PractitionerRole.organization` references an Organization not in bundle | Deferred resolution. Stub care_site_id; resolve when Organization arrives. |

## Sources

- fhir-to-omop-demo jq (PractitionerRole): `refs/refs/fhir-to-omop-demo/demo/translate/map/PractitionerRole.jq`
  - Specialty extraction with multi-coding warning: lines 10-23
  - Merge-based approach (PractitionerRole enriches provider row): lines 31-53
  - care_site_id from location_ids[0]: line 45
  - specialty.concept_code → specialty_source_value: line 49
- fhir-to-omop-demo jq (Practitioner) example concept (Family/General Practice 38004459): `refs/refs/fhir-to-omop-demo/demo/translate/map/Practitioner.jq` line 28
- omoponfhir-v54 Java (Practitioner-only, does not process PractitionerRole): `refs/refs/omoponfhir-v54-r4/omoponfhir-omopv5-r4-mapping/src/main/java/edu/gatech/chai/omoponfhir/omopv5/r4/mapping/OmopPractitioner.java`
- OMOP CDM v5.4 provider spec: `CommonDataModel/inst/csv/OMOP_CDMv5.4_Field_Level.csv`
- FHIR R4 PractitionerRole: https://hl7.org/fhir/R4/practitionerrole.html
