# MedicationAdministration → drug_exposure — review

Полный анализ: **[Medication_cluster_review.md](Medication_cluster_review.md)**.

## Краткое summary

- **status: implemented**
- staging.medicationadministration_drug_exposure: **877 rows**
- output: 877 (100% pass-through)
- Reference cdm.drug_exposure НЕ содержит admin-source rows — single-source validation only.

### Особо для MedAdmin

- **⚠️ `drug_type_concept_id = 38000179`** — SQL comment claims "Inpatient administration" (это **38000180**!). 38000179 = "Physician administered drug (identified as procedure)". См. cluster §4.1.
- 3 vocabularies: RxNorm/NDC/SNOMED (others have 2)
- WHERE-filter `status IN (completed, in-progress, on-hold)` — единственный med-edge с status filter ✅
- `provider_id = NULL` (хотя `performer.actor` есть в FHIR)

### Action

См. cluster review §4.1.
