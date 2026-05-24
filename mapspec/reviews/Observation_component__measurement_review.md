# Observation_component → measurement — review

## 1. Summary

Sibling edge к [Observation/measurement](Observation__measurement_review.md), который **раскрывает `Observation.component[]`**. Canonical case — blood pressure: parent Observation с LOINC `85354-9` (BP panel) и двумя components `8480-6` (systolic) + `8462-4` (diastolic). Без этого edge components тихо терялись.

**Validation**:
- `staging.observation_component_measurement`: **21229 строк** (компонентов в Synthea — куда больше чем edge JSON narrative предполагал "~2,650")
- В `cdm_ours_fhir.measurement` от component fan-out: **3586 строк**
- В reference `cdm.measurement`: 1793 систолических + 1793 диастолических = **3586 BP-component строк** ✅
- Plus у нас 1793 строки **parent BP panel (85354-9)** — из Observation_measurement sibling — которых **нет в ref**.

Главные находки:
1. **21229 components → 3586 output** = 17643 components dropped (83% filtering loss): из-за `component_code_loinc IS NOT NULL AND component_value_num IS NOT NULL` + `domain_id='Measurement'`.
2. **Parent BP panel (85354-9) пишется**, но не в reference. Это **те самые 1793 "only_ours" из Observation_measurement review** — теперь понятно откуда.
3. Edge JSON narrative обещает "~2,650 Observations with component" — реально 21229 components, **в 8 раз больше**. Spec stale.
4. SQL **жёстко filtered только по LOINC** — SNOMED component codes теряются.

## 2. Reference inventory

| Ref | File | Подход |
|---|---|---|
| **fhir-omop-ig** | (нет fml для component fan-out) | Не специфицирует, edge JSON sub-mentions "this edge fills that gap". |
| omoponfhir | `OmopObservation.java` | Делает component split в reverse-direction (OMOP→FHIR) — не F→O. |
| ETL-German | `ObservationMapper.java` | Имеет component handling, но через отдельный pathway не split. |
| FhirToCdm | `FhirToCdmMappings.cs` | **Не делает component split** — BP теряется как 2 значения. |

## 3. Side-by-side

| OMOP column | Наш | Заметки |
|---|---|---|
| `measurement_id` | `hashtextextended(v.id || '/' || component_code_loinc, 0)::bigint` | Уникально по (Observation.id, component_code). ✅ |
| `person_id` | `referenceToId(subject_id)` | inherited from parent Observation |
| `measurement_concept_id` | LOINC → Maps to → domain='Measurement' (inner JOIN) | drops non-Measurement-domain components |
| `measurement_date/datetime` | `COALESCE(effective_dt, period_start)::date` | inherited from parent |
| `measurement_type_concept_id` | `32817` константа | same as parent measurement |
| `operator_concept_id` | NULL | components не используют comparator в нашем view |
| `value_as_number` | `v.component_value_num` | ✅ |
| `value_as_concept_id` | NULL | components с coded values не поддерживаются |
| `unit_concept_id` | UCUM LEFT JOIN | ✅ |
| `range_low/high` | NULL | reference range не унаследован |
| `provider_id`, `visit_occurrence_id` | inherited | ✅ |
| `measurement_source_value` | `left(COALESCE(component_code_loinc, component_code_text), 50)` | |
| `measurement_source_concept_id` | LOINC concept_id | |
| `value_source_value` | NULL | unlike parent edge |

## 4. Различия

### 4.1. Огромный filter loss: 21229 → 3586 (83%)
SQL [строки 33–49](../etl/Observation_component__measurement.sql):
- `JOIN vocab.concept src ON src.vocabulary_id = 'LOINC'` — **только LOINC** components
- `JOIN vocab.concept_relationship rel ... Maps to` — должны иметь Maps to relationship
- `JOIN vocab.concept std ... domain_id='Measurement'` — только Measurement-domain
- `WHERE component_code_loinc IS NOT NULL AND component_value_num IS NOT NULL`

Hard inner joins выбрасывают: SNOMED components, components без `Maps to`, components с не-Measurement domain (могли бы быть Observation), components без value (текстовые).

Это объясняет огромный drop, но **не все 17643 потерянные components — действительно мусор**. Многие — components с domain='Observation' (например categorical responses) — должны бы идти в `observation`, не отбрасываться.

> **Action [HIGH]:** добавить sibling SQL `Observation_component__observation.sql` для components с domain='Observation'. Сейчас отдельный edge не существует.

### 4.2. ⚠️ Parent BP panel (85354-9) пишется в measurement
В обоих наших и ref только systolic+diastolic (3586 = 1793+1793). Но мы **также пишем 1793 parent rows** (85354-9). Это происходит в **Observation_measurement.sql** (sibling), который не знает про component split. 

Проблема: parent BP panel **не имеет valueQuantity** (только children имеют), так что value_as_number=NULL, что бесполезно. Эти 1793 parent rows — потенциально лишние.

> **Action [MED]:** в Observation_measurement.sql добавить filter `AND v.value_number IS NOT NULL` — отбросить rows без значений (parent containers).

### 4.3. Edge JSON narrative stale
"Synthea emits ~2,650 Observations with `component`" — реально 21229 components в staging (= 21229/2 ≈ 10000+ observations? или 2,650 observations × ~8 components avg).

> **Action [LOW]:** обновить narrative count.

### 4.4. Дедупликация — несколько `(parent_id, component_code)` пар при дубликатах
Если одна Observation эмитит два component с одинаковым LOINC code (теоретически), наш hash будет коллизионный. Проверять: `SELECT id, component_code_loinc, count(*) FROM staging.observation_component_measurement GROUP BY 1,2 HAVING count(*)>1`.

> **Action [LOW]:** проверить, есть ли коллизии. Если есть, добавить component-index в hash.

## 5. Concept resolution

`vocab.concept` direct LOINC lookup → Maps to → domain='Measurement'. Same pattern как Observation_measurement, но **только LOINC** (не SNOMED, не CPT).

UCUM unit LOINC lookup — same.

## 6. Action items

1. **[HIGH] sibling Observation_component__observation.sql** — components с domain='Observation' сейчас теряются. Завести 30-й edge.

2. **[MED] filter parent BP panel out of Observation_measurement** — `WHERE v.value_number IS NOT NULL` или эквивалент. Снимет 1793 useless parent rows.

3. **[MED] поддержка SNOMED components** — добавить SNOMED ветку в SQL (как в Observation_measurement через cm.fhir_system_to_omop_vocab).

4. **[LOW] verify hash collisions** для дубликатов component_code в одном parent.

5. **[LOW] обновить narrative count**.

## 7. Verification

```
staging.observation_component_measurement: 21229
cdm_ours_fhir.measurement (от component): 3586

BP-specific:
  ref:    8480-6 (systolic) = 1793, 8462-4 (diastolic) = 1793, no 85354-9
  ours:   8480-6 = 1793, 8462-4 = 1793, 85354-9 = 1793 (extra parent!)
```

## 8. Cross-cutting

- **Component fan-out only LOINC** — должен быть generalized как в parent measurement (cm.fhir_system_to_omop_vocab).
- **Parent vs child handling** в FHIR Observations с component — наш sibling pair порождает дубликат parent-row без values. Pattern для других edge'ей где есть hierarchy (DiagnosticReport.result → Observation, например).
