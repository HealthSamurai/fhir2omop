# Task: observation_period (derived table)

**Priority**: P1 | **References**: all (required by OMOP tooling)

## Existing Spec

Listed in `spec/overview.md` as "derived from earliest/latest clinical events".

## Context

`observation_period` defines the time window during which a patient's data is expected to be captured. It is required by ATLAS, CohortDiagnostics, and most OMOP analytics tools. It is NOT mapped from a single FHIR resource — it is derived from all clinical events for a patient.

## Deliverables

### 1. OMOP Type (`src/types/omop.ts`)

Add `ObservationPeriod` interface:

```
observation_period_id: number
person_id: number
observation_period_start_date: string
observation_period_end_date: string
period_type_concept_id: number
```

### 2. Generator (`src/mapper/observation-period.ts`)

```
generateObservationPeriods(events: ClinicalEvent[]): ObservationPeriod[]
```

Where `ClinicalEvent` is a minimal interface:
```
{ person_id: number, event_date: string }
```

Logic:
- Group all clinical events by person_id
- For each person, find min(event_date) and max(event_date)
- Create one observation_period per person
- period_type_concept_id: 32817 (EHR)
- observation_period_id: sequential

Alternative approach: accept all mapped OMOP records (condition_occurrence, drug_exposure, measurement, etc.) and extract dates from each.

### 3. Tests (`tests/observation-period.test.ts`)

Cover:
- Single patient, single event -> period start = end
- Single patient, multiple events -> min/max dates
- Multiple patients -> separate periods
- Missing dates (skip events without dates)
- Deterministic period_id generation

### 4. Integration Point

Must run AFTER all clinical mappers have produced their output. Could be:
- A post-processing step in a pipeline orchestrator
- Called with collected event dates from all mappers

### 5. Spec (`spec/observation-period.md`)

Document derivation logic, gap-bridging strategy (merge vs. split periods), relationship to OMOP tooling requirements.
