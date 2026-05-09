# mapspec — TODO & Plan

Status snapshot of the per-resource FHIR↔OMOP mapping documentation
under `mapspec/`. As of 2026-05-09 the folder structure is strict
per-FHIR-ResourceType (no meta-groupings).

## Done

- [x] **Patient/** — index, person, death, location, observation_period
- [x] **Encounter/** — index, visit_occurrence
- [x] **Condition/** — index, condition_occurrence
- [x] **Observation/** — index, measurement, observation
- [x] **Procedure/** — index, procedure_occurrence
- [x] **AllergyIntolerance/** — index, observation
- [x] **DiagnosticReport/** — index, measurement, observation, note, procedure_occurrence
- [x] **Specimen/** — index, specimen
- [x] **Device/** — index, device_exposure
- [x] **Immunization/** — index, drug_exposure
- [x] **Practitioner/** — index, provider _(split from Admin/)_
- [x] **PractitionerRole/** — index, provider _(split from Admin/)_
- [x] **Organization/** — index, care_site _(split from Admin/)_
- [x] **Location/** — index, location, care_site _(split from Admin/)_
- [x] **MedicationRequest/** — index, drug_exposure (canonical drug_exposure field map) _(split from Medication/)_
- [x] **MedicationDispense/** — index, drug_exposure _(split from Medication/)_
- [x] **MedicationAdministration/** — index, drug_exposure _(split from Medication/)_
- [x] **MedicationStatement/** — index, drug_exposure _(split from Medication/)_
- [x] **Medication/** — vocabulary linkage overview (no direct OMOP target)
- [x] **_overview.md** — FHIR×OMOP matrix + directory map updated for new structure
- [x] **_references.md** — external articles, papers, IGs

## Open issues surfaced during the per-resource work

### Patient
- person_id surrogate-key strategy unsettled (sequence vs hash vs lookup)
- `deceasedBoolean = true` without date is unrepresentable; mortality silently dropped by most refs
- multi-race US Core OMB collapse to single `race_concept_id` has no consensus
- non-US ethnicity (German MII `ethnicGroup`) incompatible with OMB
- identifier encoding incompatibilities (`system|value` vs `system^value` vs verbatim vs hash)

### Medications
- **MedicationDispense has NO reviewed reference implementation.**
  `MedicationDispense/drug_exposure.md` was reconstructed from the OMOP
  schema + FHIR R4 spec, not from any existing mapper. Cite-only-from-refs
  rule was relaxed for this folder; this is documented in the file itself.
- `medicationReference` external resolution is implemented in zero of
  the surveyed mappers (everyone handles only inline `medicationCodeableConcept`).
- `days_supply` derivation from `Timing` is implemented nowhere.
- Dynamic `drug_type_concept_id` (44787730 ↔ 38000177 based on `basedOn`)
  only in omoponfhir.

### Location
- Field-level FHIR-path → OMOP-column mapping in `Location/location.md`
  was inferred from the OMOP schema CSV (no reference implementation
  documents Location.address → location.* field-by-field). Plausible but
  not directly cited; flag for review against a real implementation.

### Tooling
- `CLAUDE.md` references `scripts/omop-table.ts` (and the rest of `scripts/`)
  but these were deleted in commit `a6ad787`. CLAUDE.md needs an update or
  the scripts need to be restored.

## Next (cross-cutting docs)

- [ ] `mapspec/_domain-routing.md` — the single hardest topic.
  Observation/Condition/Procedure can route to 6+ OMOP tables based on
  the source code's OMOP `domain_id`. Document the routing algorithm,
  where each ref implements it, and the vocabulary lookup it requires.
  See [MAPPING.md](../MAPPING.md) section 1 for the survey.
- [ ] `mapspec/_vocabularies.md` — terminology bridges (LOINC, SNOMED,
  RxNorm, ICD-10, CVX, CPT, HCPCS) and how each implementation
  resolves source code → standard concept_id (Athena download vs
  Echidna FHIR terminology server vs prebuilt CSV).
- [ ] Already exists: `_references.md` for canonical reference resolution.
- [ ] `mapspec/_identifiers.md` — `*_source_value` conventions across
  implementations (verbatim vs `system|value` vs `system^value` vs
  hash) and recommended approach for this project.
- [ ] `mapspec/_type_concepts.md` — small but contested: which
  `*_type_concept_id` to use for which provenance (32817 EHR vs 32810
  Claim vs 32838 EHR prescription vs 32887 only-by-ETL-German for death).

## Resources NOT covered yet

Lower priority but worth a stub:

- [ ] **RelatedPerson** → fact_relationship (kinship)
- [ ] **CarePlan / Goal / ServiceRequest** — typically dropped by current
  implementations; document explicitly so users know
- [ ] **FamilyMemberHistory** → observation (family-history concepts)
- [ ] **QuestionnaireResponse** → observation / measurement (rare;
  mostly NACHC and SDC profile work)
- [ ] **MolecularSequence** → measurement (genomics; only
  Observation-genetics profile path)
- [ ] **DocumentReference** → note
- [ ] **Coverage / Claim / ExplanationOfBenefit** → payer_plan_period, cost
  (referenced in `_overview.md` but no folder yet)

## Reverse direction (OMOP → FHIR)

`mapspec/` is implicitly FHIR→OMOP. Reverse-direction projects
(omoponfhir, GT-FHIR, FHIROntopOMOP, mends-on-fhir) are documented as
sources but the per-table docs are not OMOP→FHIR-shaped.

- [ ] Decide: extend each per-table doc with a "Reverse: OMOP → FHIR"
  section, or split into `mapspec/<ResourceType>/<table>.fhir-to-omop.md`
  + `<table>.omop-to-fhir.md`?
- [ ] If extending: document round-trip gaps (gender other/unknown → 0,
  deceased data dropped, multi-race collapse).

## Quality pass

- [ ] Verify every `refs/refs/<repo>/...` path in mapspec/ exists on
  disk. Patient agent verified its own; Admin and Medication splits
  inherited cited paths from their source files; spot-check.
- [ ] Pull line numbers from FML files
  (`refs/refs/fhir-omop-ig/input/maps/*.fml`) so links jump to the
  right rule.
- [ ] Confirm OMOP column names against the
  `CommonDataModel/inst/csv/OMOP_CDMv5.4_Field_Level.csv` for every
  per-table doc.

## Tooling

- [ ] Restore or replace `scripts/omop-table.ts`,
  `scripts/fhir-structuredef.ts`, `scripts/fhir-codesystem.ts`,
  `scripts/fhir-valueset.ts` (deleted in `a6ad787`). Either re-add as
  Bun scripts or update CLAUDE.md to drop the references.
- [ ] `scripts/mapspec-check.ts` — validates every
  `refs/refs/<repo>/<path>` link in mapspec/ exists on disk and that
  every OMOP column referenced exists in the field-level CSV.
- [ ] Generate a `mapspec/MATRIX.md` from the per-resource folders:
  rows = FHIR resources, columns = OMOP tables, cells = link to
  relevant doc + status indicator.

## SoF execution layer

See [SOF-MAPPING.md](../SOF-MAPPING.md) for the architectural
proposal: every `mapspec/<Resource>/<table>.md` gets a parallel
`<table>.fsh` that compiles via Sushi to ViewDefinition + Library +
ConceptMap resources. First proof-of-concept candidate: Patient →
person + death + location.
