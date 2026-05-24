# Coverage → payer_plan_period — review

## 1. Summary

Edge **stub** (по факту implemented, но Synthea не emit Coverage, 0 rows).

- `staging.coverage_payer_plan_period` table — **не существует**
- `cdm_ours_fhir.payer_plan_period`: 0 строк
- `cdm.payer_plan_period` (ref): **не существует** (Synthea CSV loader не создаёт)

## 2. SQL анализ (для real-world data)

SQL [`Coverage__payer_plan_period.sql`](../etl/Coverage__payer_plan_period.sql):
- `payer_concept_id = 0`, `plan_concept_id = 0` — все placeholders
- `payer_source_value = v.payer_name`, `plan_source_value = v.type_text`
- WHERE `period_start IS NOT NULL OR period_end IS NOT NULL`
- COALESCE для start/end dates (период симметричный)
- ВСЕ concept_id поля = 0 — никаких ConceptMap-ов.

## 3. Reference inventory

| Ref | Notes |
|---|---|
| **fhir-omop-ig** | `PayerPlanPeriod.fsh` only (нет fml) |
| FhirToCdm | `BuildPayerPlanPeriods` с overlap merging (CdmPersonBuilder.cs) |
| ETL-German | Не реализует |

## 4. Action items

1. **[LOW] payer_concept_id resolution** — для production нужен custom ConceptMap (SOPT, etc.). Сейчас все 0.
2. **[NOTE]** stub-edge не активирован Synthea-cohort. Нет данных, нет валидации.

## 5. Verification

Невозможна. Cross-cutting "no reference for payer_plan_period" — см. Patient/observation_period review §4.1.
