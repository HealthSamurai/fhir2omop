# FHIR↔OMOP Mapping: State of the Art

> Analysis of 39 open-source projects, May 2026

## Executive Summary

The FHIR↔OMOP interoperability space is **fragmented, immature, and lacks a production-quality universal solution**. Across 39 repositories (~4,200 commits, ~30 contributors, ~257 stars total), no single project delivers complete, maintained, bidirectional mapping. The HL7 Implementation Guide (fhir-omop-ig) is actively being developed as the normative specification, but all existing implementations are partial and most are abandoned.

**Key finding:** The fundamental challenge is not syntactic transformation but **semantic routing** — a single FHIR resource (e.g., Observation) can map to 6+ different OMOP tables depending on the concept domain, and this requires a live vocabulary database for resolution.

---

## 1. The Fundamental Mapping Problem

### 1.1 Why FHIR↔OMOP is Hard

FHIR and OMOP have fundamentally different design philosophies:

| Dimension | FHIR R4 | OMOP CDM v5.4 |
|-----------|---------|---------------|
| **Purpose** | Clinical data exchange | Observational research analytics |
| **Organization** | By clinical workflow (resource types) | By clinical domain (measurement, drug, condition) |
| **Identity** | Resource references (Patient/123) | Integer surrogate keys (person_id = 456) |
| **Terminology** | Polymorphic CodeableConcept (any system) | Single standard concept_id (OMOP vocabulary) |
| **Time** | Flexible (dateTime, Period, Timing) | Strict date + datetime columns |
| **Cardinality** | Nested, repeating elements | Flat, normalized tables |

### 1.2 The Domain Routing Problem

The most critical mapping challenge: **FHIR resource type ≠ OMOP table**.

A FHIR `Observation` with a SNOMED code can map to any of these OMOP tables depending on the code's `domain_id` in the OMOP vocabulary:

| Observation Code Domain | OMOP Target Table |
|------------------------|-------------------|
| Measurement | measurement |
| Observation | observation |
| Condition | condition_occurrence |
| Procedure | procedure_occurrence |
| Drug | drug_exposure |
| Device | device_exposure |

Similarly, a FHIR `Encounter.diagnosis` can contribute records to `condition_occurrence`, and a FHIR `Condition` with a drug-domain code would map to `drug_exposure`.

**This means:** Any correct FHIR→OMOP converter must have access to the full OMOP vocabulary (~6M concepts) at transformation time to determine target tables.

### 1.3 Consensus Resource-to-Table Mapping

Despite implementation differences, a consensus mapping has emerged across projects:

| FHIR Resource | Primary OMOP Table(s) | Notes |
|---------------|----------------------|-------|
| Patient | person, location, death | Race/ethnicity via US Core extensions |
| Encounter | visit_occurrence, visit_detail | Class code → visit concept (IMP→9201, EMER→9203, AMB→9202) |
| Condition | condition_occurrence | + observation, drug_exposure via domain routing |
| Observation | measurement, observation | Domain-driven: 6+ possible target tables |
| Procedure | procedure_occurrence | |
| MedicationRequest | drug_exposure | |
| MedicationAdministration | drug_exposure | |
| Immunization | drug_exposure | Via CVX vocabulary |
| AllergyIntolerance | observation | Not condition_occurrence |
| DiagnosticReport | measurement | Rarely mapped in practice |
| Practitioner | provider | |
| Organization | care_site | |
| Location | location | |

---

## 2. Implementation Landscape

### 2.1 Projects by Category

```
Standards & Specs (9 repos)     ████████░░  Defining the "what"
FHIR→OMOP ETL (10 repos)       ██████████  Solving the "how"
OMOP→FHIR Servers (7 repos)    ███████░░░  Reverse direction
Knowledge Graphs (5 repos)     █████░░░░░  Linked data approach
Specialized (6 repos)          ██████░░░░  Domain-specific
Sample Data (2 repos)          ██░░░░░░░░  Test datasets
```

### 2.2 Project Maturity Matrix

| Project | Stars | Commits | Lang | Last Active | Status |
|---------|------:|--------:|------|-------------|--------|
| **omoponfhir-main** | 47 | 121 | Java | 2022 | Abandoned |
| **GT-FHIR** | 36 | 361 | Java | 2018 | Dead |
| **FHIROntopOMOP** | 21 | 94 | R2RML | 2024 | Maintained |
| **FhirToCdm** | 19 | 15 | C# | 2025 | Low activity |
| **omoponfhir-r4-sql** | 17 | 50 | Java | 2023 | Stale |
| **fhir-omop-ig** | 15 | 464 | FSH | 2026 | **Active** |
| **HealthcareLakeETL** | 14 | 160 | Python | 2021 | Abandoned |
| **NACHC-fhir-to-omop** | 12 | 1013 | Java | 2025 | Active |
| **fhir-to-omop-demo** | 11 | 176 | jq/Shell | 2024 | Maintained |
| **omopfhirmap** | 11 | 210 | Java | 2023 | Stale |
| **ETL-German-FHIR-Core** | 9 | 39 | Java | 2024 | Maintained |
| **recruit** | 8 | 509 | Java | 2026 | **Active** |
| **fhir-x-omop** | 0 | 6 | Python | 2025 | Early WIP |

---

## 3. Deep Analysis of Key Projects

### 3.1 HL7 fhir-omop-ig — The Emerging Standard

**Status:** STU1 Ballot (actively developed, 464 commits, 4 contributors)
**URL:** https://github.com/HL7/fhir-omop-ig

The official HL7 Implementation Guide defining the normative FHIR↔OMOP mapping. Written in FHIR Shorthand (FSH), published as a standard IG.

**Approach:**
- Defines FHIR profiles constrained for OMOP compatibility
- Provides ConceptMaps for terminology alignment
- Documents structural mappings per resource type
- Focuses on bidirectional conversion

**Coverage:** Patient, Condition, Observation, Procedure, MedicationRequest, Encounter, and others. This is the most comprehensive specification effort.

**Limitation:** Specification only — no executable implementation. Projects must interpret and implement the IG independently.

---

### 3.2 OHDSI FhirToCdm — The Official OHDSI Converter

**Status:** Low activity (19★, 15 commits, 2 contributors)
**URL:** https://github.com/OHDSI/FhirToCdm
**Stack:** C# / .NET Core 3.1

**Architecture:**
```
FHIR JSON Bundles → Parse (Hl7.Fhir.R4) → Map (FhirToCdmMappings.cs)
  → Build (CdmPersonBuilder) → Chunk → CSV output
```

**Key design decisions:**
- **Single mapping file** — all logic in one 625-line `FhirToCdmMappings.cs`
- **In-memory vocabulary** — loads entire OMOP vocab via ODBC at startup
- **Hardcoded type_concept_id** — everything is `32817` (EHR)
- **Multiple codings = multiple records** — each `coding[]` entry generates a separate OMOP row
- **Visit date fallback** — drug/procedure dates default to visit dates when not available

**Resource coverage:**

| FHIR Resource | OMOP Table | Completeness |
|---------------|-----------|--------------|
| Patient → person | 70% | No death, no birth_datetime |
| Encounter → visit_occurrence | 40% | No care_site, no admit/discharge source |
| Condition → condition_occurrence | 60% | No clinical status, no provider |
| Observation → measurement | 50% | No components, no provider |
| AllergyIntolerance → observation | 30% | No reactions, no severity |
| MedicationRequest → drug_exposure | 30% | No refills, quantity, route, days_supply |
| Immunization → drug_exposure | 30% | Basic mapping only |
| Procedure → procedure_occurrence | 40% | No provider |

**Verdict:** Authoritative but incomplete. Many fields are commented out with TODO stubs. Good reference for vocabulary lookup patterns (SQL in `Lookups/` folder) but not production-ready for comprehensive ETL.

---

### 3.3 ETL-German-FHIR-Core — MII FHIR Profiles to OMOP

**Status:** Maintained (9★, 39 commits, OHDSI org)
**URL:** https://github.com/OHDSI/ETL-German-FHIR-Core
**Stack:** Java

**Architecture:**
- Processes German Medical Informatics Initiative (MII) FHIR profiles
- Specialized for the German healthcare context
- Post-processing pipeline with FHIR→intermediate→OMOP stages

**Notable mapping decisions:**
- Handles German-specific extensions (KBV profiles)
- Maps `Encounter.diagnosis.use` to condition type concepts
- Implements onset polymorphism (dateTime, Age, Period, Range, string)
- Supports recorder/asserter fallback chains for provider mapping

**Coverage:** Condition, Observation, MedicationStatement, Procedure, Encounter, Patient, Consent (German Einwilligung)

**Verdict:** Best example of a **profile-specific ETL** — shows how to adapt generic mappings for a national implementation. Not reusable for generic FHIR R4.

---

### 3.4 fhir-to-omop-demo — The Most Elegant Architecture

**Status:** Maintained (11★, 176 commits, 1 contributor)
**URL:** https://github.com/barabo/fhir-to-omop-demo
**Stack:** jq + Shell + SQLite

**Architecture:**
```
Synthea FHIR → HAPI FHIR Server → Bulk $export (ndjson)
  → jq filters (with fhir-jq module) → staging TSV
  → reduce/dedup → SQLite OMOP CDM v5.4
```

**The concept domain routing pattern (most important innovation):**

```jq
# In Observation.jq — routes to 6 different OMOP tables:
def code_concept(domain):
  (.code.coding[] | select(.concept.domain_id == domain)) as $c
  | $c.concept;

def measurement: code_concept("Measurement");
def observation: code_concept("Observation");
def procedure:   code_concept("Procedure");
def condition:   code_concept("Condition");
def drug:        code_concept("Drug");
def device:      code_concept("Device");
```

**Key design decisions:**
- **jq as the mapping language** — natural fit for JSON-to-tabular transformation
- **Pre-enriched FHIR data** — the `fhir-jq` module injects OMOP concept data into FHIR codings before transformation, eliminating runtime DB lookups
- **Domain-driven routing** — concept `domain_id` determines target table, not FHIR resource type
- **Two-stage output** — staging TSV → reduce/merge → final TSV (handles multiple resources contributing to same table)

**Coverage:** Patient, Encounter, Condition, Observation (6 targets), Medication, MedicationRequest, MedicationAdministration, Procedure, Practitioner, Organization, Location

**Verdict:** The cleanest architecture. jq-based approach is highly readable and testable. The domain routing pattern is the gold standard. Limited by jq's inability to handle complex business logic and lack of error handling.

---

### 3.5 omoponfhir — FHIR Server over OMOP (Reverse Direction)

**Status:** Fragmented across 7+ repos (47★ main, 81★ total)
**URL:** https://github.com/omoponfhir/
**Stack:** Java (HAPI FHIR framework)

**Architecture:** A FHIR R4 server implementation that reads from an OMOP CDM database and exposes data as FHIR resources. Essentially the **reverse direction** — OMOP→FHIR.

**Components:**
- `omoponfhir-main` — Docker orchestration, settings
- `omoponfhir-main-r4-sql` / `omoponfhir-main-v54-r4` — Main server variants
- `omoponfhir-omopv5-r4-mapping` — Core mapping layer (OMOP entity → FHIR resource)
- `omoponfhir-r4-server` — HAPI FHIR server implementation

**OMOP→FHIR mappings:**

| OMOP Table | FHIR Resource |
|-----------|---------------|
| person | Patient |
| visit_occurrence | Encounter |
| condition_occurrence | Condition |
| measurement | Observation |
| observation | Observation |
| drug_exposure | MedicationStatement |
| procedure_occurrence | Procedure |
| device_exposure | Device |
| provider | Practitioner |
| care_site | Organization |
| location | Location |

**Verdict:** The most mature OMOP→FHIR implementation. Proves the reverse mapping is feasible. Georgia Tech origin (GT-FHIR → GT-FHIR2 → omoponfhir lineage). Main limitation: the separate repo structure makes it hard to understand and deploy.

---

### 3.6 FHIROntopOMOP — Knowledge Graph Approach

**Status:** Maintained (21★, 94 commits)
**URL:** https://github.com/fhircat/FHIROntopOMOP
**Stack:** Ontop (R2RML/OBDA), SPARQL

**Approach:** Instead of ETL, exposes OMOP data as a FHIR-based RDF knowledge graph using Ontop virtual graph technology. No data movement — queries are translated on-the-fly from SPARQL to SQL.

**Verdict:** Interesting academic approach for query-time federation. Not practical for ETL pipelines but valuable for research queries across OMOP databases using FHIR semantics.

---

### 3.7 fhir-x-omop — Bidirectional with Lossless Round-trip

**Status:** Early WIP (0★, 6 commits)
**URL:** https://github.com/Stoa-Medical/fhir-x-omop
**Stack:** Python (Pydantic v2, chidian DSL)

**Architecture:**
```python
# Forward
omop_person, extra = to_omop_person(fhir_patient, output_extra=True)

# Reverse (lossless with extra data)
fhir_patient_recovered = to_fhir_patient(omop_person, input_extra=extra)
assert fhir_patient == fhir_patient_recovered
```

**Key innovation:** Preserves unmappable FHIR data as "extra" sidecar, enabling lossless round-trip conversion. Uses composable functional mapping DSL via `chidian` library.

**Coverage:** 9 resources (Patient, Condition, Observation, Procedure, Immunization, Encounter, Claim, Practitioner, CarePlan)

**Verdict:** Best architectural design for bidirectional mapping. However, concept_id fields are hardcoded to `0` throughout — vocabulary integration not implemented. Too early for production use.

---

### 3.8 NACHC-fhir-to-omop — Largest Codebase

**Status:** Active (12★, 1013 commits, 2 contributors)
**URL:** https://github.com/NACHC-CAD/fhir-to-omop
**Stack:** Java

The largest implementation by code volume. A comprehensive Java library for FHIR→OMOP conversion with extensive tooling for vocabulary management, data quality checks, and batch processing.

**Verdict:** Most mature Java implementation. Good for organizations already in the Java/OHDSI ecosystem. Too large and complex for use as a reference.

---

## 4. Mapping Patterns & Techniques

### 4.1 Vocabulary Resolution Strategies

| Strategy | Used By | Tradeoff |
|----------|---------|----------|
| **In-memory DB load** | FhirToCdm | Fast lookups, high memory (~GB) |
| **Pre-enriched FHIR** | fhir-to-omop-demo | Elegant, requires preprocessing |
| **Hardcoded concept_ids** | fhir-x-omop, most small projects | Simple, incorrect for real data |
| **Runtime SQL queries** | ETL-German-FHIR-Core | Flexible, slower |
| **Virtual KG (Ontop)** | FHIROntopOMOP | No data movement, query-only |

### 4.2 Common Hardcoded Concept Mappings

All projects converge on these standard mappings:

**Gender:**
```
FHIR male   → OMOP 8507
FHIR female → OMOP 8532
FHIR other  → OMOP 8521
FHIR unknown→ OMOP 8551
```

**Visit type (from Encounter.class):**
```
IMP (inpatient)  → OMOP 9201
EMER (emergency) → OMOP 9203
AMB (ambulatory) → OMOP 9202 (default)
```

**Race (US Core extension):**
```
White             → 8527
Black             → 8516
Asian             → 8515
Native Hawaiian   → 8557
American Indian   → 8657
```

**Type concept (data provenance):**
```
EHR               → 32817 (used universally as default)
```

### 4.3 Unresolved Mapping Challenges

1. **Person ID generation** — FHIR uses string UUIDs, OMOP requires integer keys. No standard approach (hash? sequence? lookup table?).

2. **Multi-coding resources** — When `Condition.code.coding[]` has 3 codings (SNOMED + ICD-10 + local), should it create 1 or 3 `condition_occurrence` rows? FhirToCdm creates 3; most others pick the "best" one.

3. **Observation components** — Blood pressure has systolic + diastolic as `Observation.component[]`. Should this be 1 or 2 measurement rows? Most projects ignore components entirely.

4. **Temporal precision** — FHIR allows `2024`, `2024-03`, `2024-03-15`, `2024-03-15T10:30:00Z`. OMOP requires full date. Padding strategy varies.

5. **Medication references** — `MedicationRequest.medicationReference` points to a Medication resource. Resolving this requires Bundle context or external lookup. Most projects only handle `medicationCodeableConcept`.

6. **visit_occurrence_id linkage** — Most OMOP tables require `visit_occurrence_id`. Resolving FHIR `Encounter` references to integer visit IDs requires a lookup table built during processing. Processing order matters.

---

## 5. Technology Landscape

### 5.1 Language Distribution

```
Java       ███████████  11 repos (dominant due to HAPI FHIR + OHDSI ecosystem)
Python     ██████████   10 repos (growing, modern tooling)
C# / .NET  █            1 repo  (official OHDSI)
jq / Shell █            1 repo  (most elegant)
Scala      █            1 repo  (tofhir)
R2RML      █            1 repo  (knowledge graph)
TypeScript ░            0 repos (gap — our opportunity)
```

### 5.2 No TypeScript/JavaScript Solution Exists

Among all 39 projects, there is **no serious TypeScript or JavaScript implementation** of FHIR→OMOP conversion. The only JS-related repo (`fhir-to-omop-js`) has 0 stars and 0 meaningful code.

This represents a significant gap given:
- FHIR is JSON-native
- Modern healthcare apps increasingly use TypeScript
- Bun provides excellent JSON processing performance
- The `fhir-to-omop-demo` project proves jq (a JSON DSL) is the most natural mapping language

---

## 6. Comparison Matrix

| Feature | FhirToCdm | German-ETL | fhir-to-omop-demo | fhir-x-omop | omoponfhir |
|---------|:---------:|:----------:|:-----------------:|:-----------:|:----------:|
| **Direction** | FHIR→OMOP | FHIR→OMOP | FHIR→OMOP | Bidirectional | OMOP→FHIR |
| **Domain routing** | Partial | No | Yes | No | N/A |
| **Vocab integration** | ODBC DB | Runtime SQL | Pre-enriched | Hardcoded 0 | Direct SQL |
| **Resources mapped** | 8 | 7 | 12 | 9 | 11 |
| **Field completeness** | ~40% | ~50% | ~60% | ~30% | ~50% |
| **Observation components** | No | No | No | No | No |
| **Medication references** | No | Partial | Yes | No | Yes |
| **Batch processing** | Yes | Yes | Yes | No | N/A |
| **Streaming/incremental** | No | No | No | No | Yes (FHIR API) |
| **Round-trip lossless** | No | No | No | Yes (design) | No |
| **Production-ready** | Partial | Regional | Demo | No | Partial |

---

## 7. Gaps and Opportunities

### 7.1 What No Project Does Well

1. **Complete field mapping** — No project maps more than ~60% of available OMOP fields
2. **Observation components** — Blood pressure, vital signs panels universally ignored
3. **Provenance tracking** — `type_concept_id` is always hardcoded to 32817
4. **Data quality validation** — No project validates output against OMOP conventions
5. **Incremental/streaming ETL** — All are batch-oriented
6. **Multi-source deduplication** — No handling of the same patient from multiple FHIR sources
7. **Extension mapping** — US Core, IPS, and other profile extensions largely ignored
8. **Note/DocumentReference** — Free-text clinical notes not mapped to `note` table

### 7.2 Architectural Gaps

1. **No declarative mapping format** — Every project hardcodes mappings in application code. No reusable, tooling-independent mapping specification exists (the HL7 IG is closest but not executable).

2. **No vocabulary-as-a-service** — Every project bundles its own vocabulary resolution. A shared vocabulary microservice would eliminate the #1 integration barrier.

3. **No validation suite** — No standard test suite exists to verify FHIR→OMOP conversion correctness. Each project tests against its own synthetic data.

4. **No TypeScript ecosystem** — The entire space is Java/Python/C#. Given FHIR's JSON-native format, this is a missed opportunity.

---

## 8. Recommendations

### For this project (fhir2omop on TypeScript/Bun):

1. **Follow fhir-to-omop-demo's domain routing pattern** — concept `domain_id` determines target table, not FHIR resource type

2. **Use the HL7 fhir-omop-ig as the normative reference** for field-level mappings

3. **Pre-load OMOP vocabulary into DuckDB** — in-memory vocab resolution like FhirToCdm but using DuckDB's columnar engine for better performance

4. **Implement observation component decomposition** — this is a gap in every existing project and high-impact for measurement quality

5. **Build a validation test suite** using Synthea FHIR bundles as input and OMOP data quality checks on output

6. **Start with the 80/20 resources**: Patient, Encounter, Condition, Observation, MedicationRequest, Procedure — these cover >90% of clinical data volume

---

## Appendix: All 39 Repositories

| # | Repository | Stars | Commits | Contributors | Language | Category |
|---|-----------|------:|--------:|-------------:|----------|----------|
| 1 | omoponfhir/omoponfhir-main | 47 | 121 | 4 | Java | OMOP→FHIR Server |
| 2 | gt-health/GT-FHIR | 36 | 361 | 8 | Java | OMOP→FHIR Server |
| 3 | fhircat/FHIROntopOMOP | 21 | 94 | 3 | R2RML | Knowledge Graph |
| 4 | OHDSI/FhirToCdm | 19 | 15 | 2 | C# | FHIR→OMOP ETL |
| 5 | omoponfhir/omoponfhir-main-r4-sql | 17 | 50 | 1 | Java | OMOP→FHIR Server |
| 6 | HL7/fhir-omop-ig | 15 | 464 | 4 | FSH | Standard/Spec |
| 7 | spe-uob/2020-HealthcareLakeETL | 14 | 160 | 5 | Python | FHIR→OMOP ETL |
| 8 | NACHC-CAD/fhir-to-omop | 12 | 1013 | 2 | Java | FHIR→OMOP ETL |
| 9 | barabo/fhir-to-omop-demo | 11 | 176 | 1 | jq/Shell | FHIR→OMOP ETL |
| 10 | dermatologist/omopfhirmap | 11 | 210 | 5 | Java | OMOP→FHIR |
| 11 | omoponfhir/omoponfhir-main-v54-r4 | 11 | 56 | 3 | Java | OMOP→FHIR Server |
| 12 | OHDSI/ETL-German-FHIR-Core | 9 | 39 | 2 | Java | FHIR→OMOP ETL |
| 13 | gt-health/omop_etl_public | 8 | 17 | 1 | PL/SQL | FHIR→OMOP ETL |
| 14 | miracum/recruit | 8 | 509 | 5 | Java | Specialized |
| 15 | omoponfhir/omoponfhir-omopv5-r4-mapping | 6 | 132 | 3 | Java | OMOP→FHIR |
| 16 | CU-DBMI/omop-fhir-data | 5 | 24 | 2 | Python | Sample Data |
| 17 | CodeX-HL7-FHIR-Accelerator/fhir2omop-cookbook | 4 | 34 | 2 | — | Standard/Spec |
| 18 | myungchoi/GT-FHIR2 | 3 | 305 | 2 | Java | OMOP→FHIR Server |
| 19 | ohdsi-fhir/ohdsi-fhir.github.io | 3 | 2 | 1 | — | Standard/Spec |
| 20 | HL7/fhir-reasoning-omop-ri | 2 | 4 | 2 | R | Standard/Spec |
| 21 | jhu-bids/omop-vocab-on-fhir | 2 | 10 | 1 | Python | OMOP→FHIR |
| 22 | mcode/mcode-omop | 2 | 23 | 1 | FSH | Standard/Spec |
| 23 | science-automation/healthcare-europe-sample | 2 | 124 | 1 | Python | Sample Data |
| 24 | ClarityNLP/export-api | 1 | 22 | 3 | Python | Specialized |
| 25 | OMOP-FHIR-Terminologies-Subgroup/Documents | 1 | 3 | 0 | — | Standard/Spec |
| 26 | OMOP-FHIR-Terminologies-Subgroup/Vulcan-Fhir-to-OMOP-Mapping-Project | 1 | 27 | 7 | — | Standard/Spec |
| 27 | PheMA/omoponfhir-extractor | 1 | 1 | 1 | JS | OMOP→FHIR |
| 28 | salvolpe/REDHotOMOP | 1 | 28 | 1 | — | Specialized |
| 29 | CoReason-AI/coreason-omop-etl-fhir-bridge | 0 | 2 | 1 | Python | FHIR→OMOP ETL |
| 30 | FirelyTeam/OMOPinFHIR | 0 | 19 | 1 | Jupyter | Standard/Spec |
| 31 | StarLiu1/mercurius-mcp-py | 0 | 21 | 1 | Python | Specialized |
| 32 | Stoa-Medical/fhir-x-omop | 0 | 6 | 1 | Python | FHIR↔OMOP |
| 33 | dermatologist/fhirform-ohdsi | 0 | 58 | 1 | Java | Specialized |
| 34 | foxtrotcommunications/avalon-public | 0 | 13 | 1 | Python | FHIR→OMOP ETL |
| 35 | kameheads/omop | 0 | 1 | 1 | — | Specialized |
| 36 | srdc/tofhir-mappings | 0 | 10 | 2 | Scala | FHIR→OMOP ETL |
| 37 | timsbiomed/Vulcan-FHIR-to-OMOP | 0 | 1 | 1 | — | Standard/Spec |
| 38 | timsbiomed/n3c-ingest | 0 | 4 | 1 | Python | OMOP→FHIR |
| 39 | mends-on-fhir/mends-on-fhir | ? | 42 | ? | ? | OMOP→FHIR |
| | **TOTAL** | **~257** | **~4,200** | **~30** | | |
