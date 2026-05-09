# DiagnosticReport → OMOP Mapping

FHIR `DiagnosticReport` is a container for clinical results -- lab panels, pathology reports, imaging studies, clinical notes. Unlike most FHIR resources, DiagnosticReport does not always produce its own OMOP row. Its referenced `Observation` results (`DiagnosticReport.result[]`) are mapped individually by the Observation mapper. The DiagnosticReport itself only produces OMOP rows in two situations: (1) when its LOINC code resolves to an OMOP concept with a specific domain (Measurement, Observation, or Procedure), or (2) when it carries `conclusion` text or `presentedForm` attachments that should be preserved as clinical notes.

## Target OMOP Tables

| OMOP Table | Purpose | Required? |
|---|---|---|
| `measurement` | DiagnosticReport code with `domain_id = Measurement` in OMOP vocabulary | Conditional -- only when report-level LOINC maps to Measurement domain |
| `observation` | DiagnosticReport code with `domain_id = Observation` in OMOP vocabulary | Conditional -- only when report-level LOINC maps to Observation domain |
| `procedure_occurrence` | DiagnosticReport code with `domain_id = Procedure` (e.g., imaging studies, pathology) | Conditional -- only when report-level LOINC maps to Procedure domain |
| `note` | `DiagnosticReport.conclusion` text or `presentedForm` attachments | Optional -- only when textual content is present |

## Mapping Strategy

1. **Container pattern.** DiagnosticReport primarily groups results. The individual `result` references (Observation resources) are the primary clinical data -- each Observation maps to `measurement` or `observation` independently via the Observation mapper. The DiagnosticReport itself may or may not produce an additional OMOP row. This means a single DiagnosticReport can indirectly generate 10+ OMOP rows (one per referenced Observation), plus optionally its own row for the report code and a `note` row for the conclusion text.

2. **Domain routing via vocabulary lookup.** The DiagnosticReport's `code` (typically LOINC) is looked up in the OMOP vocabulary. The `domain_id` of the resolved concept determines the target table: `Measurement` -> `measurement`, `Observation` -> `observation`, `Procedure` -> `procedure_occurrence`. If the code does not resolve or has no domain, no report-level row is produced. ETL-German is the reference implementation for this pattern (lines 192-236 of `DiagnosticReportMapper.java`).

3. **ConclusionCode as value.** `DiagnosticReport.conclusionCode` (SNOMED findings) provides the clinical result of the report. In the Measurement domain, this maps to `value_as_concept_id`; in the Observation domain, to `value_as_concept_id` or `value_as_string`; in the Procedure domain, to `modifier_concept_id`. Multiple conclusion codes produce multiple OMOP rows.

4. **Category as type concept.** `DiagnosticReport.category` (e.g., `LAB`, `RAD`, `PAT`) maps to `*_type_concept_id` via a source-to-concept-map. ETL-German uses `SOURCE_VOCABULARY_ID_DIAGNOSTIC_REPORT_CATEGORY` to look up custom concepts.

5. **Status filtering.** Not all DiagnosticReport statuses should produce OMOP rows. ETL-German accepts only `final`, `amended`, `corrected`, and `appended`. Statuses `registered`, `preliminary`, `cancelled`, `entered-in-error`, and `unknown` are rejected.

6. **Conclusion text and presentedForm as notes.** `DiagnosticReport.conclusion` (free-text summary) and `presentedForm` (base64-encoded attachments, typically text/plain or application/pdf) map to the OMOP `note` table. These are separate from domain-routed rows.

7. **Date resolution.** `DiagnosticReport.effective[x]` (dateTime or Period) is the primary date source. If absent, `DiagnosticReport.issued` (the report publication instant) can serve as fallback. ETL-German requires effective[x] and rejects reports without it.

## Per-Table Docs

- [measurement.md](./measurement.md) -- DiagnosticReport code with Measurement domain
- [observation.md](./observation.md) -- DiagnosticReport code with Observation domain
- [procedure_occurrence.md](./procedure_occurrence.md) -- DiagnosticReport code with Procedure domain
- [note.md](./note.md) -- DiagnosticReport.conclusion / presentedForm

## Reference Implementations

- **ETL-German-FHIR-Core** (OHDSI, Java) -- `refs/refs/ETL-German-FHIR-Core/src/main/java/org/miracum/etl/fhirtoomop/mapper/DiagnosticReportMapper.java` (670 lines). Most complete DiagnosticReport mapper. Full domain routing (Measurement/Observation/Procedure), status filtering, SNOMED conclusion code parsing with composite expression support, category-based type concept. Status: maintained.
- **fhir-to-omop-demo** (Bash/jq) -- `refs/refs/fhir-to-omop-demo/data/convert/mapping/009-DiagnosticReport-measurement.sh` and `010-DiagnosticReport-note.sh`. Skeleton mappings with all OMOP fields listed but all set to null. Provides field documentation. Status: maintained.
- **NACHC-fhir-to-omop** (Java) -- `refs/refs/NACHC-fhir-to-omop/src/main/java/org/nachc/tools/fhirtoomop/fhir/parser/r4/diagnosticreport/DiagnosticReportParser.java` (120 lines). Parser only -- extracts code, status, effectivePeriod. No OMOP output mapping. Status: active.
- **fhir2omop-cookbook** (CodeX HL7, guidance) -- `refs/fhir2omop-cookbook.md` (lines 528-575). Conceptual mapping guidance. Documents domain-based routing and field correspondences but provides no executable code.
- **FhirToCdm** (OHDSI, C#) -- No dedicated DiagnosticReport mapper. Reports are expected to be mapped via their constituent Observation results.
- **omoponfhir** (Georgia Tech, Java) -- No DiagnosticReport mapper in the v5.4 R4 codebase (confirmed by file search). GT-FHIR (DSTU2 predecessor) has no DiagnosticReport support either.

## Status in This Project

Not yet implemented. No `src/mapper/diagnostic-report.ts` exists. Individual Observation results from DiagnosticReport.result[] are handled by the Observation mapper. A DiagnosticReport type definition is not yet present in `src/types/fhir.ts`.
