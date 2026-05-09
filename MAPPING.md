# What's hard about FHIR → OMOP mapping

Ranked by actual difficulty observed across the reference implementations
in `refs/refs/` and the per-resource docs under `mapspec/`.

## 1. Observation → measurement / observation (and beyond)

The single hardest mapping. One FHIR resource, **six+ possible OMOP target
tables** depending on the OMOP `domain_id` of the source code:

| Code domain | OMOP target |
|---|---|
| Measurement | `measurement` |
| Observation | `observation` |
| Condition   | `condition_occurrence` |
| Procedure   | `procedure_occurrence` |
| Drug        | `drug_exposure` |
| Device      | `device_exposure` |

Routing is **not** driven by FHIR resourceType — it requires looking up
each source code in the OMOP vocabulary at transform time. Without a
live vocabulary DB (~6M concepts via Athena), no correct mapping is
possible. Every implementation takes a shortcut: either places `0`,
ships a static CSV subset, or relies on a category-based heuristic
(`Observation.category = laboratory|vital-signs` → `measurement`,
otherwise `observation`).

## 2. DiagnosticReport

Distributes rows across **four** OMOP tables with no consensus on which
goes where:
- `measurement` — lab panels, individual results
- `observation` — flat clinical findings, narrative results
- `note` — full narrative `presentedForm`
- `procedure_occurrence` — imaging studies (radiology reports)

Each reference implementation routes differently. `mapspec/DiagnosticReport/`
has 769 lines of documentation across 5 files — the thickest resource
in the project, reflecting how unsettled this mapping is.

## 3. Medications (4 FHIR resources → 1 OMOP table)

`MedicationRequest`, `MedicationDispense`, `MedicationAdministration`,
`MedicationStatement` all converge onto `drug_exposure`, distinguished
only by `drug_type_concept_id`. Hard parts:

- **Vocabulary normalization** — RxNorm (US), ATC (Europe), NDC,
  SNOMED Drug, custom codes. None of the reference implementations
  bridge them all.
- **`medicationReference` resolution** — contained vs bundled vs
  external Medication resource. Most implementations only handle
  inline `medicationCodeableConcept` and silently drop references.
- **Dose parsing** — FHIR `Timing` is rich (frequency, period,
  bounds, when, offset); OMOP wants flat `quantity`, `days_supply`,
  `sig`, `route_concept_id`. `days_supply` derivation is nowhere
  fully implemented.
- **Dynamic type concept** — omoponfhir flips
  `MedicationStatement.drug_type_concept_id` from
  44787730 (self-reported) to 38000177 (prescription written) when
  `basedOn` references a MedicationRequest. Other implementations
  hardcode.

## 4. Patient (looks easy, isn't)

Strong consensus on gender/birthDate/US Core race+ethnicity but breaks
on:

- **`person_id` surrogate-key generation** — no normative answer.
  HL7 IG FML literally has the line commented out. Implementations
  split between sequence (NACHC, ETL-German), hash (FhirToCdm), and
  pre-built lookup (omoponfhir).
- **`deceasedBoolean = true` without date** — unrepresentable
  because `death.death_date` is NOT NULL. Mortality information is
  silently dropped by 6 of 9 surveyed implementations.
- **Multi-race US Core OMB** — US Core allows multiple
  `ombCategory` entries; OMOP has a single `race_concept_id` and no
  "Multiple races" concept. Implementations pick first / write
  `Other` / write `Unknown` — no consensus.
- **Non-US ethnicity** — German MII `ethnicGroup` (SNOMED) is
  fundamentally incompatible with US Core OMB categories. Only
  ETL-German handles it; everyone else assumes US Core.
- **Identifier encoding** — `system|value`, `system^value`, verbatim
  `Patient.id`, hash. No interoperable convention.

## 5. Condition and Procedure (domain routing again)

Look 1-to-1 (`condition_occurrence`, `procedure_occurrence`) but the
same domain-routing trap applies. A `Condition.code` with a drug-domain
OMOP concept should produce a `drug_exposure` row, not a
`condition_occurrence` row. A `Procedure.code` with a device-domain
concept should produce `device_exposure`. Only the HL7 IG documents
this; no shipped implementation routes correctly.

Plus, `Condition.type_concept_id` carries semantic meaning:
- 32840 — Problem list from EHR
- 32817 — EHR (general)
- 32810 — Claim
The choice changes downstream cohort definitions.

## 6. AllergyIntolerance → observation (counterintuitive)

Maps to `observation`, **not** `condition_occurrence`, despite being
clinically a "condition". Reactions (`reaction[]`) carry their own
codes, severity, manifestation, exposureRoute — they have to be
flattened into multiple `observation` rows linked back to the parent
allergy.

## 7. Encounter → visit_occurrence + visit_detail

`Encounter.partOf` builds nested encounter trees (admit → ward → ICU →
back to ward). OMOP models this with `visit_detail` rows pointing at
their parent `visit_occurrence_id` plus self-referential
`visit_detail_parent_id` for multi-level. Only ETL-German implements
this completely. Plus: multiple `participant[]` deduplication into a
single `provider_id`.

## 8. Immunization → drug_exposure

CVX → RxNorm cross-walk via OMOP vocabulary is painful. `lotNumber`,
`expirationDate`, `manufacturer` have no OMOP target and are dropped.

## 9. Specimen

Bidirectional FK (`specimen.specimen_id` referenced by
`measurement.specimen_id`). Linking the right Observation/measurement
to the right Specimen requires resolving FHIR
`Observation.specimen.reference` after both have been written.

---

## Cross-cutting hard problems

These aren't per-resource mappings but every ETL has to solve them:

### Vocabulary lookup at transform time

No mapping is correct without resolving codes to OMOP standard
concepts. Approaches in the wild:
- Live vocabulary DB query (omoponfhir)
- Pre-loaded static CSV (ETL-German, FhirToCdm)
- Echidna FHIR terminology server (HL7 IG)
- Hardcoded `0` (most others)

### Reference resolution order

Patient/Encounter/clinical events all carry foreign keys to
provider/care_site/location. Strict ETL phase ordering required:

```
Location → Organization (care_site) → Practitioner / PractitionerRole (provider)
       ↓
     Patient (person)
       ↓
     Encounter (visit_occurrence, visit_detail)
       ↓
     Clinical events (condition, observation, drug_exposure, ...)
       ↓
     Derived (drug_era, condition_era, observation_period)
```

`Patient.generalPractitioner` and `Patient.managingOrganization`
require admin resources to be processed first. Most implementations
handle this with two-pass ETL or stub IDs that get backfilled.

### Type concept choices

Small lookup, big disagreement. `*_type_concept_id` should reflect
provenance, but each project picks differently:

| Concept | Use |
|---|---|
| 32817 | EHR (default in ETL-German, FhirToCdm) |
| 32810 | Claim |
| 32838 | EHR prescription (newer; fhir-to-omop-demo) |
| 32818 | EHR administration record (newer; fhir-to-omop-demo) |
| 38000177 | Prescription written (MedicationRequest) |
| 38000175 | Prescription dispensed (MedicationDispense) |
| 38000179 | Physician administered drug (MedicationAdministration) |
| 44787730 | Patient Self-Reported Medication (MedicationStatement) |
| 32887 | (only ETL-German for death) |

### FHIR-side complexity that hurts most

- `CodeableConcept` polymorphism — any code system, any combination
- Nested resources (Bundle, contained, external references)
- `Timing` complexity (frequency, period, bounds, when, offset)
- `effective[x]` polymorphism (`dateTime` vs `Period` vs `Timing`)
- US Core / international profile divergence
- Optional fields with implementation-specific defaults
