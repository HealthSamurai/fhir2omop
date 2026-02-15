# Task: DocumentReference -> note

**Priority**: P3 | **References**: 0/4 (listed in overview.md, no reference impl)

## Existing Spec

Listed in `spec/overview.md` but no dedicated spec file.

## Context

OMOP `note` table stores clinical documents for NLP pipelines (note_nlp). DocumentReference is the FHIR resource for clinical documents. Low priority since no reference implementations exist, but valuable for text-mining workflows.

## Deliverables

### 1. FHIR Type (`src/types/fhir.ts`)

Add `DocumentReference` interface:

```
DocumentReference.id
DocumentReference.status: current | superseded | entered-in-error
DocumentReference.type: CodeableConcept  (document type, e.g. discharge summary)
DocumentReference.subject: Reference  (patient)
DocumentReference.date: string  (document date)
DocumentReference.author: Reference[]
DocumentReference.content[].attachment.contentType: string
DocumentReference.content[].attachment.data: string  (base64)
DocumentReference.content[].attachment.url: string
DocumentReference.context.encounter: Reference[]
```

### 2. OMOP Type (`src/types/omop.ts`)

Add `Note` interface:

```
note_id: number
person_id: number
note_date: string
note_datetime: string | null
note_type_concept_id: number
note_class_concept_id: number
note_title: string | null
note_text: string
encoding_concept_id: number
language_concept_id: number
provider_id: number | null
visit_occurrence_id: number | null
note_source_value: string | null
```

### 3. FSH Profile (`profiles/OmopDocumentReference.fsh`)

- Base: DocumentReference
- status: restrict to `current`
- type: 1..1
- subject: 1..1
- content: 1..*

### 4. Mapper (`src/mapper/document-reference.ts`)

```
mapDocumentReference(doc: DocumentReference, ctx: MappingContext): Note | null
```

- Status filter: `current` only
- Type concept: 32817 (EHR)
- Key mapping:
  - type -> note_type_concept_id (0) + note_source_value
  - date -> note_date
  - content[0].attachment.data (base64 decode) -> note_text
  - author[0] -> provider_id
  - context.encounter[0] -> visit_occurrence_id
  - note_class_concept_id = 0 (requires vocabulary lookup)
  - encoding_concept_id = 0, language_concept_id = 0

### 5. Tests (`tests/document-reference.test.ts`)

Cover:
- Status filtering
- Content extraction (base64 text)
- Date mapping
- Reference resolution
- Hash mode determinism

### 6. Spec (`spec/document-reference.md`)

Document field mapping, content type handling, note_type mapping.
