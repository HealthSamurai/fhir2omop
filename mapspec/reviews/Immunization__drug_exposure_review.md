# Immunization → drug_exposure — review

Полный анализ medication-вокруг-drug_exposure: **[Medication_cluster_review.md](Medication_cluster_review.md)**.

## Краткое summary

- **status: implemented**
- staging.immunization_drug_exposure: **1616 rows**
- output: 1616 (100% pass-through; LEFT JOIN на Maps-to)
- Reference cdm.drug_exposure НЕ содержит immunization-source rows (Synthea CSV loader не importeitет Immunization data)

### Особо для Immunization

- **⚠️ `drug_type_concept_id = 32827`** ("EHR encounter record") — **wrong vocabulary** (Type Concept, not Drug Type). Semantically не подходит для drug_exposure. См. cluster §4.2.
- IG `ImmunizationMap.fml` — отдельный от medication.fml, R4-compatible (не R5).
- Code priority: **CVX** > RxNorm (Synthea использует CVX)
- LEFT JOIN на Maps-to: CVX→RxNorm crosswalks могут отсутствовать в bundle — `std_concept_id` тогда = 0, но row пишется (forgiving) ✅
- View не извлекает `doseQuantity`, `route`, `lotNumber` — все три обещаны IG fml и edge JSON.

### Spec-impl gaps (IG обещает, мы не делаем)

1. `quantity` ← `Immunization.doseQuantity.value` — **NULL**
2. `route_concept_id` ← `Immunization.route.coding.code` — **NULL**
3. `route_source_value` ← `Immunization.route.text` — **NULL**
4. `lot_number` ← `Immunization.lotNumber` — **NULL**
5. `dose_unit_source_value` ← `Immunization.doseQuantity.code` — **NULL**

Для immunization analytics эти поля **критичны** (особенно lot_number для recall и vaccine-effectiveness studies).

> **Action [HIGH]:** добавить колонки в view + поля в SQL. Имеется в IG fml как nominal templates.

См. cluster review §4.5.
