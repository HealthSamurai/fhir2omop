# FHIR → OMOP golden test cases

Each `cases/NN-<slug>.json` is a **self-contained** fixture: a set of FHIR
resources and the **exact** OMOP rows the pipeline must produce from them.
Grounded in real Synthea data + the verified pipeline output, but trimmed to
the minimum that drives the mapping. Rendered in the UI at `/cases`.

These replace the Synthea-CSV `cdm.*` oracle as the **correctness** gate: the
oracle is a parallel approximation (different input, different ETL) whose diff
is dominated by representation noise; these cases assert the real
FHIR→OMOP SUT exactly, including edge cases Synthea never emits.

## File format

```jsonc
{
  "title": "short human title",
  "notes": "WHY these inputs produce exactly these rows — cite source codes, the
            standard concept_ids + names, domain routing, dedup / panel-parent /
            status filtering, date/value derivation. The human-reviewable ground truth.",
  "fhir":  [ /* self-contained FHIR resources */ ],
  "omop":  [ /* expected rows across ALL target tables */ ]
}
```

### `fhir[]`
- Use **short logical ids** (`patient-1`, `enc-1`, `obs-1`, `prac-1`) — never UUIDs.
- Cross-reference by `Type/logical-id` (e.g. `"subject": {"reference": "Patient/patient-1"}`).
- Include a minimal `Patient` and any referenced `Encounter` / `Practitioner` /
  `Organization`. Keep every field the edge reads (`code.coding`, `value[x]`,
  `effective[x]`, `status`, `category`, `clinicalStatus`/`verificationStatus`,
  `component[]`, `presentedForm`/`conclusion`, US-Core extensions, …); strip
  noise (`meta`, `text`, unrelated extensions).

### `omop[]` (the expectations)
- `"table"`: required discriminator (`measurement`, `condition_occurrence`, …).
- **FK columns reference fhir resources symbolically**: `"person_id": "ref:patient-1"`,
  `"visit_occurrence_id": "ref:enc-1"`. Never a raw hash. The runner resolves
  `ref:<id>` → `referenceToId('<id>')`.
- **The row's own surrogate PK is omitted** (`measurement_id`, …) — it is derived
  and not asserted.
- **List only the columns that should be non-NULL.** Every OMOP column you do *not*
  list is asserted `NULL` (strict completeness — catches leaks).
- For each `*_concept_id`, add a sibling `"<col>__name": "<concept_name>"` — ignored
  by the matcher, shown in the UI for review.
- Dates `"YYYY-MM-DD"`; datetimes ISO (see timezone note below).
- `"omop": []` asserts the pipeline emits **zero** rows (negative case: refuted /
  entered-in-error / unmapped).

## Intended matcher semantics (runner — TODO)

- Run the **whole pipeline** on `fhir[]` in an isolated schema set; collect the
  produced OMOP rows for the case's subject.
- Per table, match expected ↔ actual as an **unordered set** (row order irrelevant).
- A matched row passes iff every listed column equals and every unlisted column is
  NULL; `ref:` resolves via `referenceToId`; `__name` siblings are ignored.

### Accepted exceptions / gotchas the runner must know
1. **`ref:<id>-location`** (case 01) does *not* resolve to a FHIR resource — OMOP
   `location_id` is `stringToId(line|city|state|zip)` over the Patient's own address,
   and there is no separate FHIR Location resource. The runner should resolve this
   synthetic ref to the address-composite hash, not look for a fhir entry.
2. **Timezone**: most edges cast `::timestamp` (offset dropped, wall-clock kept), so
   a `+01:00` source keeps its local time. The **Procedure** edge uses
   `::timestamptz AT TIME ZONE 'UTC'` (true UTC conversion). Expected datetimes are
   written per the edge's actual behavior.
3. **`observation_type_concept_id`** differs by source edge: `32817` (EHR) for
   Observation-sourced rows, `32827` (EHR encounter record) for Condition-sourced
   rows — each matches its edge's hardcoded constant.

## Cases

| File | Edge / scenario |
|---|---|
| 01-patient-person | Patient → person (gender / OMB race+ethnicity / birthsex) |
| 02-observation-measurement | LOINC lab + valueQuantity → measurement |
| 03-observation-observation | social-history coded answer → observation (value_as_concept_id) |
| 04-observation-bp-components | BP panel → 2 component measurements (parent filtered) |
| 05-condition-condition-occurrence | SNOMED diagnosis → condition_occurrence |
| 06-condition-domain-routing | Condition code routed by resolved domain |
| 07-diagnosticreport-note | DR presentedForm/conclusion → note (+ code routing) |
| 08-immunization-drug-exposure | CVX vaccine → drug_exposure |
| 09-medicationrequest-drug-exposure | RxNorm prescription → drug_exposure |
| 10-procedure-procedure-occurrence | SNOMED procedure → procedure_occurrence |
