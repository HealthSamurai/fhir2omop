# DiagnosticReport → note

OMOP CDM v5.4. When a DiagnosticReport carries free-text content -- either a `conclusion` string or one or more `presentedForm` attachments -- a `note` row is created to preserve the unstructured clinical narrative. This is independent of the domain-routed rows (measurement, observation, procedure_occurrence) that are produced from the report's LOINC code and conclusionCode. A single DiagnosticReport may produce both a domain-routed row and a note row.

## Field Mapping

| FHIR Path | OMOP Field | Type | Required | Notes |
|---|---|---|---|---|
| (generated) | `note_id` | integer | Yes (PK) | Surrogate key. Hash/sequence of `DiagnosticReport.id` + content source indicator (conclusion vs presentedForm index). Must be unique across all note sources. |
| `DiagnosticReport.subject` | `person_id` | Reference → integer (FK PERSON) | Yes | Resolve `Patient/{id}` reference to integer `person_id`. Skip row if unresolvable. |
| `DiagnosticReport.effective[x]` | `note_date` | dateTime\|Period → date | Yes | Date component of `effectiveDateTime`, or `effectivePeriod.start`. If absent, fall back to `DiagnosticReport.issued` (instant). ETL-German requires effective[x] and skips the resource if absent; however, for note extraction, `issued` is an acceptable fallback since it captures when the report was made available. |
| `DiagnosticReport.effective[x]` | `note_datetime` | dateTime\|Period → datetime | No | Full timestamp from `effectiveDateTime`, `effectivePeriod.start`, or `issued`. OMOP convention: set time to midnight if not given. |
| `DiagnosticReport.category` | `note_type_concept_id` | CodeableConcept → integer (FK CONCEPT) | Yes | Maps the report's provenance/origin. Use 32817 (EHR) as the default. This field captures _where_ the note came from (the source system), not _what kind_ of note it is (that is `note_class_concept_id`). Accepted concepts are from the Type Concept domain. See Vocabulary Mappings below. |
| `DiagnosticReport.category` | `note_class_concept_id` | CodeableConcept → integer (FK CONCEPT) | Yes | Maps the report category to a LOINC Document Type concept. The OMOP CDM specifies this should represent the HL7 LOINC Document Type Vocabulary classification. Map `LAB` → a lab report LOINC document type, `RAD` → radiology report, `PAT` → pathology report. If unmappable, use 0. See Vocabulary Mappings below. |
| `DiagnosticReport.code.coding[0].display` | `note_title` | string → varchar(250) | No | The display text of the report's primary code (typically LOINC). For example, `"History and physical note"` or `"Comprehensive metabolic panel"`. Truncate to 250 characters. If no display text, use `DiagnosticReport.code.text` or the LOINC code itself. |
| `DiagnosticReport.conclusion` or `DiagnosticReport.presentedForm[].data` | `note_text` | string\|base64Binary → varchar(MAX) | Yes | Primary content of the note. For `conclusion`: use the string directly. For `presentedForm`: base64-decode the `data` field. Only `text/plain` content types should be stored directly; other types (e.g., `application/pdf`) require extraction or conversion. If both `conclusion` and `presentedForm` exist, create separate note rows or concatenate (implementation choice). See Data Sources section. |
| `DiagnosticReport.presentedForm[].contentType` | `encoding_concept_id` | code → integer (FK CONCEPT) | Yes | 32678 (UTF-8) for text content. OMOP currently only defines UTF-8 as a standard encoding concept. If the note is in ASCII or another encoding, use 0. For `conclusion` (always a FHIR string, which is UTF-8): 32678. For `presentedForm`: check the `contentType` and encoding; default to 32678 for `text/plain; charset=utf-8`. |
| `DiagnosticReport.presentedForm[].language` or `DiagnosticReport.language` | `language_concept_id` | code → integer (FK CONCEPT) | Yes | Map the language code to an OMOP concept descended from 4182347 (World Languages). Common mappings: `en` → 4180186, `en-US` → 4180186, `de` → 4182948, `fr` → 4181536, `es` → 4182511. If `presentedForm.language` is absent, fall back to `DiagnosticReport.language` (the resource-level language). If absent, use 0. |
| `DiagnosticReport.performer[0]` | `provider_id` | Reference → integer (FK PROVIDER) | No | First `performer` reference resolved to `provider_id`. Filter to `Practitioner`-typed references. `resultsInterpreter[0]` is an alternative source if `performer` is absent. omoponfhir maps the first author/performer to provider (OmopDocumentReference.java lines 312-326). |
| `DiagnosticReport.encounter` | `visit_occurrence_id` | Reference → integer (FK VISIT_OCCURRENCE) | No | Resolve `Encounter/{id}` to `visit_occurrence_id`. If unresolvable, log warning but still create the note row with null. omoponfhir resolves encounter from DocumentReference.context (lines 329-343). |
| (not applicable) | `visit_detail_id` | integer (FK VISIT_DETAIL) | No | Leave null unless visit details are modeled. |
| `DiagnosticReport.category.coding[0].code` | `note_source_value` | string → varchar(50) | No | The source value mapped to `note_class_concept_id`. Store the raw category code (e.g., `"LAB"`, `"RAD"`, `"PAT"`). OMOP CDM documentation states this field holds "the source value mapped to the NOTE_CLASS_CONCEPT_ID". |
| (conditional) | `note_event_id` | integer | No | If the note should be linked to a corresponding domain-routed row (e.g., the `measurement_id` or `procedure_occurrence_id` generated from the same DiagnosticReport), store that row's primary key here. This creates a bidirectional link between the structured result and its narrative. |
| (conditional) | `note_event_field_concept_id` | integer (FK CONCEPT) | No | The CONCEPT_ID identifying which table `note_event_id` references. Use the field concept for the target table's PK: 1147138 (measurement.measurement_id), 1147127 (observation.observation_id), 1147082 (procedure_occurrence.procedure_occurrence_id). Leave null if `note_event_id` is null. |

FHIR fields with no OMOP target (lost in mapping): `DiagnosticReport.identifier`, `DiagnosticReport.basedOn`, `DiagnosticReport.resultsInterpreter` (beyond first performer), `DiagnosticReport.specimen`, `DiagnosticReport.result` (mapped separately by Observation mapper), `DiagnosticReport.imagingStudy`, `DiagnosticReport.media`, `DiagnosticReport.conclusionCode` (maps to domain-routed tables instead), `DiagnosticReport.presentedForm[].url` (external URL references not stored), `DiagnosticReport.presentedForm[].hash`, `DiagnosticReport.presentedForm[].size`, `DiagnosticReport.presentedForm[].creation`.

## Vocabulary Mappings

### Note Type (`note_type_concept_id`)

The `note_type_concept_id` captures the _provenance_ of the note (i.e., where it came from), not its clinical classification. This is distinct from `note_class_concept_id`.

| Source System | Suggested OMOP concept_id | OMOP concept_name | Domain |
|---|---|---|---|
| EHR (default) | 32817 | EHR | Type Concept |
| EHR encounter record | 32827 | EHR encounter record | Type Concept |
| EHR administrative | 32821 | EHR administration | Type Concept |

For DiagnosticReport, the most appropriate default is 32817 (EHR), since reports typically originate from electronic health record systems. ETL-German maps DiagnosticReport category via a custom `source_to_concept_map` for type concepts but does not produce note rows.

### Note Class (`note_class_concept_id`)

The `note_class_concept_id` should represent the HL7 LOINC Document Type classification. The OMOP CDM specifies these should be Standard Concepts with the relationship "Kind of (LOINC)" to concept 706391 (Note). omoponfhir defines a mapping between Note Type OMOP concepts and LOINC concepts (OmopNoteTypeMapping.java).

| DiagnosticReport Category | Category System | Suggested OMOP concept_id | OMOP concept_name | LOINC Source |
|---|---|---|---|---|
| `LAB` | `http://terminology.hl7.org/CodeSystem/v2-0074` | 44814645 | Note | Generic note type |
| `RAD` | `http://terminology.hl7.org/CodeSystem/v2-0074` | 44814641 | Radiology report | Radiology |
| `PAT` | `http://terminology.hl7.org/CodeSystem/v2-0074` | 44814642 | Pathology report | Pathology |
| `MB` | `http://terminology.hl7.org/CodeSystem/v2-0074` | 44814645 | Note | Microbiology (generic) |
| `OTH` | `http://terminology.hl7.org/CodeSystem/v2-0074` | 44814645 | Note | Other |
| (absent) | -- | 0 | No matching concept | -- |

omoponfhir Note Type Mapping (from OmopNoteTypeMapping.java):

| OMOP Note Type concept_id | OMOP concept_name | LOINC concept_id |
|---|---|---|
| 44814637 | Discharge summary | 3020091 |
| 44814638 | Admission note | 40770449 |
| 44814639 | Inpatient note (Hospital Note) | 3029447 |
| 44814640 | Outpatient note | 3030624 |
| 44814641 | Radiology report | 46235057 |
| 44814642 | Pathology report | 40763624 |
| 44814643 | Ancillary report | 42869890 |
| 44814644 | Nursing report | 3046947 |
| 44814645 | Note | 3030653 |
| 44814646 | Emergency department note | 3029201 |

### Encoding (`encoding_concept_id`)

| Encoding | OMOP concept_id | Notes |
|---|---|---|
| UTF-8 | 32678 | Only standard encoding concept defined in OMOP vocabulary. FHIR strings are always UTF-8. |
| ASCII | 0 | No standard OMOP concept. |
| Other | 0 | No standard OMOP concept. |

### Language (`language_concept_id`)

Map BCP-47 / ISO 639 language codes to OMOP concepts descended from 4182347 (World Languages).

| Language Code | OMOP concept_id | OMOP concept_name |
|---|---|---|
| `en` / `en-US` / `en-GB` | 4180186 | English language |
| `de` | 4182948 | German language |
| `fr` | 4181536 | French language |
| `es` | 4182511 | Spanish language |
| `pt` | 4181898 | Portuguese language |
| `zh` | 4181721 | Chinese language |
| (absent) | 0 | No matching concept |

## Data Sources

DiagnosticReport provides two distinct sources of textual content that map to `note_text`. Each has different extraction considerations.

### `DiagnosticReport.conclusion` (string)

- **Type**: FHIR `string` (0..1). Plain text, no encoding needed.
- **Content**: Clinical conclusion or interpretation in free text. Typically a brief summary (1-3 paragraphs).
- **Encoding**: Always UTF-8 (FHIR R4 specification). `encoding_concept_id` = 32678.
- **Language**: Not specified at the field level. Inherit from `DiagnosticReport.language` or default.
- **Mapping**: Store the string directly as `note_text`.
- **Example**: `"The patient's CBC is within normal limits. No evidence of anemia or infection."`

### `DiagnosticReport.presentedForm` (Attachment[])

- **Type**: FHIR `Attachment` (0..\*). Can contain inline base64-encoded data or external URL references.
- **Content**: Full rendered report. May be text/plain, text/html, application/pdf, or other MIME types.
- **Key subfields**:
  - `contentType` (code): MIME type, e.g., `text/plain`, `application/pdf`.
  - `language` (code): BCP-47 language code, e.g., `en-US`.
  - `data` (base64Binary): Inline content, base64-encoded.
  - `url` (url): External reference to the document.
  - `size` (unsignedInt): Size in bytes before base64 encoding.
  - `creation` (dateTime): When the attachment was created.
- **Mapping strategy**:
  1. Filter to `text/plain` attachments (OMOP note_text is free text).
  2. Base64-decode the `data` field to obtain the raw text.
  3. Store the decoded text as `note_text`.
  4. For `text/html`: strip HTML tags and store plain text, or store HTML as-is if the downstream NLP pipeline expects it.
  5. For `application/pdf`: extract text using a PDF parser (e.g., pdf-parse, pdftotext), or skip the attachment and log a warning.
  6. For other MIME types (image/png, application/dicom): skip entirely -- these are binary and cannot be stored as note text.
- **Multiple attachments**: If multiple `presentedForm` entries exist with extractable text, create one note row per attachment (each with a unique `note_id`) or concatenate them into a single `note_text` with delimiters.
- **Example from fhir-to-omop-demo** (010-DiagnosticReport-note.sh lines 119-124): A Synthea-generated DiagnosticReport with `presentedForm[0].contentType = "text/plain"` and base64-encoded clinical note containing chief complaint, history, social history, allergies, medications, and assessment/plan sections.

### When Both Exist

If a DiagnosticReport has both `conclusion` and `presentedForm` text:
- **Option A** (recommended): Create two separate note rows -- one for the conclusion and one for the presented form. This preserves the distinction between the summary and the full report.
- **Option B**: Concatenate conclusion as a header followed by the presented form body, separated by a delimiter (e.g., `"\n\n---\n\n"`).
- **Option C**: Prefer `presentedForm` as the primary note (it contains the full content) and store `conclusion` in `note_title` or discard it.

## Edge Cases

| Case | Handling |
|---|---|
| Empty `conclusion` (empty string or whitespace only) | Do not create a note row for the conclusion. `note_text` is required and must be non-empty. Check `conclusion.trim().length > 0` before creating the row. |
| Binary attachment (`application/pdf`, `image/png`, `application/dicom`) | Skip the attachment for note creation. Log a warning. OMOP `note_text` is designed for free text, not binary content. Consider extracting text from PDFs with a dedicated parser if PDF support is required. |
| Multiple `presentedForm` entries | Create one note row per text-extractable attachment, each with a unique `note_id`. Differentiate via the `note_id` generation strategy (e.g., hash of DiagnosticReport.id + attachment index). |
| Large text (presentedForm > 1MB) | OMOP `note_text` is varchar(MAX), which can hold very large strings. However, downstream NLP tools may have size limits. Consider truncating or splitting at a configurable maximum (e.g., 10MB) with a log warning. |
| No `contentType` on presentedForm | Assume `text/plain` if the `data` field is present and decodable as valid UTF-8 text. Otherwise skip the attachment. omoponfhir requires `contentType` to be `text/plain` and rejects attachments without it (lines 355-374). |
| `presentedForm.url` without `data` | The attachment references an external document. The URL cannot be stored in OMOP `note_text`. Either fetch the content at ETL time and inline it, or skip the attachment with a log warning. |
| Base64 decoding failure | Skip the attachment and log an error. The `data` field may be corrupted or not valid base64. |
| Encoding mismatch (non-UTF-8 text) | Attempt to detect encoding (e.g., ISO-8859-1, Windows-1252) and transcode to UTF-8 before storing. Set `encoding_concept_id` = 32678 after successful transcoding. If transcoding fails, use 0. |
| `presentedForm.language` differs across attachments | Each note row should reflect the language of its specific attachment. Do not assume all attachments share the same language. |
| Status is `preliminary`, `registered`, or `entered-in-error` | ETL-German rejects non-final statuses. For notes, `preliminary` reports may still contain valuable narrative. Consider accepting `preliminary` notes but tagging them (e.g., via `note_source_value = "preliminary"`) so downstream consumers can filter. Reject `entered-in-error` -- these should never produce OMOP rows. |
| `subject` references Group (not Patient) | Not supported. OMOP requires a single `person_id`. Skip the resource. |
| No `effective[x]` and no `issued` | No date available. OMOP `note_date` is required. Skip the resource and log a warning. |
| DiagnosticReport has `conclusion` but no `conclusionCode` | Still create a note row. The `conclusion` text is independent of the structured `conclusionCode`. A report can have a textual interpretation without coded findings. |
| HTML content in `presentedForm` (`text/html`) | Strip HTML tags to produce plain text for `note_text`, or store HTML as-is for NLP pipelines that can process it. Document the approach in ETL conventions. |

## Implementation Comparison

| Aspect | ETL-German | fhir-to-omop-demo | omoponfhir-v54 | FhirToCdm |
|---|---|---|---|---|
| Direction | F→O | F→O | F↔O (DocumentReference) | F→O |
| Produces note rows from DiagnosticReport | No | Skeleton (all nulls) | No (uses DocumentReference→note) | No (Note entity exists but no DiagnosticReport mapper) |
| `conclusion` handling | Not mapped (only `conclusionCode` for domain routing) | Mapped conceptually (field listed but null) | Not applicable (maps DocumentReference, not DiagnosticReport) | Not applicable |
| `presentedForm` handling | Not mapped | Example shows base64-encoded text/plain from Synthea | Maps DocumentReference.content.attachment.data (text/plain only, line 356) | Note entity exists but note creation is commented out (`//TMP: NOTE`, line 358) |
| `note_type_concept_id` | -- | Listed as required, set to null | Set from DocumentReference.type via LOINC→NoteType mapping (lines 239-279) | -- |
| `note_class_concept_id` | -- | Listed as required, set to null | Set to Concept(0) (line 384) | -- |
| `encoding_concept_id` | -- | Listed as required, set to null | Set to Concept(0) (line 385) | -- |
| `language_concept_id` | -- | Listed as required, set to null | Set to Concept(0) (line 386); constructs FHIR with "en-US" hardcoded (line 499) | -- |
| `provider_id` | -- | Listed, set to null | From DocumentReference.author[0] Practitioner reference (lines 312-326) | -- |
| `visit_occurrence_id` | -- | Listed, set to null | From DocumentReference.context.encounter[0] (lines 329-343) | -- |
| `note_text` source | -- | Listed, set to null | From DocumentReference.content.attachment.data concatenated (lines 346-381) | -- |
| Content type filtering | -- | -- | Only accepts `text/plain` (line 356); rejects other types | -- |
| Base64 handling | -- | Shows base64-encoded example in comments | Uses `attachment.getData()` which returns decoded bytes (line 360) | -- |
| Note Type mapping (LOINC↔OMOP) | -- | -- | `OmopNoteTypeMapping` enum maps 10 Note Type concepts to LOINC concepts (lines 19-28) | -- |

### Key Observations

1. **No reference implementation maps DiagnosticReport.conclusion/presentedForm to the OMOP note table.** ETL-German only handles `conclusionCode` for structured domain routing. fhir-to-omop-demo provides the field skeleton but all values are null. omoponfhir maps `DocumentReference` (not `DiagnosticReport`) to the note table.

2. **omoponfhir's DocumentReference→note mapper** is the closest reference for understanding how FHIR narrative content maps to the OMOP note table. It demonstrates: subject→person_id resolution, author→provider_id, encounter→visit_occurrence_id, attachment data→note_text, and type→note_type_concept_id via LOINC concept mapping. However, it defaults `note_class_concept_id`, `encoding_concept_id`, and `language_concept_id` all to Concept(0), which is technically non-compliant with the OMOP CDM specification (these fields are required/not-null).

3. **FhirToCdm** has a `Note` entity and `BuildNote` method in `CdmPersonBuilder.cs` (line 700), but note creation is commented out with `//TMP: NOTE` (line 358), indicating incomplete implementation.

4. **The FHIR→OMOP IG** (HL7 official) defines a `Note` logical model (`Note.fsh`) with all 16 fields but does not provide FML (FHIR Mapping Language) transformation rules for DiagnosticReport→note.

## Sources

- ETL-German Java (primary reference for DiagnosticReport, no note mapping): `refs/refs/ETL-German-FHIR-Core/src/main/java/org/miracum/etl/fhirtoomop/mapper/DiagnosticReportMapper.java`
  - Conclusion text not mapped (only conclusionCode): lines 468-497
  - PresentedForm not mapped: entire file (no reference to presentedForm)
  - Status filtering: lines 596-605
  - Date extraction (effective[x]): lines 607-634
- fhir-to-omop-demo Bash (skeleton): `refs/refs/fhir-to-omop-demo/data/convert/mapping/010-DiagnosticReport-note.sh`
  - All 16 note fields listed with null mappings: lines 14-29
  - FHIR example DiagnosticReport with presentedForm base64: lines 61-127
  - Synthea text/plain presentedForm example: lines 119-124
- omoponfhir-v54 Java (DocumentReference→note, bidirectional): `refs/refs/omoponfhir-v54-r4/omoponfhir-omopv5-r4-mapping/src/main/java/edu/gatech/chai/omoponfhir/omopv5/r4/mapping/OmopDocumentReference.java`
  - constructOmop (FHIR→OMOP): lines 225-389
  - Type concept from DocumentReference.type via LOINC: lines 239-279
  - Subject→person_id: lines 282-299
  - Date from DocumentReference.date (indexed): lines 302-309
  - Author→provider_id: lines 312-326
  - Encounter→visit_occurrence_id: lines 329-343
  - Content attachment→note_text (text/plain only): lines 346-381
  - Default note_class, encoding, language to Concept(0): lines 384-386
  - constructFHIR (OMOP→FHIR): lines 420-520
- omoponfhir-v54 Note Type Mapping: `refs/refs/omoponfhir-v54-r4/omoponfhir-omopv5-r4-mapping/src/main/java/edu/gatech/chai/omoponfhir/omopv5/r4/mapping/OmopNoteTypeMapping.java`
  - 10 Note Type ↔ LOINC concept mappings: lines 19-28
  - getOmopConceptIdFor (LOINC→NoteType): lines 41-49
  - getLoincConceptIdFor (NoteType→LOINC): lines 53-61
- omoponfhir-v54 Note entity: `refs/refs/omoponfhir-v54-r4/omoponfhir-omopv5-sql/src/main/java/edu/gatech/chai/omopv5/model/entity/Note.java`
  - All 16 OMOP note fields mapped to JPA columns: lines 30-77
- FhirToCdm C# (Note entity exists, creation commented out): `refs/refs/FhirToCdm/CdmPersonBuilder.cs`
  - AddNote method: lines 271-274
  - BuildNote method: lines 700-710
  - Note creation commented out: line 358 (`//TMP: NOTE`)
  - AddToChunk with Note array: line 1168
- HL7 IG FSH (normative logical model): `refs/refs/fhir-omop-ig/input/fsh/Note.fsh`
  - All 16 note fields defined: lines 1-25
- OMOP CDM v5.4 note spec: `CommonDataModel/inst/csv/OMOP_CDMv5.4_Field_Level.csv` lines 200-216
- FHIR R4 DiagnosticReport: https://hl7.org/fhir/R4/diagnosticreport.html
- FHIR R4 Attachment datatype: https://hl7.org/fhir/R4/datatypes.html#Attachment
- OMOP CDM note table docs: https://ohdsi.github.io/CommonDataModel/cdm54.html#note
- Athena Note Type concepts: https://athena.ohdsi.org/search-terms/terms?domain=Type+Concept&query=note
