# mapspec — TODO & Plan

Status snapshot of the per-resource FHIR↔OMOP mapping documentation under `mapspec/`.

## Done

- [x] **Patient/** — `index.md`, `person.md`, `death.md`, `location.md`, `observation_period.md` (493 lines)
  - Open issues surfaced: person_id strategy, deceased→death often dropped, race/ethnicity for non-US, multi-race collapse, identifier encoding incompatibilities

## In progress (parallel agents launched)

- [ ] **Encounter/** → visit_occurrence, visit_detail
- [ ] **Condition/** → condition_occurrence, condition_era
- [ ] **Observation/** → measurement, observation (with domain-routing notes)
- [ ] **Procedure+Medications+Immunization/** → procedure_occurrence, drug_exposure, drug_era, dose_era
- [ ] **AllergyIntolerance + DiagnosticReport + DocumentReference/** → observation, measurement, note, note_nlp
- [ ] **Admin/** (Practitioner, PractitionerRole, Organization, Location, Specimen, Device, Coverage, Claim, EOB) → provider, care_site, location, specimen, device_exposure, payer_plan_period, cost

## Next (after parallel batch lands)

### Cross-cutting docs

- [ ] `mapspec/_overview.md` — top-level index linking every resource folder, plus the consensus FHIR→OMOP table matrix (lift from `state-of-the-art.md`).
- [ ] `mapspec/_domain-routing.md` — the single hardest topic. Observation/Condition can route to 6+ OMOP tables based on the source code's OMOP `domain_id`. Document the routing algorithm, where each ref implements it, and the vocabulary lookup it requires.
- [ ] `mapspec/_vocabularies.md` — terminology bridges (LOINC, SNOMED, RxNorm, ICD-10, CVX, CPT, HCPCS) and how each implementation resolves source code → standard concept_id (ATHENA download vs Echidna FHIR terminology server vs prebuilt CSV).
- [ ] `mapspec/_references.md` — single canonical reference resolution table (Patient/X → person.person_id, Practitioner/X → provider.provider_id, Organization/X → care_site.care_site_id, Location/X → care_site or location).
- [ ] `mapspec/_identifiers.md` — `*_source_value` conventions across implementations (verbatim vs `system|value` vs `system^value` vs hash) and recommended approach for this project.

### Quality pass on the per-resource docs

- [ ] Verify every `refs/refs/<repo>/...` path actually exists (the Patient agent verified its own; sanity-check the other agents' citations).
- [ ] Pull line numbers from FML files (`refs/refs/fhir-omop-ig/input/maps/*.fml`) so links jump to the right rule.
- [ ] Confirm OMOP column names against `bun scripts/omop-table.ts --pretty <table>` for every per-table doc.
- [ ] Add a "Status in this project" footer to each resource folder pointing at `src/mapper/<resource>.ts` if implemented, or "Not yet implemented" if not.

### Resources we have NOT covered yet

Lower priority but worth a stub:

- [ ] **RelatedPerson** → fact_relationship (kinship)
- [ ] **CarePlan / Goal / ServiceRequest** → typically dropped by current implementations; document that explicitly so users know
- [ ] **FamilyMemberHistory** → observation (family-history concepts)
- [ ] **QuestionnaireResponse** → observation / measurement (rare, mostly NACHC and SDC profile work)
- [ ] **MolecularSequence** → measurement (genomics; only Observation-genetics profile path)

### Reverse direction (OMOP→FHIR)

The current `mapspec/` is implicitly FHIR→OMOP. Reverse-direction projects (omoponfhir, GT-FHIR, FHIROntopOMOP, mends-on-fhir) are documented as sources but the per-table docs are not OMOP→FHIR-shaped.

- [ ] Decide: extend each per-table doc with a "Reverse: OMOP → FHIR" section, or split into `mapspec/<ResourceType>/<table>.fhir-to-omop.md` + `<table>.omop-to-fhir.md`?
- [ ] If extending: document round-trip gaps surfaced by the Patient agent (`other`/`unknown` gender → 0, deceased data dropped, multi-race collapse).

### Tooling

- [ ] Add a `scripts/mapspec-check.ts` — validates every `refs/refs/<repo>/<path>` link in mapspec/ exists on disk and that every OMOP column referenced exists in `CommonDataModel/inst/csv/OMOP_CDMv5.4_Field_Level.csv`.
- [ ] Generate a single `mapspec/MATRIX.md` from the per-resource folders: rows = FHIR resources, columns = OMOP tables, cells = link to relevant doc + status indicator.

## Open questions / decisions needed

- Whether `mapspec/` is the canonical location going forward, or if we should fold the existing `spec/` and `mapping/` directories into it (currently three places hold mapping notes).
- Whether to track every reference implementation's quirks per-table, or only the ones we recommend following.
- US-centric vs international scope — most refs assume US Core; ETL-German is the only non-US reference. Patient agent flagged that ethnicity mapping fundamentally diverges.
