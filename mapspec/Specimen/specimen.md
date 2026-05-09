# Specimen -> specimen

OMOP CDM v5.4. The `specimen` table stores one row per biological sample collected from a person. One FHIR `Specimen` resource maps to exactly one `specimen` row.

## Field Mapping

| FHIR Path | OMOP Field | Type | Required | Notes |
|---|---|---|---|---|
| (generated) | `specimen_id` | integer | Yes (PK) | Surrogate key. Hash/sequence/lookup of `Specimen.id`. Store FHIR ID or first identifier in `specimen_source_id` for traceability. |
| `Specimen.subject` | `person_id` | Reference -> integer (FK PERSON) | Yes | Resolve Patient reference to integer `person_id`. Subject must be a Patient -- reject Device, Group, Location, Substance subjects. See Reference Resolution below. |
| `Specimen.type` | `specimen_concept_id` | CodeableConcept -> integer (FK CONCEPT) | Yes | Map to OMOP concept in Specimen domain. Prefer SNOMED coding if multiple codings present. Fall back to 0 if no mapping found. See Vocabulary Mappings below. |
| (constant) | `specimen_type_concept_id` | integer (FK CONCEPT) | Yes | Provenance of the specimen record, not the kind of specimen. Set to `32817` (EHR) for EHR-sourced data, `32882` (EHR encounter record) if encounter-linked, or `32883` (EHR billing record) as appropriate. omoponfhir sets 0. |
| `Specimen.collection.collected[x]` | `specimen_date` | dateTime -> date | Yes | Date component of collection time. If `collected[x]` is a Period, use `Period.start`. If absent, try `Specimen.receivedTime` as fallback. OMOP requires this field (NOT NULL). |
| `Specimen.collection.collected[x]` | `specimen_datetime` | dateTime -> datetime | No | Full datetime of collection. Same source as `specimen_date` but preserves time component. If `collected[x]` is date-only, append `T00:00:00`. |
| `Specimen.collection.quantity.value` | `quantity` | Quantity.value -> float | No | Amount of specimen collected. Direct numeric copy from `collection.quantity.value`. |
| `Specimen.collection.quantity` | `unit_concept_id` | Quantity -> integer (FK CONCEPT) | No | Look up UCUM code (`quantity.code` with `quantity.system = http://unitsofmeasure.org`) in CONCEPT table (vocabulary_id = 'UCUM'). Default 0 if lookup fails. |
| `Specimen.collection.bodySite` | `anatomic_site_concept_id` | CodeableConcept -> integer (FK CONCEPT) | No | SNOMED body site code mapped to OMOP concept. Use first coding from bodySite.coding[]. Default 0 if unmapped. |
| `Specimen.condition` | `disease_status_concept_id` | CodeableConcept -> integer (FK CONCEPT) | No | Semantic mismatch: FHIR `condition` describes specimen quality (hemolyzed, lipemic), not patient disease status. Most implementations set 0. See Edge Cases. |
| `Specimen.identifier[0].value` | `specimen_source_id` | Identifier -> varchar(50) | No | Source system identifier for the specimen. omoponfhir uses first identifier value. Can also use `Specimen.accessionIdentifier.value`. |
| `Specimen.type.text` or `Specimen.type.coding[0]` | `specimen_source_value` | CodeableConcept -> varchar(50) | No | Verbatim source code/text for the specimen type. Populated when `specimen_concept_id` is 0 (unmapped). Use `type.text` if available, otherwise `system|code` or display of first coding, truncated to 50 chars. |
| `Specimen.collection.quantity.unit` or `.code` | `unit_source_value` | string -> varchar(50) | No | Raw unit string. Prefer `quantity.unit` (human-readable); fall back to `quantity.code` (UCUM code). |
| `Specimen.collection.bodySite.text` or `.coding[0].display` | `anatomic_site_source_value` | string -> varchar(50) | No | Source text for anatomic site. Prefer `bodySite.text`, then `coding[0].display`, then `coding[0].code`. |
| `Specimen.condition.text` or `.coding[0].display` | `disease_status_source_value` | string -> varchar(50) | No | Source text for disease/condition status. Same extraction pattern as anatomic_site_source_value. |

### Fields with no FHIR source

All OMOP `specimen` fields are covered above. Every field either has a direct FHIR source or is set to a constant/default (0 for unmapped concept IDs, generated for PK).

### FHIR fields with no OMOP target (lost in mapping)

`Specimen.status`, `Specimen.accessionIdentifier` (unless used for `specimen_source_id`), `Specimen.receivedTime`, `Specimen.parent` (parent specimen hierarchy), `Specimen.request` (ServiceRequest references), `Specimen.collection.collector` (Practitioner who collected), `Specimen.collection.duration`, `Specimen.collection.method`, `Specimen.collection.fastingStatus[x]`, `Specimen.processing` (all processing steps), `Specimen.container` (tube/slide details), `Specimen.note`.

## Vocabulary Mappings

### Specimen Type (`Specimen.type` -> `specimen_concept_id`)

FHIR `Specimen.type` uses an extensible binding to HL7 v2 Table 0487 (Specimen Type). In practice, most real-world data uses SNOMED CT specimen codes (descendants of 123038009 "Specimen"). OMOP expects concepts from the Specimen domain.

Common SNOMED specimen type mappings:

| SNOMED Code | Display | OMOP concept_id | OMOP concept_name |
|---|---|---|---|
| `119297000` | Blood specimen | 4045667 | Blood specimen |
| `119361006` | Plasma specimen | 4046275 | Plasma specimen |
| `119364003` | Serum specimen | 4045666 | Serum specimen |
| `122555007` | Venous blood specimen | 4046280 | Venous blood specimen |
| `258580003` | Whole blood sample | 4264829 | Whole blood |
| `119339001` | Stool specimen | 4002890 | Stool specimen |
| `122575003` | Urine specimen | 4045668 | Urine specimen |
| `258529004` | Throat swab | 4218410 | Throat swab |
| `309051001` | Body fluid sample | 4046274 | Body fluid sample |
| `119376003` | Tissue specimen | 4002893 | Tissue specimen |
| `258566005` | Deoxyribonucleic acid sample | 4046281 | Deoxyribonucleic acid sample |
| `119342007` | Saliva specimen | 4045669 | Saliva specimen |
| `258587000` | Buffy coat | 4215183 | Buffy coat |
| `119359002` | Bone marrow specimen | 4000626 | Bone marrow specimen |
| (unmapped) | -- | 0 | No matching concept |

Note: OMOP concept_ids shown above are representative. Actual IDs should be verified against the Athena vocabulary for your OMOP deployment. Use `SELECT * FROM concept WHERE vocabulary_id = 'SNOMED' AND domain_id = 'Specimen' AND concept_code = '<code>'` to look up.

When `Specimen.type` uses a non-SNOMED system, attempt vocabulary lookup via the OMOP vocabulary tables. If lookup fails, set `specimen_concept_id = 0` and populate `specimen_source_value`.

### Specimen Type Concept (`specimen_type_concept_id`)

This field records the *provenance* of the specimen record (how it was captured), not the kind of specimen. Standard values:

| Use case | OMOP concept_id | concept_name |
|---|---|---|
| EHR-sourced data | 32817 | EHR |
| EHR encounter record | 32882 | EHR encounter record |
| Claims data | 32810 | Claim |
| Lab result | 32856 | Lab |
| Survey/PRO | 32865 | Patient self-report |

omoponfhir hardcodes this to 0 (line 387: `specimen_.setSpecimenTypeConcept(new Concept(0L))`). For ETL projects, 32817 is the recommended default.

### Unit Concept (`collection.quantity` -> `unit_concept_id`)

FHIR quantities use UCUM (`http://unitsofmeasure.org`). Look up `quantity.code` in the CONCEPT table with `vocabulary_id = 'UCUM'`.

| UCUM code | Display | OMOP concept_id |
|---|---|---|
| `mL` | milliliter | 8587 |
| `uL` | microliter | 8585 |
| `g` | gram | 8504 |
| `mg` | milligram | 8576 |
| `{cells}` | cells | 45891014 |
| (unmapped) | -- | 0 |

### Anatomic Site (`collection.bodySite` -> `anatomic_site_concept_id`)

FHIR uses SNOMED CT body structure codes (descendants of 123037004 "Body structure"). OMOP `anatomic_site_concept_id` expects a concept from the Spec Anatomic Site domain. Example mappings:

| SNOMED Code | Display | OMOP concept_id |
|---|---|---|
| `14016003` | Structure of median cubital vein | 4138766 |
| `66480008` | Structure of left forearm | 4263504 |
| `49852007` | Structure of median basilic vein | 4139757 |
| `368208006` | Left upper arm structure | 4136361 |
| (unmapped) | -- | 0 |

### Disease Status (`Specimen.condition` -> `disease_status_concept_id`)

FHIR `Specimen.condition` describes the state of the specimen itself (quality/handling). The HL7 v2 binding (Table 0493) includes:

| Code | Display | Notes |
|---|---|---|
| `AUT` | Autolyzed | Specimen has been autolyzed |
| `CLOT` | Clotted | Blood specimen clotted |
| `HEM` | Hemolyzed | Specimen is hemolyzed |
| `COOL` | Cool | Temperature issue |
| `ROOM` | Room temperature | Room temperature |
| `SNR` | Sample not received | Missing specimen |
| `CFU` | Centrifuged | |

These describe specimen quality, not patient disease status. The OMOP field name `disease_status_concept_id` is misleading. Most implementations leave this as 0. If populated, map to appropriate SNOMED or OMOP concept via vocabulary lookup.

## Reference Resolution

### `subject` -> `person_id`

`Specimen.subject` is a Reference(Patient | Group | Device | Substance | Location). For OMOP mapping:

1. Validate that `subject.reference` points to a Patient resource. Reject if it references Group, Device, Substance, or Location -- OMOP `person_id` only supports human patients.
2. Extract the Patient ID from the reference (`Patient/<id>` or full URL).
3. Resolve to integer `person_id` via the same ID mapping function used by the Patient mapper (sequence, hash, or pre-built lookup table).
4. If the Patient has not been processed yet, either defer the Specimen or ensure Patient processing runs first.

omoponfhir validates subject type (lines 393-408 in OmopSpecimen.java):
```java
if (!subjectReference.getReferenceElement().getResourceType()
        .equalsIgnoreCase(OmopPatient.FHIRTYPE)) {
    throw new FHIRException("We only support Patient for subject.");
}
```

### `Observation.specimen` -> `fact_relationship` (reverse reference)

When a FHIR `Observation` references a `Specimen` via `Observation.specimen`, this relationship is captured in the OMOP `fact_relationship` table:
- `domain_concept_id_1` = 21 (Measurement domain) or 27 (Observation domain)
- `fact_id_1` = measurement_id / observation_id
- `domain_concept_id_2` = 36 (Specimen domain)
- `fact_id_2` = specimen_id
- `relationship_concept_id` = 44818757 ("Has specimen") or similar

This is not part of the Specimen mapper itself but is relevant to the Observation/Measurement mapper.

## Edge Cases

| Case | Handling |
|---|---|
| Missing `collection.collected[x]` | OMOP `specimen_date` is NOT NULL. omoponfhir throws FHIRException. Options: (a) reject the resource and log warning, (b) fall back to `Specimen.receivedTime`, (c) use current date (not recommended). tofhir-mappings silently drops the date, which would cause an INSERT failure. |
| `collected[x]` is a Period | OMOP only supports a single date/datetime, not a range. Use `Period.start` as the collection date. `Period.end` is lost. omoponfhir throws if collected is not a DateTimeType. |
| `subject` references non-Patient | Reject the resource. OMOP `person_id` requires a patient. Log warning with the unsupported resource type. |
| `subject` reference unresolvable | Patient not yet in OMOP database. Either: (a) process Patients first (dependency ordering), (b) defer Specimen to a retry queue, (c) reject. omoponfhir throws FHIRException if patient lookup returns null. |
| Missing `Specimen.type` | `specimen_concept_id` should technically be NOT NULL but has no explicit NOT NULL constraint in some DDLs. Set to 0 and leave `specimen_source_value` empty. omoponfhir treats type as required via the coding iteration logic -- null type will cause NPE. |
| Multiple codings in `Specimen.type` | Prefer SNOMED CT coding (`http://snomed.info/sct`). If no SNOMED, try any coding that maps to a known OMOP vocabulary. If none map, use concept_id 0. omoponfhir prioritizes SNOMED (lines 273-292 in OmopSpecimen.java). |
| `Specimen.type` uses HL7 v2 Table 0487 | These codes (BLD, UR, TISS, etc.) are in the `v2 Specimen Type` vocabulary in OMOP. Look up via `vocabulary_id = 'v2 Specimen Type'`. If not found, set 0 and preserve in source_value. |
| `Specimen.parent` (aliquot/derived specimen) | No OMOP field for parent-child specimen relationships. Lost in mapping. Could potentially be captured in `fact_relationship` with a custom relationship concept. |
| `Specimen.status` = `entered-in-error` | OMOP has no status field on `specimen`. Options: (a) skip the resource entirely (recommended), (b) insert anyway (bad data quality). |
| Quantity without unit | Set `unit_concept_id = 0`, `unit_source_value = null`. The quantity value is still stored. |
| `disease_status_concept_id` semantic mismatch | FHIR `Specimen.condition` describes specimen quality (hemolyzed, clotted), not patient disease status. Most implementations set 0. If a clinical use case requires mapping specimen condition, use vocabulary lookup for the appropriate SNOMED or v2 codes. |
| Duplicate specimens | omoponfhir deduplicates on (patient, specimen_concept, collection_date) tuple in `toDbase()` (lines 421-462). If a matching specimen exists, it updates rather than creating a duplicate. Other implementations do not deduplicate. |
| `specimen_source_id` truncation | OMOP field is varchar(50). FHIR identifiers (especially UUIDs in `urn:uuid:` format) can exceed 50 characters. Truncate or hash if necessary. |

## Implementation Comparison

| Aspect | HL7 IG (FSH) | omoponfhir-v54 | tofhir-mappings |
|---|---|---|---|
| Direction | Model only | F<->O (bidirectional) | O->F |
| Language | FHIR Shorthand | Java (HAPI FHIR) | JSON template |
| `specimen_id` strategy | -- (model only) | sequence (`specimen_id_seq`) | hashed ID |
| `specimen_concept_id` source | `Specimen.type` (model) | `Specimen.type`, SNOMED preferred | `concept_code` + `vocabulary_id` from OMOP |
| `specimen_type_concept_id` | defined in model | hardcoded 0 | not mapped (O->F direction) |
| `specimen_date` source | model field | `collection.collectedDateTime` (required, throws if absent) | `specimen_date` from OMOP |
| `collected[x]` Period support | -- | no (throws if not DateTime) | -- (O->F direction) |
| Quantity mapping | model field | yes (value + unit concept lookup via UCUM) | yes (value + unit code) |
| `unit_concept_id` lookup | -- | UCUM vocabulary lookup via ConceptService | direct from OMOP |
| `anatomic_site_concept_id` | model field | yes (SNOMED body site lookup) | yes (body site code + vocab) |
| `disease_status_concept_id` | model field | not mapped (left null/0) | not mapped |
| `specimen_source_id` | model field | first `Specimen.identifier` value | `specimen_id` as string |
| `specimen_source_value` | model field | `type.text` or coding string (when concept_id = 0) | not mapped |
| Identifier handling | -- | first identifier -> `specimen_source_id` | OMOP `specimen_id` hashed |
| Subject validation | -- | validates Patient type, throws on non-Patient | creates Patient reference from person_id |
| Deduplication | -- | yes (patient + concept + date tuple) | -- |
| Status filtering | -- | not filtered (all statuses accepted) | -- |
| Error handling | -- | FHIRException on: missing subject, non-Patient subject, missing collection, non-dateTime collected | -- |

Note: Most other reference implementations (ETL-German, FhirToCdm, NACHC, mends-on-fhir, fhir2omop-cookbook) do not include a Specimen mapper. The specimen table is often populated as part of lab data ETL pipelines outside the FHIR mapping layer, or specimen information is embedded directly in Observation resources.

## Sources

- HL7 IG logical model (FSH, Specimen domain): `refs/refs/fhir-omop-ig/input/fsh/Specimen.fsh`
  - Full table model: lines 1-22
- HL7 IG FactRelationship model (specimen-measurement link): `refs/refs/fhir-omop-ig/input/fsh/FactRelationship.fsh`
  - Domain/relationship fields: lines 1-12
- omoponfhir-v54 OmopSpecimen.java (bidirectional, 531 lines): `refs/refs/omoponfhir-v54-r4/omoponfhir-omopv5-r4-mapping/src/main/java/edu/gatech/chai/omoponfhir/omopv5/r4/mapping/OmopSpecimen.java`
  - FHIR->OMOP mapping (`constructOmop`): lines 234-390
  - OMOP->FHIR mapping (`constructFHIR`): lines 89-192
  - Type coding priority (SNOMED first): lines 264-293
  - Concept lookup for type: lines 296-312
  - Subject validation: lines 392-408
  - Collection dateTime extraction: lines 330-342
  - Quantity + unit concept lookup: lines 344-364
  - Body site mapping: lines 367-384
  - specimen_type_concept_id hardcoded to 0: line 387
  - Deduplication logic: lines 421-462
  - specimen_source_value from type text/coding: lines 316-318
  - Identifier -> specimen_source_id: lines 247-252
  - Unit source value (quantity.unit or .code): lines 359-363
  - Anatomic site source value (text/display/code): lines 374-383
- omoponfhir-v54 Specimen entity (JPA model): `refs/refs/omoponfhir-v54-r4/omoponfhir-omopv5-sql/src/main/java/edu/gatech/chai/omopv5/model/entity/Specimen.java`
  - Column annotations: lines 32-77
  - FK references (person, concept): lines 37-62
- omoponfhir-v54 SpecimenResourceProvider (FHIR server): `refs/refs/omoponfhir-v54-r4/omoponfhir-r4-server/src/main/java/edu/gatech/chai/omoponfhir/r4/provider/SpecimenResourceProvider.java`
  - Validation (subject Patient, collection required, dateTime required): lines 269-285
  - Search parameters (collected, patient/subject): lines 160-218
- tofhir-mappings specimen template (O->F): `refs/refs/tofhir-mappings/mappings/omop/specimen-mapping.json`
  - Subject reference from person_id: line 33
  - Type from concept_code/vocabulary_id: lines 36-43
  - Collection date/quantity/bodySite: lines 44-61
- NACHC SpecimenDvo (DVO only, no mapper): `refs/refs/NACHC-fhir-to-omop/src/main/java/org/nachc/tools/omop/yaorma/dvo/SpecimenDvo.java`
  - Column definitions: lines 32-48
- OMOP CDM v5.4 specimen field spec: `CommonDataModel/inst/csv/OMOP_CDMv5.4_Field_Level.csv`
- FHIR R4 Specimen StructureDefinition: `http://hl7.org/fhir/R4/specimen.html`
