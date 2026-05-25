# TODO — fhir2omop

## Multi-coding fan-out: one OMOP row per CodeableConcept.coding[]

**Problem.** A FHIR `CodeableConcept` can carry multiple `coding[]` entries
that all refer to the same clinical concept in different vocabularies (a
typical Synthea Condition has both a SNOMED and an ICD-10-CM coding for
the same diagnosis; an Observation often carries LOINC + SNOMED).

Today every edge that resolves a CodeableConcept picks **one** "best"
coding via vocabulary-priority `UNION ALL` + `DISTINCT ON (staging_id)`
and writes exactly one OMOP row, dropping the alternative codings on
the floor. That loses information: the analyst can't see that a
Condition was coded as both SNOMED `73211009` and ICD-10 `E11.9`, and
the `*_source_concept_id` only ever reflects whichever vocabulary won
the priority race.

**Goal.** Fan out — produce **one OMOP row per `coding[]` entry** with
its own `*_source_value`, `*_source_concept_id`, and resolved standard
`*_concept_id`. The surrogate PK becomes `hash(<resource>.id || '/' ||
coding.system || ':' || coding.code)` so multiple rows from the same
parent resource get deterministic non-colliding IDs. This matches the
FhirToCdm pattern (`LookupCode` iterates every coding) and the OMOP
convention that one event can have multiple `*_source_concept_id`
provenance records linked by `*_event_id`.

**Affected edges** (all stage-2 SQLs that currently do "best coding"):

- `Condition__condition_occurrence` (SNOMED / ICD10CM / ICD9CM / ICD10 / evidence-codes)
- `Procedure__procedure_occurrence` (SNOMED / CPT4 / HCPCS / ICD10PCS)
- `Observation__measurement` (LOINC / SNOMED via `cm.fhir_system_to_omop_vocab`)
- `Observation__observation` (same)
- `Observation_component__measurement` and `Observation_component__observation` (component codings)
- `DiagnosticReport__measurement` / `DiagnosticReport__observation` / `DiagnosticReport__procedure_occurrence` (LOINC / SNOMED / CPT4)
- `DiagnosticReport__note` (`note_class_concept_id` LOINC — usually one, but still)
- `AllergyIntolerance__observation` (SNOMED / RxNorm)
- `Immunization__drug_exposure` (CVX / RxNorm)
- `MedicationRequest__drug_exposure` and siblings (RxNorm / NDC / SNOMED)
- `Device__device_exposure` (SNOMED — typically one)

**Open design questions:**

1. **Domain routing per coding.** If SNOMED maps to `domain_id='Condition'`
   but ICD-10 maps to `domain_id='Observation'` for the same source CC,
   do we write to two different OMOP tables? Probably yes — that's the
   honest answer — but it doubles the per-resource cost.

2. **Row identity / dedup.** When two codings resolve to the **same**
   standard concept (SNOMED → ICD10CM via Maps-to round-trip), do we
   emit one row or two? Suggest: deduplicate on `(person_id, date,
   <target>_concept_id)` so analysts don't double-count.

3. **`*_event_id` linkage.** OMOP CDM v5.4 has
   `measurement_event_id` / `obs_event_field_concept_id` for exactly
   this kind of provenance fan-out. Use it to link the rows back to a
   single "parent" event, or leave NULL and rely on shared
   `*_source_value` for grouping.

4. **`Observation.code.coding` vs `Observation.component[].code.coding`.**
   The fan-out applies at both levels — a component can itself have
   multi-vocab coding. Likely 2x the explosion factor in measurement /
   observation.

5. **Row-count blast radius.** On 100-patient Synthea: most
   CodeableConcepts have 1-2 codings, so expect a 1.3-1.8x multiplier
   on cdm_ours_fhir.* row counts. Validate against `cdm.*` reference
   (Synthea CSV) — that loader picks one coding too, so our row counts
   will diverge. Need a parallel `cdm_ours_fhir_*` view that mimics the
   reference's "best coding" pick for the diff page to stay readable.

**Acceptance criteria.**

- For each affected edge, the staging view's `code_<vocab>` columns
  become a denormalized join (`forEach coding`) instead of
  vocab-specific extractions.
- Stage-2 SQL no longer does `DISTINCT ON (staging_id)` — every
  matched coding gets its own row.
- `*_source_value` carries the source coding's `code`,
  `*_source_concept_id` its non-standard concept_id, `*_concept_id`
  the Maps-to'd standard concept.
- Diff page shows two columns: "best-coding mode" (current, for
  apples-to-apples vs reference) and "fan-out mode" (new).
- `mapspec/GAPS.md` or a new design note documents the
  domain-routing-per-coding policy chosen in (1).
