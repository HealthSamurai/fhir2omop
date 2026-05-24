# DiagnosticReport → procedure_occurrence — review

## 1. Summary

DR с LOINC code resolving to Procedure domain (radiology, imaging studies). Status в edge JSON **documented**, фактически **implemented**.

**Validation на 100-Synthea-когорте**:
- staging.diagnosticreport_procedure_occurrence: 10900
- cdm_ours_fhir.procedure_occurrence (от DR): **0 строк** — НИ ОДИН DR не идёт в procedure!

## 2. Почему 0 procedures из DR

SQL [строки 6–22](../etl/DiagnosticReport__procedure_occurrence.sql) делает same fan-out (LOINC/SNOMED/CPT4) + `Maps to` walk + `domain_id='Procedure'`. На Synthea **никакие DR-коды не Maps to стандартные Procedure-domain концепты**. Все Synthea DR codes — лабораторные (Measurement) или document classes (Observation/Note).

Synthea не эмитит radiology DRs с LOINC procedure codes. Так что эта ветка **не активирована** на нашей когорте, но **код корректен** на случай real-world data.

## 3. Reference inventory

| Ref | Подход |
|---|---|
| ETL-German | DR → procedure_occurrence через imaging study codes. |
| omoponfhir | Не делает. |
| FhirToCdm | Не делает. |
| fhir2omop-cookbook | Концептуальная guidance. |

## 4. Key differences

### 4.1. `procedure_type_concept_id = 32827` ("EHR encounter record")
Inconsistent с DR_meas (32856 "Lab") и DR_obs (32817 "EHR"). DR одно, type concepts разные в разных таблицах. Не блокер — каждая таблица self-consistent.

### 4.2. Никакого `quantity` derivation
DR не имеет количественной информации — `quantity = NULL`. Edge JSON указывает константу 1 от NACHC — мы не используем.

### 4.3. Code-vocabulary list: LOINC/SNOMED/CPT4
Sibling Procedure_proc_occ имеет LOINC+SNOMED+CPT4+HCPCS+ICD10PCS. DR_proc_occ имеет только LOINC+SNOMED+CPT4. **Нет ICD10PCS/HCPCS** в этом edge. Для consistency — добавить.

## 5. Action items

1. **[LOW] consistency**: добавить HCPCS/ICD10PCS в DR_procedure code list. Сейчас выпадают.

## 6. Verification

```
staging.diagnosticreport_procedure_occurrence: 10900
cdm_ours_fhir.procedure_occurrence (DR-source): 0 (Synthea не активирует эту ветку)
```

## 7. Cross-cutting

См. также siblings: [DR_measurement](DiagnosticReport__measurement_review.md), [DR_observation](DiagnosticReport__observation_review.md), [DR_note](DiagnosticReport__note_review.md).

DR cluster summary:
- 10900 DR в FHIR
- 2328 → measurement (Measurement-domain LOINC)
- 2184 → observation (Observation-domain LOINC)
- 10900 → note (все, если есть text)
- 0 → procedure_occurrence (Synthea ничего не эмитит)

Total distinct DR-derived rows: 2328 + 2184 + 10900 + 0 = **15412** (один DR может попасть в несколько таблиц, через разные домены).
