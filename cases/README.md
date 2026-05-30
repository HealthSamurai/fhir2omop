# FHIR → OMOP golden test cases

Each `cases/<branch>.json` is one **implementation branch** (a feature: race,
ethnicity, domain-routing, …) holding an array of **variant cases** that cover
its corner cases ("with this / with that / without X"). A variant is a
self-contained set of FHIR resources and the **exact** OMOP rows the pipeline
must produce from them — grounded in real Synthea data + the verified output,
trimmed to what drives the mapping. Rendered in the UI at `/cases`.

These replace the Synthea-CSV `cdm.*` oracle as the **correctness** gate: the
oracle is a parallel approximation (different input, different ETL) whose diff
is dominated by representation noise; these cases assert the real FHIR→OMOP SUT
exactly, branch by branch, including corners Synthea never emits.

## File naming

```
<resource-type>--<table>--<table-aspect>.json
```

Three `--`-separated, lowercase, kebab-cased parts:

- **`resource-type`** — the source FHIR resource (`patient`, `observation`,
  `condition`, `diagnosticreport`, `immunization`, `medicationrequest`,
  `procedure`, …). One resource per file. A target table fed by several
  resources gets one file per resource (e.g. `medicationrequest--drug-exposure`,
  `immunization--drug-exposure`).
- **`table`** — the primary OMOP target table (`person`, `location`,
  `measurement`, `observation`, `condition-occurrence`, `note`, `drug-exposure`,
  `procedure-occurrence`, `death`). When one resource fans out to several tables
  (Patient → person + location), name the file after the *characteristic* table
  for that branch; the variants' `omop` still assert every table.
- **`table-aspect`** — the branch / feature within that resource→table mapping
  (`race`, `ethnicity`, `gender-birthsex`, `value`, `components`,
  `coded-value`, `core`, `rxnorm`, `cvx`, `snomed`, …). All the corner-case
  variants for that aspect live in the file's `cases[]` array.

Examples: `patient--person--race.json`, `observation--measurement--components.json`,
`immunization--drug-exposure--cvx.json`.

## File format

```jsonc
{
  "title": "Patient · race (US Core / OMB)",   // the branch / feature
  "notes": "shared context for the branch (markdown ok)",
  "cases": [                                    // variants covering corner cases
    {
      "desc": "OMB White 2106-3 → race_concept_id 8527; source_concept 0",
      "fhir": [ /* self-contained resources */ ],
      "omop": {                                 // OBJECT keyed by OMOP table
        "person":   [ { /* full expected row */ } ],
        "location": [ { /* a resource may produce rows in several tables */ } ]
      }
    },
    { "desc": "no us-core-race → race_concept_id 0, race_source_value NULL",
      "fhir": [ ... ], "omop": { "person": [ { ... } ] } }
  ]
}
```

### `fhir[]`
- **Short logical ids** (`patient-1`, `enc-1`, `obs-1`, `prac-1`) — never UUIDs.
- Cross-reference by `Type/logical-id`. Include a minimal `Patient` + any
  referenced `Encounter` / `Practitioner` / `Organization`. Keep every field the
  edge reads; strip noise (`meta`, `text`, unrelated extensions).

### `omop` — an object `{ <table>: [rows] }`
- A table you **list** is asserted to contain **exactly** those rows.
- A target table you **omit** is asserted **empty** for this variant.
- `"omop": {}` ⇒ the pipeline emits **zero** rows (negative case: refuted /
  entered-in-error / unmapped / filtered).
- One source resource may produce rows in several tables (e.g. Patient →
  `person` + `location`) — list each.

### each expected row
- Assert the **full** produced row: list every **non-NULL** column; every column
  you omit is asserted `NULL`. (The branch is the input dimension that *varies*
  across the file's variants; keep the non-varying fields constant so diffs are
  crisp.)
- **Do not** include the row's own surrogate PK — it is derived.
- **FK columns** reference fhir resources symbolically: `"person_id":"ref:patient-1"`,
  `"visit_occurrence_id":"ref:enc-1"`. Never a raw hash. The runner resolves
  `ref:<id>` → `referenceToId('<id>')`.
- For each `*_concept_id`, add a sibling `"<col>__name":"<concept_name>"` —
  ignored by the matcher, shown in the UI.
- Dates `"YYYY-MM-DD"`; datetimes per the edge's actual cast.

## Intended matcher semantics (runner — TODO)

Run the **whole pipeline** on a variant's `fhir[]` in an isolated schema set;
for each listed table assert the produced rows for the case's subject equal the
expected set (unordered); assert every unlisted target table is empty. A row
passes iff every listed column equals and every unlisted column is NULL;
`ref:` resolves via `referenceToId`; `__name` siblings are ignored.

### Accepted exceptions / gotchas the runner must know
1. **`ref:<id>-location`** — OMOP `location_id` is `stringToId(line|city|state|zip)`
   over the Patient's own address; there is no separate FHIR Location resource.
   Resolve this synthetic ref to the address-composite hash, not a fhir entry.
2. **Timezone**: most edges cast `::timestamp` (offset dropped, wall-clock kept);
   the **Procedure** edge uses `::timestamptz AT TIME ZONE 'UTC'`. Expected
   datetimes follow the edge's actual behavior.
3. **`observation_type_concept_id`** differs by source edge: `32817` for
   Observation-sourced rows, `32827` for Condition-sourced rows.

## Branches (14 files, 58 variants)

| File | Variants | Tables | Corner cases |
|---|---|---|---|
| patient--person--race | 7 | person | US Core OMB (White/Black/Asian/AIAN), omop-race priority, none→0, multi-ombCategory |
| patient--person--ethnicity | 4 | person | Hispanic / Not / none→0 / omop-ethnicity priority |
| patient--person--gender-birthsex | 6 | person | birthsex M/F, birthsex-over-gender, lowercase gender, unknown |
| patient--location--address | 2 | person, location | address present (→ both tables) / absent (→ person only) |
| patient--death--deceased | 4 | death | deceasedDateTime present / absent (→ {}) |
| observation--measurement--value | 5 | measurement | valueQuantity+unit, operator, referenceRange, status / panel-parent filters |
| observation--measurement--components | 2 | measurement, observation | BP fan-out, panel parent filtered |
| observation--observation--coded-value | 4 | observation | valueCodeableConcept→value_as_concept, valueString, interpretation |
| condition--condition-occurrence--core | 6 | condition_occurrence, observation | category→type, status, refuted→{}, domain routing, multi-coding dedup |
| diagnosticreport--note--core | 5 | note, measurement, observation | presentedForm / conclusion, code → measurement / observation routing |
| medicationrequest--drug-exposure--rxnorm | 2 | drug_exposure | RxNorm active, status entered-in-error→{} |
| medicationadministration--drug-exposure--rxnorm | 1 | drug_exposure | RxNorm administration |
| immunization--drug-exposure--cvx | 3 | drug_exposure | CVX crosswalk, CVX no-crosswalk→drug_concept_id 0, not-done→{} |
| procedure--procedure-occurrence--snomed | 7 | procedure_occurrence | SNOMED, vocab priority, domain filter, UTC tz, status filters |
