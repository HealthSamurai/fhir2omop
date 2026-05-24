# Medication → drug_exposure — review

Полный анализ: **[Medication_cluster_review.md](Medication_cluster_review.md)**.

## Краткое summary

- **status: stub** — `WHERE FALSE` явно отключает edge.
- staging.medication_drug_exposure: **0 rows** (Synthea не emits standalone Medication)
- output: 0 (даже если staging имел бы данные — WHERE FALSE)
- SQL header comment: "Synthea doesn't emit Medication as a standalone resource. Wired for real-world data where it does appear."

### Особенности

- ⚠️ `drug_type_concept_id = 38000175` — SQL comment "Medication list entry" но Athena имя "**Prescription dispensed in pharmacy**". 38000178 = "Medication list entry".
- `person_id = NULL` — Medication resource не имеет subject
- Все date поля = CURRENT_DATE (т.к. нет date context в Medication)

**Архитектурно странный edge** — Medication это _definition_ resource, не event. Маппинг в drug_exposure требует pairing с Patient ref (которого нет). SQL правильно отключён.

> **Action [LOW]:** возможно стоит этот edge удалить из mapspec/edges/, или явно пометить как `status: not-applicable`. Сейчас он создаёт false expectation.

См. cluster review.
