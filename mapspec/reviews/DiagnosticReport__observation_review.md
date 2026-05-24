# DiagnosticReport → observation — review

## 1. Summary

Sibling к [DR_measurement](DiagnosticReport__measurement_review.md). DR с LOINC code resolving to Observation domain (clinical notes, document classes — H&P, discharge summaries, consultation notes) идут сюда.

**Validation**: staging.diagnosticreport_observation: 10900 → cdm_ours_fhir.observation (от DR): **2184 строки** (20% DR попадают в observation).

## 2. Reference inventory (same as DR_measurement)

ETL-German `DiagnosticReportMapper` — same code path with domain routing. Никакого dedicated `DRToObservation` метода — domain-driven dispatch.

## 3. Key differences

### 3.1. value-related fields все NULL
SQL [строки 30–33](../etl/DiagnosticReport__observation.sql) пишут `NULL::numeric` для value_as_number, value_as_string, value_as_concept_id. Edge JSON `narrative_md` указывает на "primarily clinical document types — H&P, discharge summaries" — для них действительно нет numeric value. **Но conclusionCode тоже не используется** (мог бы быть value_as_concept_id для текстовых выводов).

### 3.2. type_concept_id = 32817, не 32856
Sibling DR_measurement использует 32856 (Lab); DR_observation использует 32817 (EHR). Inconsistent для одной и той же FHIR resource type. Если оба маппят одну DR (через разные домены), у них разные `*_type_concept_id`. Это норм потому что таблицы разные, но **inconsistent rationale**.

### 3.3. Same domain-routing limitation
Inner JOIN на `domain_id='Observation'`. DR без resolved Observation-domain LOINC отбрасываются (большинство DR такие).

## 4. Action items

1. **[LOW] consider conclusionCode → value_as_string** — для DR documents с структурированными conclusions.
2. **[LOW]** align type_concept rationale across DR-edges.

## 5. Verification

```
staging.diagnosticreport_observation: 10900
cdm_ours_fhir.observation (DR-source): 2184 (20%)
```

См. также cluster-summary в DR_measurement review.
