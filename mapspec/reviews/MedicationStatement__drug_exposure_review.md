# MedicationStatement → drug_exposure — review

Полный анализ: **[Medication_cluster_review.md](Medication_cluster_review.md)**.

## Краткое summary

- **status: stub**, фактически implemented но не активирован Synthea
- staging.medicationstatement_drug_exposure: **0 rows**
- output: 0
- `drug_type_concept_id = 38000178` "Medication list entry" — **correct** ✅ (единственный med-edge без misname)
- IG `medication.fml` написан **именно для MedicationStatement** (а не MedRequest/MedAdmin)
- WHERE-filter `status NOT IN (entered-in-error, cancelled)` ✅
- Имеет полноценный COALESCE для start/end period

Самый качественный из medication-edge'ей по spec-cleanliness, но не имеет данных.

См. cluster review.
