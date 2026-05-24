# DiagnosticReport → measurement — review

## 1. Summary

DR панель код (типично LOINC `24323-8 Comprehensive metabolic panel`) маршрутизируется в measurement-таблицу, если concept's domain_id='Measurement'. Edge **documented**, фактически **implemented**.

**Validation на 100-Synthea-когорте**:
- fhir.diagnostic_report: 10900
- staging.diagnosticreport_measurement: 10900 (полный pass-through)
- cdm_ours_fhir.measurement (type=32856): **2328 строк** (21% DR попадают в measurement)
- Reference cdm.measurement (как часть всех 36806) — нет легкого способа сравнить только DR-источник.

Главные находки:
1. **`32856 = "Lab"` (не "Lab result")** в Athena. Edge JSON `vocabularies[diagnostic_report_category].entries[LAB]` ([строка 357](../edges/DiagnosticReport__measurement.json)) пишет `target_concept_name: "Lab result"`. **Misname** — фактически 32856 это просто "Lab". "Lab result" — это **44818702** (Meas Type vocab, non-standard).
2. **`value_as_concept_id` и `value_as_number` всегда NULL** — мы не извлекаем DR.conclusionCode. Edge JSON обещает.
3. **conclusionCode не извлекается** во view — view содержит только code, не conclusionCode.
4. SQL ничего не делает с category (DR.category используется в edge JSON для diagnostic_report_category vocabulary, но в SQL — константа 32856).

## 2. Reference inventory

| Ref | Подход |
|---|---|
| **ETL-German** | [`DiagnosticReportMapper.java:303–365`](../../refs/refs/ETL-German-FHIR-Core/src/main/java/org/miracum/etl/fhirtoomop/mapper/DiagnosticReportMapper.java) — full domain routing + composite SNOMED splitting (например `118247008:{363713009=373068000}`). Category-driven type via custom map. conclusionCode → measurement_source_concept_id (not value_as_concept_id). |
| **fhir-to-omop-demo** | Bash skeleton (009-DiagnosticReport-measurement.sh) — все поля NULL. |
| **NACHC** | Parser only, no OMOP output. |
| **fhir2omop-cookbook** | Narrative guidance only. |

## 3. Key differences

### 3.1. Type concept hardcoded на 32856, не derive из category
SQL [строка 30](../etl/DiagnosticReport__measurement.sql): `32856 AS measurement_type_concept_id`. Все 2328 DR-measurement строк получают `Lab` независимо от DR.category. Synthea DR имеет category `LAB` обычно — так что эмпирически правильно. Но edge JSON `vocabularies` обещает derivation (LAB→32856, RAD/PAT/MB→32817, etc.).

> **Action [MED]:** либо добавить CASE-derivation в SQL по category, либо принять константу как pragmatic choice + удалить sourcing из spec.

### 3.2. conclusionCode не используется
View не извлекает `DR.conclusionCode`. SQL пишет `NULL::integer AS value_as_concept_id`. Edge JSON обещает `DR.conclusionCode → value_as_concept_id`. **Spec ≠ impl.**

> **Action [MED]:** добавить во view `conclusion_code_snomed: conclusionCode.first().coding.where(system=snomedSystem).code.first()`, в SQL: dedicated CTE для conclusion-code resolution → value_as_concept_id.

### 3.3. Multi-conclusionCode не fan-out
Edge JSON edge_cases: "Multiple conclusionCode entries → separate rows". У нас один INSERT per DR. Spec gap. Synthea DR редко имеет несколько conclusions.

### 3.4. Один DR не может пойти в measurement + observation одновременно?
Наш дизайн: DR с LOINC domain=Measurement → DR_meas SQL. DR с LOINC domain=Observation → DR_obs SQL. **Что если LOINC code Maps to → multiple concept_ids с разными domains?** Мы пишем в обе таблицы. Может быть дубликат.

Также: один DR (10900) делится на 2328 (meas) + 2184 (obs) = **4512 покрыто, 6388 НЕ покрыто** (т.е. 60% DR не идут ни в measurement ни в observation). Это note-only DR (которые ВСЕ 10900 идут в note).

### 3.5. effective_dt только, нет period_start
View [строка 30](../views/DiagnosticReport__measurement.view.json) extracts только `effective.ofType(dateTime)`. Edge JSON `fhir_path: DR.effective[x]` (включая Period). SQL `v.effective_dt::date` — упадёт если null. Synthea всегда даёт dateTime, не Period.

> **Action [LOW]:** добавить `effective_period_start` колонку + COALESCE.

## 4. Action items

1. **[MED] fix misname** `32856 → "Lab result"` (реально "Lab") в edge JSON.
2. **[MED] реализовать conclusionCode → value_as_concept_id**.
3. **[MED] derive type_concept_id из category**.
4. **[LOW] добавить period_start fallback**.

## 5. Verification

```
fhir.diagnostic_report: 10900
staging.diagnosticreport_measurement: 10900 (full pass-through)
cdm_ours_fhir.measurement (type=32856 = DR-source): 2328 (21%)

Filter chain: WHERE Maps-to → domain='Measurement'
Note: 10900 - 2328 = 8572 DRs whose LOINC doesn't resolve to Measurement domain
  (most of these resolve to Observation domain — see DR_observation review)
```

## 6. Cross-cutting

См. [DiagnosticReport_observation_review.md](DiagnosticReport__observation_review.md), [DiagnosticReport_note_review.md](DiagnosticReport__note_review.md), [DiagnosticReport_procedure_occurrence_review.md](DiagnosticReport__procedure_occurrence_review.md) — shared DR-кластер patterns.
