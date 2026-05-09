# Specimen -> OMOP Mapping

FHIR `Specimen` maps to the OMOP CDM `specimen` table. This is a relatively straightforward 1:1 mapping -- one FHIR Specimen resource produces exactly one `specimen` row. The OMOP `specimen` table captures biological samples collected from a person, including the specimen type, collection date, quantity, anatomic site, and disease status at the time of collection.

Specimen is a supporting resource: it is most commonly referenced from `Observation` or `Measurement` resources via the `Observation.specimen` reference. In OMOP, this relationship is tracked via the `fact_relationship` table (domain_concept_id = 36 for Specimen, 21 for Measurement) rather than a direct FK on the `measurement` table. The `measurement` table does have a `measurement_source_value` that can encode a specimen reference, but there is no `specimen_id` FK on `measurement` in CDM v5.4.

## Target OMOP Tables

| OMOP Table | Purpose | Required? |
|---|---|---|
| `specimen` | One row per biological sample (15 fields) | Yes |
| `fact_relationship` | Links specimen to measurement/observation rows | Optional -- only when Specimen is referenced from Observation |

## Mapping Strategy

The Specimen mapping is among the simplest in the FHIR-to-OMOP pipeline. The key issues are:

1. **Specimen type vs. specimen concept terminology confusion.** OMOP has two concept fields with confusingly similar names: `specimen_concept_id` (the *kind* of specimen, e.g., "Blood" = SNOMED) and `specimen_type_concept_id` (the *provenance* of the record, e.g., "EHR" = 32817). FHIR `Specimen.type` maps to `specimen_concept_id`. The `specimen_type_concept_id` is a metadata field with no direct FHIR source -- it should be set to a constant like 32817 (EHR) or 32882 (EHR encounter record). omoponfhir-v54 sets it to 0 (unmapped).

2. **Collection date is required in OMOP but optional in FHIR.** `specimen_date` is NOT NULL in OMOP CDM. FHIR `Specimen.collection.collected[x]` is optional (0..1) and polymorphic (dateTime or Period). When `collected[x]` is a Period, use `Period.start`. When absent entirely, the mapper must either reject the resource or derive a date from context (e.g., `Specimen.receivedTime`). omoponfhir throws an exception if collection is missing.

3. **Vocabulary mapping for Specimen.type.** FHIR recommends HL7 v2 Table 0487 for `Specimen.type`, but the example binding is extensible and real-world data uses SNOMED CT specimen hierarchy (descendant of 123038009 "Specimen"). OMOP `specimen_concept_id` expects a concept from the Specimen domain in the OMOP vocabulary. SNOMED specimen codes are well-represented in Athena. When the source code is not SNOMED, look up via vocabulary tables; fall back to `specimen_concept_id = 0` and populate `specimen_source_value`.

4. **Subject must be a Patient.** FHIR `Specimen.subject` can reference Patient, Group, Device, Substance, or Location. OMOP `person_id` only supports human patients. Non-Patient subjects must be rejected. omoponfhir validates this and throws if subject is not Patient.

5. **Unit concept resolution.** `Specimen.collection.quantity` carries a UCUM-coded unit. OMOP `unit_concept_id` requires lookup in the CONCEPT table (vocabulary_id = 'UCUM'). Fall back to 0 and populate `unit_source_value` with the raw unit string.

6. **Disease status mapping gap.** OMOP `disease_status_concept_id` semantically maps to `Specimen.condition` (CodeableConcept[] describing the state of the specimen, e.g., "hemolyzed"). However, `Specimen.condition` describes specimen quality, not the patient's disease status at collection time. This is a known semantic mismatch. Most implementations leave `disease_status_concept_id` as 0.

7. **Specimen ID generation.** Same pattern as all OMOP tables: FHIR uses string IDs, OMOP requires integer `specimen_id`. Use sequence/hash/lookup. Store the FHIR Specimen.id (or first `Specimen.identifier`) in `specimen_source_id` for traceability.

## Per-Table Docs

- [specimen](./specimen.md) -- Specimen -> specimen field mapping

## Reference Implementations

- **fhir-omop-ig** (HL7) -- Logical model only; `refs/refs/fhir-omop-ig/input/fsh/Specimen.fsh`. No FML transform map exists for Specimen (unlike Patient, Condition, etc.). The FSH defines the OMOP specimen table structure as a FHIR Logical Model. Status: draft.
- **omoponfhir-v54-r4** (Georgia Tech, Java) -- Bidirectional mapper; `refs/refs/omoponfhir-v54-r4/omoponfhir-omopv5-r4-mapping/src/main/java/edu/gatech/chai/omoponfhir/omopv5/r4/mapping/OmopSpecimen.java` (531 lines). Most complete Specimen implementation found. Maps type (SNOMED preferred), subject, collection date/datetime, quantity with unit concept lookup, bodySite, and identifier. Sets `specimen_type_concept_id = 0`. Validates that subject is Patient and collection dateTime is present. Status: maintained.
- **omoponfhir-omopv5-r4-mapping** (Georgia Tech, Java, older) -- `refs/refs/omoponfhir-omopv5-r4-mapping/src/main/java/edu/gatech/chai/omoponfhir/omopv5/r4/mapping/OmopSpecimen.java` (531 lines). Identical logic to v54 variant. Status: stale.
- **tofhir-mappings** (AICCELERATE, JSON template) -- `refs/refs/tofhir-mappings/mappings/omop/specimen-mapping.json`. OMOP-to-FHIR direction. Maps specimen_id, person_id (hashed reference), concept_code/vocabulary_id to Specimen.type, specimen_date to collectedDateTime, quantity + unit, and body site. Status: maintained.
- **NACHC-fhir-to-omop** (Java) -- Only has a DVO (Data Value Object) for the specimen table: `refs/refs/NACHC-fhir-to-omop/src/main/java/org/nachc/tools/omop/yaorma/dvo/SpecimenDvo.java`. No actual Specimen FHIR mapper -- the project focuses on Patient, Encounter, Condition, Observation. Status: active (no Specimen mapper).
- **ETL-German-FHIR-Core** -- No dedicated Specimen mapper found. German MII profiles do not include Specimen in the core ETL.
- **FhirToCdm** (OHDSI, C#) -- No Specimen mapping found. The project maps Patient, Encounter, Condition, Observation, MedicationRequest.
- **mends-on-fhir** (Whistle) -- References `specimen_id` in Measurement mapping but no dedicated Specimen mapper.
- **fhir2omop-cookbook** (CodeX) -- No Specimen-specific content.

Most reference implementations do not map Specimen directly. In typical EHR data flows, specimen information is embedded within lab result Observations rather than transmitted as a standalone Specimen resource. omoponfhir-v54 is the primary (and nearly the only) complete bidirectional implementation.
