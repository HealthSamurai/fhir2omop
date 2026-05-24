# AllergyIntolerance → observation — review

## 1. Summary

OMOP не имеет dedicated allergy table — аллергии живут в `observation`. Edge **implemented**, primary, required. Substance code из AllergyIntolerance используется одновременно как `observation_concept_id` И `value_as_concept_id` (двойное хранение). Stage-2 SQL **APPEND**-ит к cdm_ours_fhir.observation (без TRUNCATE) и должен запускаться после Observation_observation.

**Validation на 100-Synthea-когорте**:
- fhir.allergy_intolerance: **116**
- staging.allergyintolerance_observation: **116**
- В cdm_ours_fhir.observation от allergy: **116** ✅ (100% выживание)
- В cdm.observation matching: **106** строк с allergy-like concept_ids — 10 не match'ат, но это reasonable из-за разной идеи как маппить.

Главные находки:
1. **omoponfhir и наш подход семантически расходятся**: мы пишем substance в `observation_concept_id` И `value_as_concept_id` (substance IS the value). omoponfhir пишет **category-based concept** (`food→4188027, medication→439224`) в observation_concept_id, и substance в value_as_concept_id. **IG fml согласен с нами** (substance code → observation_concept_id). 
2. **Reaction.manifestation НЕ извлекается** в нашем view (хотя edge JSON обещает `value_as_string = concat manifestations`). Реализация отстаёт от спеки.
3. **Date fallback inverted**: SQL `COALESCE(recorded_date, onset_dt)` — preferring `recordedDate` over `onsetDateTime`. Edge JSON обещает наоборот (`onsetDateTime → onsetPeriod.start → recordedDate`). 
4. View использует `onset.ofType(dateTime)` — НЕ extract'ит `onsetPeriod.start`, обещанное edge JSON.

## 2. Reference inventory

| Ref | File | Подход |
|---|---|---|
| **fhir-omop-ig** | [`Allergy.fml`](../../refs/refs/fhir-omop-ig/input/maps/Allergy.fml) (51 строк) | FML. Substance code → observation_concept_id+source_value+source_concept_id. Reaction.manifestation → value_as_concept_id+value_source_value. Patient/encounter/provider — TODO comments. |
| omoponfhir | [`OmopAllergyIntolerance.java:350–449`](../../refs/refs/omoponfhir-omopv5-r4-mapping/src/main/java/edu/gatech/chai/omoponfhir/omopv5/r4/mapping/OmopAllergyIntolerance.java) | Java, **category-driven**: food→4188027, medication→439224, default→40772948. Substance → value_as_concept_id. type=38000280 (legacy). |
| FhirToCdm | [`FhirToCdmMappings.cs:453–480`](../../refs/refs/FhirToCdm/FhirToCdmMappings.cs) | Direct vocab lookup на code. recordedDate. type=32817. |
| fhir-to-omop-demo | [`AllergyIntolerance.jq`](../../refs/refs/fhir-to-omop-demo/demo/translate/map/AllergyIntolerance.jq) | **Divergent**: maps в `condition_occurrence`, не observation. |

## 3. Side-by-side

| OMOP column | Наш | IG fml | omoponfhir | FhirToCdm |
|---|---|---|---|---|
| `observation_id` | `referenceToId(v.id)` | TODO | sequence | sequence |
| `person_id` | `referenceToId(subject_ref)` | TODO | resolve | personIds |
| `observation_concept_id` | **substance std concept** (Maps to) | substance code | **category-based** (food/medication/default) | substance |
| `observation_date` | `COALESCE(recorded_date, onset_dt)::date` ⚠️ | onset:dt | onset > recordedDate fallback | recordedDate |
| `observation_datetime` | same | onset:dt | same | — |
| `observation_type_concept_id` | `32817` | — | `38000280` | `32817` |
| `value_as_concept_id` | **substance std concept (= observation_concept_id)** | reaction.manifestation code | substance | substance |
| `value_as_string` | **NULL** ⚠️ | — | — | — |
| `value_source_value` | `left(v.code_text, 50)` | reaction.manifestation code | — | — |
| `qualifier_source_value` | `v.status_code` (clinicalStatus!) ⚠️ | — | — | — |
| `provider_id` | **NULL** | — | recorder | — |
| `visit_occurrence_id` | `referenceToId(v.encounter_ref)` | — | — | — |
| `observation_source_value` | `left(r.src_code, 50)` | substance code | — | — |

## 4. Различия

### 4.1. Date fallback inverted vs edge JSON spec
Edge JSON [строка 89](../edges/AllergyIntolerance__observation.json):
```
fhir_path: "AllergyIntolerance.onsetDateTime | AllergyIntolerance.onsetPeriod.start | AllergyIntolerance.recordedDate"
transform: "dateTime -> date; fallback chain: onsetDateTime -> onsetPeriod.start -> recordedDate"
```

SQL [строка 32](../etl/AllergyIntolerance__observation.sql): `COALESCE(v.recorded_date, v.onset_dt)::date` — **recordedDate первый**. Полностью обратный приоритет.

Edge JSON `narrative_md` тоже обещает onset > recordedDate. **Spec ≠ impl** обратное.

Что правильнее семантически? `onsetDateTime` = когда реакция началась клинически. `recordedDate` = когда clinician записал. Для OMOP `observation_date` обычно хотят дату клинического события, не записи. **IG fml тоже использует только onsetDateTime** (без recordedDate fallback).

> **Action [HIGH]:** изменить SQL на `COALESCE(v.onset_dt, v.recorded_date)` — `onset` приоритет. Либо обновить spec.

### 4.2. View не извлекает `onsetPeriod.start`
View имеет только `onset_dt: onset.ofType(dateTime)`. **Не извлекает** `onset.ofType(Period).start`, обещанное edge JSON.

Synthea AllergyIntolerance обычно эмитит только `onsetDateTime`, не Period — в когорте не активируется. Но spec обещает поддержку. **Spec ≠ impl**.

> **Action [MED]:** добавить `onset_period_start: onset.ofType(Period).start` колонку во view + использовать в SQL COALESCE.

### 4.3. `value_as_string` всегда NULL despite spec
Edge JSON [строки 205–211](../edges/AllergyIntolerance__observation.json):
```
"value_as_string": {
  "fhir_path": "AllergyIntolerance.reaction[*].manifestation[*].text",
  "transform": "Concatenate all reaction manifestation display names, semicolon-separated."
}
```

View **не извлекает** reaction.manifestation. SQL пишет `NULL::varchar AS value_as_string`. **Spec обещает rich impl, SQL делает nothing.**

> **Action [MED]:** добавить `manifestation_text` в view (`reaction.manifestation.coding.display.join('; ')` или similar), писать в value_as_string.

### 4.4. `qualifier_source_value = clinicalStatus`, не type как в spec
Edge JSON [строка 263](../edges/AllergyIntolerance__observation.json) обещает `qualifier_source_value = AllergyIntolerance.type` ("allergy" / "intolerance"). SQL [строка 46](../etl/AllergyIntolerance__observation.sql) пишет **`v.status_code`** — это `clinicalStatus.coding.first().code` (active/inactive/resolved).

**Spec ≠ impl, разные поля.**

View вообще не извлекает `AllergyIntolerance.type`. Также не извлекает `criticality` (которое edge JSON `value_source_value` обещает).

> **Action [MED]:** добавить во view `type_code: type` и `criticality_code: criticality`. Использовать `type` для qualifier_source_value (как spec), `criticality` для value_source_value.

### 4.5. Substance = both observation_concept_id and value_as_concept_id
SQL [строки 31, 37](../etl/AllergyIntolerance__observation.sql):
```sql
r.std_concept_id AS observation_concept_id,
...
r.std_concept_id AS value_as_concept_id,  -- substance IS the value
```
Это дублирование — substance в обоих полях. Семантически: "what was observed = allergy; what value = the substance".

IG fml согласен (substance → observation_concept_id). omoponfhir разделяет (category → observation_concept_id, substance → value_as_concept_id) — более чистая семантика.

> **Note:** наш подход совместим с IG. omoponfhir отдельно — другая школа. Оставить как есть, но документировать.

### 4.6. `code_rxnorm` extracted but rarely used
View [строка 27](../views/AllergyIntolerance__observation.view.json) extracts RxNorm. SQL [строка 11](../etl/AllergyIntolerance__observation.sql) использует. Synthea AllergyIntolerance иногда эмитит RxNorm для drug allergies — поддержка корректна.

### 4.7. WHERE-фильтр verification_status, но не clinicalStatus
SQL [строка 53](../etl/AllergyIntolerance__observation.sql):
```sql
WHERE COALESCE(v.verify_status, 'confirmed') NOT IN ('entered-in-error', 'refuted')
```
Фильтрует только по verificationStatus. Edge JSON `vocabularies[clinicalStatus_filtering]` обещает skip для `inactive`/`resolved`. **Не делаем**.

Synthea AllergyIntolerance вероятно всегда `clinicalStatus=active`, так что не активируется. Но spec gap.

> **Action [LOW]:** добавить `AND COALESCE(v.status_code, 'active') = 'active'` в WHERE.

### 4.8. `provider_id` всегда NULL despite spec
Edge JSON обещает `coalesce(asserter, recorder)`. SQL пишет `NULL::bigint`. **Не реализовано.**

> **Action [LOW]:** view не извлекает asserter/recorder. Synthea обычно не emit. Если решим реализовать — добавить.

## 5. Concept resolution

Inline в SQL без cm-таблицы:
- 2 vocabularies (SNOMED + RxNorm) → Maps to → ANY standard concept (нет `domain_id` filter!)

Интересно: **нет domain_id filter** в отличие от Condition/Procedure/Observation siblings. Allergies могут получить concept из любого domain. Это **может быть деффект** — если SNOMED-allergy-code Maps to → drug concept (имя химикалия), мы получим Drug-domain concept в observation_concept_id, что нестрого. Но фактически SNOMED allergy/substance codes обычно Maps to → SNOMED allergy concept (domain=Observation в OMOP).

verified: 116/116 staging → 116/116 output ✅ — все аллергии выживают, никакого filter loss.

## 6. Action items

1. **[HIGH] инвертировать date fallback**: `COALESCE(v.onset_dt, v.recorded_date)` (onset приоритет, как spec и IG).

2. **[MED] реализовать reaction.manifestation → value_as_string** — view + SQL.

3. **[MED] исправить qualifier_source_value на type, не clinicalStatus** + добавить criticality → value_source_value.

4. **[MED] добавить onsetPeriod.start fallback** во view + SQL.

5. **[LOW] добавить clinicalStatus filter** в WHERE.

6. **[LOW] провести анализ — реально ли substance code в observation_concept_id получает Allergy-domain concept**, или иногда уходит в Drug.

## 7. Verification

```
fhir.allergy_intolerance:          116
staging.allergyintolerance_obs:    116
cdm_ours_fhir.observation (allergy): 116  (100% survive)
cdm.observation (allergy-like):    106
```

## 8. Cross-cutting

- **APPEND semantics** — этот SQL APPEND-ит к cdm_ours_fhir.observation (не TRUNCATE). Order-dependent (после Observation_observation). Это пример **non-idempotent multi-edge-to-same-table** pattern. Стоит документировать в `mapspec/etl/` README.
- **No domain filter** here vs strict domain filter в Condition/Procedure/Observation. Inconsistent strategy across edge'ей. Решить policy.
- **Spec drift более серьёзный**: 4 поля в edge JSON обещают content которого нет (value_as_string, qualifier_source_value=type, value_source_value=criticality, provider_id). Допустимый накопленный technical debt.
