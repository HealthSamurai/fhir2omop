# FHIR → OMOP mapping gaps

Single source of truth for everything that's **missing, lossy, or wrong** in
the current spec — pulled from per-edge inventories. Each item lists where
to fix and what the fix looks like.

Cross-references:
- [`concept-id-analysis.md`](./concept-id-analysis.md) — full classification
  of all 64 `*_concept_id` columns
- [`concept-requests.json`](./concept-requests.json) — machine-readable
  registry of proposals (legacy migrations, new OMOP concepts, drops)
- [`codesystem-mappings.md`](./codesystem-mappings.md) — FHIR system URLs
  cross-referenced to OMOP `vocabulary_id`

---

## 1. Source-column provenance gaps

Inventory of `*_source_concept_id` columns (30 total) and where the FHIR
source code should populate them.

| Bucket | Count | Meaning |
|---|---:|---|
| ✅ FHIR-mapped | 10 | `fhir_path` set; runtime can lookup in `vocab.concept` |
| ⚪ by-design `=0` | 11 | FHIR carries enum/string, not a vocab code — `0` is correct |
| ❌ hardcoded `=0` (gap) | 8 | FHIR carries a vocab code but edge ignores it |
| 🟡 missing field | 1 | row not in edge at all (need to add field) |

### ❌ Hardcoded `=0` gaps — fix by adding `fhir_path` + runtime lookup

| Edge | Column | FHIR source to read | Resolve via |
|---|---|---|---|
| `AllergyIntolerance__observation` | `observation_source_concept_id` | `code.coding[best]` | SNOMED concept by code |
| `Encounter__visit_occurrence` | `visit_source_concept_id` | `class.code` | v3-ActCode → `OMOP Extension` source concept |
| `Observation__measurement` | `measurement_source_concept_id` | `code.coding[best]` | LOINC/SNOMED source concept |
| `Observation__measurement` | `unit_source_concept_id` | `valueQuantity.code` | UCUM source concept |
| `Observation__observation` | `observation_source_concept_id` | `code.coding[best]` | SNOMED/LOINC source concept |
| `Device__device_exposure` | `unit_source_concept_id` | `quantity.unit` (no FHIR Device.unit) | UCUM source concept |
| `MedicationRequest__drug_exposure` | `drug_source_concept_id` | `medication[x].coding[best]` | RxNorm/NDC source concept — already done in 4 other Medication* edges, this is an oversight |
| `MedicationStatement__drug_exposure` | `drug_source_concept_id` | `medication[x].coding[best]` | same |

### 🟡 Missing field

| Edge | Missing column |
|---|---|
| `Coverage__payer_plan_period` | `stop_reason_source_value` (field exists but has no `fhir_path`) |

### ⚪ Justified `=0` (no FHIR vocab code to read)

`Patient__person`: `gender_source_concept_id`, `race_source_concept_id`, `ethnicity_source_concept_id`
`Practitioner__provider`: `gender_source_concept_id`, `specialty_source_concept_id`
`PractitionerRole__provider`: `specialty_source_concept_id`
`Patient__death`: `cause_source_concept_id` (FHIR Patient carries no cause of death)
`Coverage__payer_plan_period`: `payer_source_concept_id`, `plan_source_concept_id`, `sponsor_source_concept_id`, `stop_reason_source_concept_id`

These should be marked `"concept_status": "by-design-zero"` in the edges so
the UI doesn't flag them as missing.

---

## 2. Legacy `*_type_concept_id` constants (deprecated by CDM v5.4)

Four `drug_type_concept_id` constants point at concepts that are no longer
standard in CDM v5.4 — they live in vocab `Drug Type` which has zero
standard concepts. CDM v5.4 unified type concepts under the `Type Concept`
vocab.

| Edge | Current | New (Type Concept) |
|---|---|---|
| `MedicationRequest__drug_exposure` | `38000177 Prescription written` (Drug Type, non-standard) | `32838 EHR prescription record` |
| `MedicationDispense__drug_exposure` | `38000175 Prescription dispensed in pharmacy` | `32839 EHR dispensing record` |
| `MedicationAdministration__drug_exposure` | `38000179 Physician administered drug` | `32833 EHR administration record` |
| `MedicationStatement__drug_exposure` | `44787730 Patient Self-Reported Medication` | `32865 Patient self-report` |

Source: [`concept-requests.json` § `legacy_to_type_concept`](./concept-requests.json).

---

## 3. FHIR fields with no OMOP CDM target (data drop)

13 FHIR fields carry clinical signal that no OMOP CDM v5.4 column accepts.
Today they're silently dropped. Each has a proposed remediation (observation
spawn, custom OMOP extension, drop with warning).

Key ones:

| FHIR field | Loss | Proposed |
|---|---|---|
| `AllergyIntolerance.criticality` (low/high) | Risk severity | propose new OHDSI Vocab v5 concepts in `OMOP Extension` — no clean SNOMED equivalent |
| `AllergyIntolerance.severity` (mild/moderate/severe) | Reaction grade | spawn observation, qualifier_concept_id = SNOMED 24484000/6736007/255604002 |
| `AllergyIntolerance.reaction.manifestation[]` | Symptoms | fan-out: extra observation rows linked via fact_relationship |
| `Condition.severity` | Disease grade | drop today; propose CDM extension `condition_severity_concept_id` |
| `Procedure.outcome` | Success/failure | drop today; propose CDM extension |
| `Procedure.complication[]` | Adverse outcomes | spawn condition rows |
| `Patient.maritalStatus` | Demographics | spawn observation (LOINC 45404-7 / SNOMED 224125008) + value_as_concept_id |
| `Patient.communication.language` | Preferred language | spawn observation (SNOMED 161139007) + Language vocab |
| `Encounter.priority` | Triage priority | drop |
| `Observation.method` | How obs made | spawn qualifier observation or drop |
| `Specimen.collection.method` | Collection technique | drop or specimen_source_value suffix |
| `Coverage.relationship` | Subscriber relationship | drop or propose CDM extension |
| `Encounter.reasonCode`/`diagnosis` | Reasons / ranked dx | spawn condition rows, link via visit_occurrence_id |

Full registry: [`concept-requests.json` § `fhir_data_with_no_omop_target`](./concept-requests.json).

---

## 4. ValueSet expansion gaps

Domain ValueSets only enumerate the **standard target** vocab; FHIR senders
also legitimately use **source vocabularies** that Maps-to the same domain.
The compose.include should list them. Status as of last update:

| ValueSet | Has standard? | Missing source vocab includes |
|---|---|---|
| `omop-condition-codes` | SNOMED + ICD10CM + ICD9CM ✅ (fixed) | — |
| `omop-drug-codes` | RxNorm ✅ | NDC (1.3M), HCPCS J-codes |
| `omop-measurement-codes` | LOINC + SNOMED ✅ | HCPCS lab codes, CPT4 (when loaded) |
| `omop-observation-codes` | SNOMED + LOINC ✅ | HCPCS service codes |
| `omop-procedure-codes` | SNOMED ✅ | ICD9Proc, HCPCS, CPT4 (gap), ICD10PCS (gap) |
| `omop-device-codes` | SNOMED ✅ | HCPCS device codes, NDC device entries |
| `omop-specimen-codes` | SNOMED ✅ | — |

Same fix pattern as `Condition.valueset.json`: append `compose.include` per
source vocab + UNION the `expansionSql` with the Maps-to subquery.

---

## 5. Loaded-vocab gaps (Athena bundle)

Vocabularies referenced by our profiles/edges but absent from the current
loaded bundle. Re-pick on https://athena.ohdsi.org/vocabulary/list, re-upload
to `gs://atomic-ehr-athena-vocab/bundles/`, run `bun script/init-athena.ts`.

| Vocab | Blocks | FHIR system URL |
|---|---|---|
| **CVX** | `Immunization.vaccineCode` → `drug_concept_id` | `http://hl7.org/fhir/sid/cvx` |
| **ICD10PCS** | Procedure source codes via Maps-to | `http://hl7.org/fhir/sid/icd-10-pcs` |
| **CPT4** | Procedure source codes (needs `cpt.sh` + UMLS API key post-processor) | `http://www.ama-assn.org/go/cpt` |

After loading, the corresponding `omop-procedure-codes` and Immunization
profile become fully resolvable. Until then, `drug_source_concept_id` for
CVX-coded Immunizations resolves to `0`.

---

## 6. 1→N Maps-to cardinality (ETL semantics)

ICD10CM → SNOMED is many-to-many: **~24% of ICD10CM codes split into 2–4
standard SNOMED concepts**. ICD9CM similar but lower (~11%). The OHDSI
canonical answer is **fan-out** — emit N rows of `condition_occurrence`,
identical except for `condition_concept_id`. Not all OMOP tables tolerate
fan-out (`measurement.value_as_number` makes no sense duplicated;
`visit_occurrence` is by definition 1:1).

Per-target table policy:

| Target table | Fan-out? |
|---|---|
| `condition_occurrence` | ✅ yes |
| `procedure_occurrence` | ✅ yes |
| `observation` | ✅ yes |
| `device_exposure` | ✅ yes |
| `drug_exposure` | ⚠️ careful (dose accounting) |
| `measurement` | ❌ no — pick-one |
| `visit_occurrence` | ❌ no — pick-one |

Action: add `"mapping_cardinality": "fan-out" | "pick-one" | "sum"` to each
edge JSON, surface on the edge UI page so the policy is explicit before
the runtime is wired.

---

## 7. US Core race "Other" cannot round-trip — `8522` vs `8552` semantic gap

**OMOP Race vocab distinguishes:**
- `8522` = **Other Race** — patient declared a race not in the OMB-5 set
- `8552` = **Unknown** — race was not collected / refused / unknown

These are **different** OMOP concepts.

**US Core race extension** (`http://hl7.org/fhir/us/core/StructureDefinition/us-core-race`)
has three sub-extensions:
- `ombCategory` (Coding, 0..5) — bound to a closed value set:
  the 5 OMB codes (`2106-3`/`2054-5`/`2028-9`/`1002-5`/`2076-8`) **+ `UNK`**
- `detailed` (Coding, 0..*) — finer-grained race codes (CDC 1000+ codes)
- `text` (string, **1..1**, must support) — display label

Per US Core 4.0+:
> If the patient race is not represented by the OMB categories — for example,
> race is "Other" — only the text element should be present.

That is: real "Other Race" should produce `text="Other"` and **no ombCategory**.
`ombCategory=UNK` is reserved for genuinely unknown / refused / not collected.

**Problem:** there is no FHIR-native code that means "Other Race" — it is
expressible **only** as the absence of `ombCategory` plus a free-form `text`.
Our generic FHIR→OMOP `cm.race_omb_to_omop` table can map `UNK → 8552`
honestly, but cannot generate `8522` from a code that doesn't exist.

**To derive `8522`, a pipeline must either:**
1. Parse `text.valueString` — fragile (free text: "Other", "Mixed", "Hispanic"
   (wrong domain), "Caucasian"/"White" duplicates, varying case/whitespace).
2. Bake source-system-specific quirks into the ETL (e.g. "Synthea writes
   `ombCategory=UNK + text=Other` simultaneously").
3. Inspect `detailed.coding[]` (CDC 1000+ codes) when ombCategory is missing —
   only viable if the source actually populates it.

**Current behavior of this pipeline (general FHIR→OMOP):**
- `ombCategory.code` is the canonical signal — trust it.
- `UNK → 8552 Unknown` (matches FHIR semantics).
- Other / Multiple / non-OMB races: no FHIR code → `0 (No matching concept)`.
- We do **not** parse `text` — relying on display strings would silently
  break on any source whose vocabulary differs from ours.

**Implications for Synthea data:**
Synthea's FHIR exporter is non-conformant — for CSV `RACE='other'` it emits
**both** `ombCategory=UNK` *and* `text="Other"`, conflating "Other" with
"Unknown". Through our pipeline this becomes `race_concept_id=8552`. The
"Other-ness" is lost upstream by Synthea, not by us; we faithfully translate
what the FHIR resource actually says.

**If a deployment needs `8522` for "Other"-flavored sources** (e.g. when
loading Synthea data into a research dataset that cares about that
distinction), the fix belongs **outside** the generic ETL:
- Pre-process the FHIR data to strip `ombCategory=UNK` when a non-empty,
  non-"Unknown" `text` is present, OR
- Add a source-specific `cm.race_text_<source>_to_omop` ConceptMap for the
  small closed set of text values that source emits, and JOIN it in a
  derived pipeline (not in `Patient__person.sql`).

---

## 8. Routing-key gaps in profile `code` bindings

Some routing pairs need a discriminator the current profile doesn't enforce:

| Resource | Tables | Discriminator works? |
|---|---|---|
| Observation | measurement / observation | ✅ `code` ∈ Measurement vs Observation VS |
| DiagnosticReport | measurement / observation / procedure_occurrence / note | ⚠️ partial — `code` binding sometimes ambiguous (a LOINC code may live in both Measurement and Observation domains) |
| Location | location / care_site | ⚠️ uses `physicalType` presence rather than a code-domain check |

For DiagnosticReport especially, runtime must check the `code` against
each candidate domain and route accordingly — profile validation alone is
insufficient.

---

## 9. Timezone semantics per source CSV (ETL convention)

Synthea writes timestamps with different precisions and zones depending
on the CSV. The stage-2 ETLs must cast each in a way that matches the
**source CSV's own semantics**, not a single project-wide rule. Mixing
them silently breaks the cdm.* ↔ cdm_ours_fhir.* diff.

| Source CSV | Column shape | FHIR rendering | OMOP cast convention |
|---|---|---|---|
| `encounters.csv` | `START, STOP` — ISO-8601 with `Z` (UTC) | `Encounter.period.start/end` (local tz) | `(v.encounter_start::timestamptz AT TIME ZONE 'UTC')::date` — convert FHIR's local-tz back to the UTC the CSV stored. |
| `procedures.csv` | `START, STOP` — UTC | `Procedure.performedDateTime` / `performedPeriod` (local tz) | Same UTC-rebase as Encounter. |
| `observations.csv` | `DATE` — UTC | `Observation.effectiveDateTime` (local tz) | Same UTC-rebase. |
| `conditions.csv` | `START, STOP` — naive **local date** (`YYYY-MM-DD`, no time, no zone) | `Condition.onsetDateTime` (local tz, with time) | `v.onset_dt::date` — naive `::date` cast; **don't** rebase to UTC or the date can flip ±1 across the dateline. |
| `medications.csv` | `START, STOP` — UTC | `MedicationRequest.authoredOn` (local tz) | UTC-rebase for `drug_exposure_start_datetime`; `::date` for `_start_date`. |
| `careplans.csv`, `imaging_studies.csv`, `immunizations.csv`, `allergies.csv`, `devices.csv` | Mixed — UTC for datetime-bearing CSVs, naive date for date-only CSVs | varies | Follow the CSV column type: if it has a `T...Z`, UTC-rebase; if it's a bare `YYYY-MM-DD`, naive `::date`. |

**Rule of thumb**: ask "does the *source CSV* string contain a `Z` or
offset?" — if yes, the FHIR resource was generated **with timezone
conversion away from UTC**, and the cast must undo that to recover the
CSV's clock. If the CSV column is a bare date, treat the FHIR value as
already in the user's clock and cast `::date` without rebasing.

This is why `cdm.condition_occurrence.condition_start_date = '2024-04-09'`
but `cdm_ours_fhir.condition_occurrence.condition_start_date =
'2024-04-10'` when you forget — the FHIR resource has
`onsetDateTime: 2024-04-09T22:00:00-04:00`, which is `2024-04-10T02:00Z`,
and casting through `timestamptz AT TIME ZONE 'UTC'` then `::date` lands
in the wrong day.

The convention is encoded across the per-edge stage-2 SQLs and tested
via the side-by-side diff page; this section documents it so future
edge authors don't reinvent or mismatch it.

---

## Action checklist

- [ ] Fix 8 hardcoded `*_source_concept_id` gaps (§1) — add `fhir_path`,
      rewire runtime lookup.
- [ ] Add `stop_reason_source_value.fhir_path` to `Coverage__payer_plan_period`.
- [ ] Mark 11 by-design `=0` source concepts with `concept_status: "by-design-zero"`.
- [ ] Migrate 4 legacy `drug_type_concept_id` constants to Type Concept (§2).
- [ ] Add `concept_status` field schema to edges; surface on UI.
- [ ] Add source-vocab `include` entries + UNION expansionSql to 5 domain
      ValueSets (§4).
- [ ] Re-bundle Athena to load CVX + ICD10PCS (§5).
- [ ] Run `cpt.sh` against bundle to hydrate CPT4 names.
- [ ] Decide and document `mapping_cardinality` per edge (§6).
- [ ] Open GitHub issue at `OHDSI/Vocabulary-v5.0` proposing
      AllergyIntolerance criticality concepts in `OMOP Extension` (§3).
