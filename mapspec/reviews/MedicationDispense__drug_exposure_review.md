# MedicationDispense → drug_exposure — review

Полный анализ: **[Medication_cluster_review.md](Medication_cluster_review.md)**.

## Краткое summary

- **status: stub** (edge JSON), фактически implemented но не активирован Synthea
- staging.medicationdispense_drug_exposure: **0 rows** (Synthea не emits MedicationDispense)
- output: 0
- ⚠️ `drug_type_concept_id = 38000176` — SQL comment "Dispensed in Outpatient office" но Athena имя "**Prescription dispensed through mail order**". Misnamed.

Реализация полная, но не активирована. Для production EHR с pharmacy data — заработает.

См. cluster review §4.3.
