# Immunization → drug_exposure

OMOP CDM v5.4. Immunizations are stored in `drug_exposure` with CVX-vocabulary concept IDs. One FHIR Immunization maps to one `drug_exposure` row. There is no dedicated immunization table in OMOP; immunization records are distinguished from other drug exposures by `drug_concept_id` belonging to the CVX vocabulary domain.

## Field Mapping

| FHIR Path | OMOP Field | Type | Required | Notes |
|---|---|---|---|---|
| (generated) | `drug_exposure_id` | integer | Yes (PK) | Surrogate key. Hash/sequence/lookup of `Immunization.id`. HL7 IG FML comments this out as a TODO (line 12). |
| `Immunization.patient` | `person_id` | ref → integer (FK PERSON) | Yes | Resolve Patient reference to integer. See Reference Resolution below. |
| `Immunization.vaccineCode` | `drug_concept_id` | CodeableConcept → integer (FK CONCEPT) | Yes | Map vaccine code (CVX/SNOMED/ATC) to OMOP standard concept. See Vocabulary Mappings below. |
| `Immunization.occurrenceDateTime` | `drug_exposure_start_date` | dateTime → date | Yes | Vaccination date (date portion). |
| `Immunization.occurrenceDateTime` | `drug_exposure_start_datetime` | dateTime | No | Full ISO datetime if available. |
| `Immunization.occurrenceDateTime` | `drug_exposure_end_date` | dateTime → date | Yes | Same as start date (single point-in-time event). |
| `Immunization.occurrenceDateTime` | `drug_exposure_end_datetime` | dateTime | No | Same as start datetime. |
| (none) | `verbatim_end_date` | date | No | null — immunizations have no separate verbatim end date. |
| (constant) | `drug_type_concept_id` | integer (FK CONCEPT) | Yes | See Vocabulary Mappings — Type Concepts below. Implementations diverge: 38000179 (omoponfhir), 32817 (ETL-German, FhirToCdm). |
| `Immunization.statusReason.text` | `stop_reason` | varchar(20) | No | Only when `status = not-done`. omoponfhir writes `statusReason.text` or coded `system:code`. Most skip. |
| (none) | `refills` | integer | No | null — not applicable to immunizations. |
| `Immunization.doseQuantity.value` | `quantity` | decimal → float | No | Dose amount (e.g., 0.5 for 0.5 mL). |
| (none) | `days_supply` | integer | No | null — single event, no supply duration. |
| `Immunization.note[*].text` | `sig` | varchar(MAX) | No | omoponfhir concatenates `note[].text` into `sig` (lines 622-629). Most implementations leave null. |
| `Immunization.route` | `route_concept_id` | CodeableConcept → integer (FK CONCEPT) | No | See Vocabulary Mappings — Route Concepts below. |
| `Immunization.route.coding[0].code` | `route_source_value` | code → varchar(50) | No | Raw route code or `system:code:display` (omoponfhir format, line 612). HL7 IG FML uses `route.text` as fallback (line 31). |
| `Immunization.lotNumber` | `lot_number` | string → varchar(50) | No | Vaccine lot tracking. One of the few FHIR resources that maps to `lot_number`. |
| `Immunization.performer[0].actor` | `provider_id` | ref → integer (FK PROVIDER) | No | Administering practitioner. See Reference Resolution below. |
| `Immunization.encounter` | `visit_occurrence_id` | ref → integer (FK VISIT_OCCURRENCE) | No | Resolve Encounter reference. See Reference Resolution below. |
| (none) | `visit_detail_id` | integer (FK VISIT_DETAIL) | No | null — no standard mapping from Immunization. |
| `Immunization.vaccineCode.coding[best].code` | `drug_source_value` | code → varchar(50) | No | Original vaccine code string. omoponfhir uses `system:code` format (line 543-544). ETL-German uses just the code. |
| `Immunization.vaccineCode` | `drug_source_concept_id` | integer (FK CONCEPT) | No | Non-standard source concept ID from the vocabulary lookup. ETL-German resolves via `findOmopConcepts` (line 552). Default 0. |
| `Immunization.doseQuantity.unit` or `.code` | `dose_unit_source_value` | string → varchar(50) | No | Dose unit (e.g., "mL", "dose"). HL7 IG FML uses `doseQuantity.code` (line 27). ETL-German uses `dose.getUnit()` (line 562). |

### FHIR Fields With No OMOP Target

These FHIR Immunization fields have no standard mapping to `drug_exposure`:

`Immunization.status` (used for filtering only), `Immunization.statusReason` (partially to `stop_reason`), `Immunization.vaccineCode.text` / `.display`, `Immunization.reportOrigin`, `Immunization.site`, `Immunization.manufacturer`, `Immunization.expirationDate`, `Immunization.protocolApplied`, `Immunization.reaction`, `Immunization.education`, `Immunization.isSubpotent`, `Immunization.subpotentReason`, `Immunization.fundingSource`, `Immunization.programEligibility`, `Immunization.primarySource` (used for type concept selection).

## Vocabulary Mappings

### Vaccine Code (`Immunization.vaccineCode` → `drug_concept_id`)

FHIR Immunization records use vaccine codes from one or more systems. The primary US standard is CVX. The mapping to `drug_concept_id` depends on the source vocabulary:

| Source Vocabulary | FHIR System URI | OMOP Vocabulary ID | Mapping Strategy |
|---|---|---|---|
| CVX | `http://hl7.org/fhir/sid/cvx` | CVX | Direct lookup in OMOP `concept` table where `vocabulary_id = 'CVX'`. CVX concepts may also have `concept_relationship` mappings to RxNorm via "Maps to" relationships. |
| SNOMED CT | `http://snomed.info/sct` | SNOMED | Lookup in OMOP `concept` table. ETL-German uses `SnomedVaccineStandardLookup` to find standard vaccine concepts and supports compound codes with `+` separator (line 643). |
| ATC | `http://fhir.de/CodeSystem/bfarm/atc` | ATC | German/European. ETL-German resolves via `AtcStandardDomainLookup` with date-sensitive validity (line 386-388). |
| RxNorm | `http://www.nlm.nih.gov/research/umls/rxnorm` | RxNorm | Direct lookup. FhirToCdm supports this via vocabulary lookup (line 605-606). |

Common CVX codes and their OMOP concept IDs (from Athena):

| CVX Code | Vaccine Name | Notes |
|---|---|---|
| 08 | Hep B, adolescent or pediatric | |
| 10 | IPV | |
| 20 | DTaP | |
| 33 | Pneumococcal polysaccharide PPV23 | |
| 88 | Influenza, unspecified formulation | |
| 115 | Tdap | |
| 141 | Influenza, seasonal, injectable | |
| 207 | COVID-19, mRNA, LNP-S, PF, 100 mcg/0.5mL (Moderna) | |
| 208 | COVID-19, mRNA, LNP-S, PF, 30 mcg/0.3mL (Pfizer-BioNTech) | |
| 212 | COVID-19, viral vector, non-replicating, Ad26 (Janssen) | |

To identify immunization records in OMOP:

```sql
SELECT de.* FROM drug_exposure de
JOIN concept c ON de.drug_concept_id = c.concept_id
WHERE c.vocabulary_id = 'CVX'
```

When the concept maps to the Observation domain instead of Drug (determined by `concept.domain_id`), ETL-German routes the record to the `observation` table instead of `drug_exposure` (lines 476-518).

### Type Concept (`drug_type_concept_id`)

| Scenario | OMOP concept_id | OMOP concept_name | Used By |
|---|---|---|---|
| Physician/clinician administered (default) | 38000179 | Physician administered drug (identified from EHR problem list) | omoponfhir (line 69) |
| EHR record (generic) | 32817 | EHR | ETL-German (Constants.java:26), FhirToCdm (line 389) |
| EHR administration record | 32818 | EHR administration record | mends-on-fhir (Drug_Exposure.wstl:13) |
| Patient self-reported (`primarySource = false`) | 44787730 | Patient Self-Reported | omoponfhir (line 68), conditional on `reportOrigin` |

Recommended approach: Use 32817 (EHR) as the default. If `Immunization.primarySource = false` and `Immunization.reportOrigin` is populated, consider 44787730 (Patient Self-Reported). The OMOP community is migrating away from granular type concepts (like 38000179) toward the simpler provenance hierarchy (32817 EHR, 32818 EHR administration record, etc.).

### Route Concepts (`Immunization.route` → `route_concept_id`)

Common vaccine administration routes mapped to OMOP concepts:

| FHIR Route Code | System | Display | OMOP concept_id | OMOP concept_name |
|---|---|---|---|---|
| `IM` | `http://terminology.hl7.org/CodeSystem/v3-RouteOfAdministration` | Intramuscular | 4302612 | Intramuscular route |
| `SC` | `http://terminology.hl7.org/CodeSystem/v3-RouteOfAdministration` | Subcutaneous | 4302357 | Subcutaneous route |
| `PO` | `http://terminology.hl7.org/CodeSystem/v3-RouteOfAdministration` | Oral / Per Oral | 4132161 | Oral |
| `NASINHL` / `NASINHLC` | `http://terminology.hl7.org/CodeSystem/v3-RouteOfAdministration` | Nasal Inhalation | 4262914 | Nasal route |
| `IDINJ` | `http://terminology.hl7.org/CodeSystem/v3-RouteOfAdministration` | Intradermal | 4156706 | Intradermal route |

ETL-German resolves route via `findOmopConcepts.getConcepts()` with date-aware lookup (line 567-574). omoponfhir iterates `route.coding[]` until a matching OMOP concept is found (lines 597-613).

## Reference Resolution

### `Immunization.patient` → `person_id`

Required. The patient reference must resolve to an existing `person` row.

1. Extract the Patient reference from `Immunization.patient` (R4) or `Immunization.subject` (some profiles use this alias).
2. Resolve to integer `person_id` via the same ID strategy used by the Patient mapper (sequence, hash, or pre-built lookup).
3. If the referenced Patient does not exist, **skip** the Immunization record entirely. All implementations enforce this — ETL-German (line 118-122), omoponfhir (lines 493-501) both reject the record on missing patient.

### `Immunization.encounter` → `visit_occurrence_id`

Optional but recommended. Links the immunization event to a visit.

1. Extract Encounter reference from `Immunization.encounter`.
2. Resolve to integer `visit_occurrence_id`.
3. If the Encounter does not exist, set `visit_occurrence_id = null` and log a debug warning. ETL-German does this (lines 730-743). omoponfhir throws an exception (lines 579-588) — stricter but less fault-tolerant.

### `Immunization.performer[0].actor` → `provider_id`

Optional. The administering practitioner.

1. Extract the first `performer[].actor` reference (typically a Practitioner).
2. Resolve to integer `provider_id` from the Provider mapper.
3. If multiple `performer` entries exist, take the **first** (consensus across implementations). The HL7 IG FML comments out the performer mapping entirely (lines 47-53).
4. omoponfhir uses `getPerformerFirstRep().getActor()` (line 564) and throws if the referenced provider does not exist (lines 570-571).
5. ETL-German does not map performer for immunizations (no `provider_id` set in `setUpDrugExposure`, lines 544-559).

## Status Filtering

| FHIR Status | Action | Notes |
|---|---|---|
| `completed` | Map | Standard case — vaccination was administered. |
| `entered-in-error` | Skip | Data quality issue; should not enter OMOP. |
| `not-done` | Skip (or conditional) | Vaccination was not administered. omoponfhir writes the record with `stop_reason` from `statusReason` (lines 508-521) and sets status to NOTDONE. ETL-German skips (acceptable status list: `in-progress`, `on-hold`, `completed`, `unknown`). mends-on-fhir (reverse) sets `status = not-done` when `stop_reason` is present (line 274-279). |

ETL-German acceptable status list (from Constants.java line 106-107):
- `in-progress`, `on-hold`, `completed`, `unknown` — mapped
- `not-done`, `entered-in-error` — skipped

## Edge Cases

| Case | Handling |
|---|---|
| `occurrenceString` instead of `occurrenceDateTime` | Cannot map — `drug_exposure_start_date` is NOT NULL. Skip the record and log a warning. omoponfhir throws FHIRException: "occurrence must be datetime type" (line 556). |
| `primarySource = false` | Vaccine reported secondhand (e.g., patient self-report, school record). Consider using `drug_type_concept_id = 44787730` (Patient Self-Reported) instead of the default. omoponfhir defines `SELF_REPORTED_CONCEPTID = 44787730L` (line 68). |
| Multiple `performer` entries | Take the first `performer[].actor` for `provider_id`. Only one provider can be stored per `drug_exposure` row. |
| Vaccine series tracking (`protocolApplied`) | `protocolApplied.doseNumber`, `protocolApplied.seriesDoses`, `protocolApplied.targetDisease` are not mapped. No OMOP equivalent for vaccine series tracking. |
| `reaction` present | Not mapped to `drug_exposure`. Could create a separate `observation` row for adverse reactions, but no implementation does this for Immunization. |
| Missing `vaccineCode` | Skip the record. All implementations require a vaccine code. ETL-German (lines 132-141), omoponfhir (lines 525-528). |
| Multiple `vaccineCode.coding[]` entries | Most implementations iterate codings to find one in a recognized vocabulary. ETL-German prefers ATC over SNOMED when both are present (lines 326-332). omoponfhir takes the first coding that resolves to a concept (lines 531-538). |
| SNOMED compound codes (`+` separator) | ETL-German splits compound SNOMED codes on `+` and processes each sub-code separately (lines 643-659), potentially creating multiple `drug_exposure` rows. |
| `lotNumber` exceeds 50 characters | Truncate to varchar(50). Rare in practice but possible with extended lot identifiers. |
| `site` (body site) | No standard mapping to `drug_exposure`. Could map to `route_source_value` but this conflates route and site. Best practice: discard or store in an extension table. |
| `manufacturer` | No standard mapping. Could store in `drug_source_value` alongside the code, but no implementation does this. |
| `expirationDate` | No OMOP target. Lost in translation. |
| `note[].text` | omoponfhir concatenates notes into `sig` field (lines 622-629). Not standard practice — `sig` is intended for prescriber instructions, not clinical notes. |
| Domain routing (concept maps to Observation) | ETL-German checks the concept's `domain_id`; if "Observation" instead of "Drug," the record is routed to the `observation` table (lines 494-517). This is uncommon for CVX codes but can occur with certain SNOMED vaccine concepts. |

## Implementation Comparison

| Aspect | HL7 IG (FML) | omoponfhir | FhirToCdm | ETL-German | mends-on-fhir | fhir-x-omop |
|---|---|---|---|---|---|---|
| Direction | F→O | F↔O | F→O | F→O | O→F | O→F |
| Language | FML | Java | C# | Java | Whistle | Python |
| `drug_exposure_id` | TODO (commented) | from FHIR ID | not explicit | sequence | from OMOP | from OMOP |
| `person_id` resolution | commented out | `patient.getReferenceElement().getIdPartAsLong()` | `GetPersonId1()` lookup | `getSubjectReferenceIdentifier()` / `getSubjectReferenceLogicalId()` | from OMOP `person_id` | from OMOP `person_id` |
| Vaccine vocabularies | unspecified | CVX (via vocabulary lookup) | CVX, SNOMED, RxNorm (via `LookupCode`) | ATC, SNOMED (explicit list) | CVX (filter by `drug_source_vocabulary_id`) | CVX (hardcoded system URI) |
| `drug_type_concept_id` | not set | 38000179 (Physician administered) | 32817 (EHR) | 32817 (EHR) | 32818 (EHR administration) | 38000179 (hardcoded) |
| `drug_source_value` encoding | `vaccineCode.coding.code` | `system:code` | not explicit | vaccine code string | from OMOP | from OMOP |
| `drug_source_concept_id` | set (from coding) | not explicit | via `SetConceptId` | resolved via lookup | from OMOP | not set |
| `lot_number` | yes (line 45) | yes (lines 590-594) | no | no | yes (line 317) | yes |
| `route_concept_id` | yes (lines 30-34) | yes (lines 597-613) | no | yes (lines 566-575) | yes (lines 323-330) | yes (hardcoded mapping) |
| `route_source_value` format | `route.text` or `coding.code` | `system:code:display` | not set | `conceptCode` | `route_source_value` | `route_source_value` |
| `quantity` (dose) | yes (`doseQuantity.value`) | yes (lines 616-618) | no | yes (lines 561-564) | yes (line 334) | yes |
| `dose_unit_source_value` | `doseQuantity.code` | not set | not set | `dose.getUnit()` | `dose_unit_source_value` | `dose_unit_source_value` |
| `provider_id` | commented out | yes (lines 564-575) | no | no | no | yes |
| `visit_occurrence_id` | commented out | yes (lines 579-588) | yes (from encounter) | yes (lines 730-743) | yes (line 296) | yes |
| `sig` from notes | no | yes (lines 622-629) | no | no | no | no |
| `stop_reason` from `statusReason` | no | yes (lines 508-521) | no | no | yes (reverse, line 274) | no |
| Status filtering | not handled | `COMPLETED` only mapped; `NOTDONE` → stop_reason | no filter (all mapped) | `completed`, `in-progress`, `on-hold`, `unknown` | reverse: infers from stop_reason | no filter |
| Domain routing | no | no | no | yes (Drug/Observation) | no | no |
| `not-done` handling | not handled | writes record with stop_reason | no handling | skips | reverse: sets status | no handling |
| Compound SNOMED codes | no | no | no | yes (split on `+`) | no | no |

The HL7 IG FML is minimal/draft — it maps `vaccineCode`, `occurrence`, `doseQuantity`, `route`, and `lotNumber` but comments out `person_id`, `encounter`, and `performer`. Everything else is non-normative implementation choice.

## Sources

- HL7 IG FML (normative, minimal, 54 lines): `refs/refs/fhir-omop-ig/input/maps/ImmunizationMap.fml`
  - Vaccine code mapping: lines 13-17
  - Dose quantity: lines 25-28
  - Route mapping: lines 30-35
  - Occurrence → start/end dates: line 37
  - Lot number: line 45
  - Commented-out person_id: lines 19-23
  - Commented-out encounter: lines 39-43
  - Commented-out performer: lines 47-53
- HL7 IG DrugExposure logical model: `refs/refs/fhir-omop-ig/input/fsh/DrugExposure.fsh`
- omoponfhir Java (bidirectional, 641 lines): `refs/refs/omoponfhir-v54-r4/omoponfhir-omopv5-r4-mapping/src/main/java/edu/gatech/chai/omoponfhir/omopv5/r4/mapping/OmopImmunization.java`
  - Type concept constants (38000179, 44787730): lines 68-69
  - CVX vocabulary filter: line 92
  - `constructDrugExposure()` (F→O main logic): lines 458-633
  - Patient resolution: lines 493-503
  - Status / stop_reason: lines 506-521
  - Vaccine code → drug_concept_id: lines 525-542
  - drug_source_value encoding (`system:code`): lines 543-544
  - Occurrence → dates: lines 547-561
  - Performer → provider_id: lines 564-575
  - Encounter → visit_occurrence_id: lines 579-588
  - Lot number: lines 591-594
  - Route → route_concept_id + route_source_value: lines 597-613
  - Dose quantity: lines 616-618
  - Notes → sig: lines 622-629
  - `constructFHIR()` (O→F): lines 385-456
- ETL-German Java (771 lines): `refs/refs/ETL-German-FHIR-Core/src/main/java/org/miracum/etl/fhirtoomop/mapper/ImmunizationMapper.java`
  - Accepted vocabularies (ATC, SNOMED): lines 49-50
  - Status filtering: lines 108-115 (uses Constants `FHIR_RESOURCE_ACCEPTABLE_EVENT_STATUS_LIST`)
  - Person ID resolution: lines 745-753
  - Onset/date extraction: lines 711-728
  - Vaccine coding extraction: lines 675-698
  - `setUpDrugExposure()`: lines 528-578
  - Drug type = CONCEPT_EHR (32817): line 555
  - Route concept resolution: lines 566-575
  - Dose quantity/unit: lines 561-564
  - Domain routing (Drug vs Observation): lines 475-518
  - SNOMED compound code splitting: lines 638-659
  - ATC date-aware lookup: lines 378-396
  - Encounter resolution: lines 730-743
- ETL-German Constants: `refs/refs/ETL-German-FHIR-Core/src/main/java/org/miracum/etl/fhirtoomop/Constants.java`
  - `CONCEPT_EHR = 32817`: line 26
  - Acceptable status list: lines 106-107
- FhirToCdm C#: `refs/refs/FhirToCdm/FhirToCdmMappings.cs`
  - `CreateDrugExposure()` Immunization section: lines 376-404
  - Drug type = 32817: line 389
  - CVX vocabulary lookup: lines 609-611
  - Person ID resolution: line 382
  - Encounter resolution: lines 396-399
- mends-on-fhir Whistle (O→F, reverse): `refs/refs/mends-on-fhir/whistle-mappings/synthea/whistle-functions/Drug_Exposure.wstl`
  - CVX → Immunization routing: lines 13-17
  - `Drug_Exposure_Immunization()` function: lines 250-349
  - Status inference from stop_reason: lines 274-279
  - Lot number: line 317
  - Route mapping: lines 323-330
  - Dose quantity: lines 333-336
- fhir-x-omop Python (O→F, reverse): `refs/refs/fhir-x-omop/fhir_x_omop/to_fhir/immunization.py`
  - Type concept → system URI mapping: lines 18-21
  - Route code mapping: lines 39-44
  - Lot number: line 35
  - Dose quantity: lines 49-50
- OMOP CDM v5.4 drug_exposure spec: `CommonDataModel/inst/csv/OMOP_CDMv5.4_Field_Level.csv`
- FHIR R4 Immunization: https://hl7.org/fhir/R4/immunization.html
- CVX codes (CDC): https://www2.cdc.gov/vaccines/iis/iisstandards/vaccines.asp?rpt=cvx
- OMOP Type Concepts migration: https://ohdsi.github.io/CommonDataModel/cdm54Changes.html
