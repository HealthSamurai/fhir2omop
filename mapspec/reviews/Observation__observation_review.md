# Observation → observation — review

## 1. Summary

`observation` — для qualitative findings (social history, surveys, lifestyle, activity). Edge **implemented**, sibling к [Observation/measurement](Observation__measurement_review.md). Тот же двух-CTE паттерн (resolve concept + value-as-concept), но domain filter = 'Observation' и читает другой staging view (`obs_obs_view`).

**Validation на 100-Synthea-когорте**:
- staging.obs_obs_view: 39478 (same as obs_meas_view — оба shared базис из 39478 FHIR observations)
- cdm_ours_fhir.observation: **6755 строк**
- cdm.observation (ref): **21339 строк** — **в 3.2 раза больше нашего**
- intersection: **3597** (53% наших, 17% ref)
- only_ours: 3146 (extras)
- only_ref: **17730 (мы теряем)**

**⚠️ Самая большая discrepancy в pipeline до сих пор**: мы теряем **83% observations что есть в ref**.

Главные находки:
1. **17730 observation потеряно** против reference — наш `domain_id='Observation'` filter слишком строгий.
2. **fhir-x-omop documented bug продолжается**: edge JSON упоминает `type_concept_id LOINC=32817, SNOMED=32818` — но 32818 это "EHR administration record" (Type Concept, S), не correct ни для LOINC ни для SNOMED. Bug в fhir-x-omop коде.
3. **IG `Observation.fml`** — категории `social-history|imaging|survey|exam|therapy|activity|procedure` идут в observation. У нас в edge JSON `domain_routing` только `social-history|survey|activity` идут в observation. **Несовместимое определение** — IG относит больше категорий к observation, чем мы.
4. Shared view pattern с measurement — те же 2 CTE-структуры.

## 2. Reference inventory

| Ref | File | Подход |
|---|---|---|
| **fhir-omop-ig** | [`Observation.fml`](../../refs/refs/fhir-omop-ig/input/maps/Observation.fml) (52 строк) | FML с WHERE-фильтром: `social-history|imaging|survey|exam|therapy|activity|procedure`. Тот же type-violation pattern. |
| omoponfhir | [`OmopObservation.java:1142–1390`](../../refs/refs/omoponfhir-omopv5-r4-mapping/src/main/java/edu/gatech/chai/omoponfhir/omopv5/r4/mapping/OmopObservation.java) `constructOmopObservation` | Full vocab. |
| ETL-German | [`ObservationMapper.java:542–692`](../../refs/refs/ETL-German-FHIR-Core/src/main/java/org/miracum/etl/fhirtoomop/mapper/ObservationMapper.java) | LoincStandardDomainLookup driven routing — **domain wins over category**. |
| fhir-to-omop-demo | [`Observation.jq:31–44`](../../refs/refs/fhir-to-omop-demo/demo/translate/map/Observation.jq) | jq, domain-based routing **excluding** Condition/Drug/Measurement/Procedure. |
| HealthcareLakeETL | [`observation.py`](../../refs/refs/HealthcareLakeETL/mappings/observation.py) | PySpark, valueCC.text → value_as_string. |
| fhir-x-omop | [`observation.py`](../../refs/refs/fhir-x-omop/fhir_x_omop/to_omop/observation.py) | switch по vocab URL: LOINC=32817, SNOMED=**32818** (wrong!). |

## 3. Side-by-side (краткий — повторяет measurement)

| OMOP column | Наш | Особо отличается |
|---|---|---|
| `observation_id` | `referenceToId(v.id)` | — |
| `observation_concept_id` | shared CTE → domain='Observation' | omoponfhir DB lookup, German LoincStandardDomainLookup |
| `observation_date/datetime` | `COALESCE(effective_dt, period_start)::date` (no UTC norm) | German добавляет `issued` fallback |
| `observation_type_concept_id` | **`32817`** | omoponfhir category-based, fhir-x-omop URL-based (with buggy 32818) |
| `value_as_number` | `v.value_number` | same |
| `value_as_string` | `left(v.value_string, 60)` | (the only OMOP table where this is a field — measurement doesn't have it) |
| `value_as_concept_id` | second CTE Maps-to | full lookup elsewhere |
| `qualifier_source_value` | `left(v.qualifier_code, 50)` | — |
| `qualifier_concept_id` | **`NULL::integer`** (no map даже declared in edge JSON `concept_maps`) | omoponfhir maps |
| `unit_concept_id` | UCUM LEFT JOIN | full |
| `provider_id` | `referenceToId(performer_id)` first | — |
| `visit_occurrence_id` | `referenceToId(encounter_id)` | — |
| `observation_source_value` | `left(COALESCE(code_value, code_text), 50)` | — |
| `observation_source_concept_id` | `src.concept_id` | — |
| `value_source_value` | `left(v.value_text, 50)` | — |

## 4. Различия

### 4.1. ⚠️⚠️ Massive data loss vs reference (only_ref=17730)
17730 наблюдений есть в ref которые отсутствуют у нас. 17 раз больше missing чем в Observation/measurement (245).

Гипотезы:
- **Reference loader (`load-cdm-reference.ts`) обрабатывает observations.csv напрямую** без strict domain filter, поэтому ВСЁ из CSV (social history, surveys, vitals если они там) идёт в `cdm.observation`.
- Наш SQL фильтрует по `domain_id='Observation'`, что отсекает Measurement-domain коды (которые идут в sibling) И **observations с unknown domain_id**.
- Synthea имеет много `survey`/`social-history` observations с LOINC-кодами, которые могут иметь domain=`Measurement` (например `BMI Z-score` или height/weight may be measurement по OMOP) — теряются.

> **Action [HIGH]:** проанализировать **17730 missing** наблюдений — какие LOINC codes? Какой их domain_id в Athena? Это покажет правильный fix.

### 4.2. ⚠️ Category routing incompatible с IG
IG `Observation.fml:12`: `where ('social-history' | 'imaging' | 'survey' | 'exam' | 'therapy' | 'activity' | 'procedure').supersetOf(category.coding.code)` → observation.

Edge JSON `vocabularies[domain_routing]`: только `social-history`, `survey`, `activity` → observation. Остальные (`exam`, `imaging`, `therapy`, `procedure`) — что делает?

Наш SQL **не использует category вообще** — фильтрует только по domain_id. **Spec ≠ impl** (edge JSON describes category routing, SQL doesn't do it).

> **Action [MED]:** либо добавить category filter в SQL, либо удалить `vocabularies[domain_routing]` из edge JSON.

### 4.3. `qualifier_concept_id` всегда NULL, despite declared concept_map
Edge JSON [строка 11–13](../edges/Observation__observation.json):
```json
"concept_maps": ["interpretation"]
```
И `vocabularies[interpretation]` блок с 6 кодами (H/L/N/A/HH/LL). Но **`cm.interpretation` не существует** в БД (нет в profiles/*.cm.json). SQL пишет `NULL::integer` жёстко. **Spec обещает, impl не делает**.

> **Action [MED]:** либо создать `mapspec/profiles/interpretation.cm.json` с маппингами на Athena концепты (H=4172701 'High', L=4267416 'Low' и т.д.), либо удалить из spec.

### 4.4. fhir-x-omop `32818` для SNOMED — wrong concept
Edge JSON cite: "type_concept_id varies by code system: LOINC=32817, SNOMED=32818". `32818` это "EHR administration record" (Type Concept). Это **не** для SNOMED-as-source. fhir-x-omop баг.

Уже отмечено в Condition review (32818/32819 misuse в коде fhir-x-omop). Стабильный паттерн в этом ref.

### 4.5. Status filtering отсутствует
Edge JSON `edge_cases`: "Status not in {final, amended, corrected} → skip". View не извлекает status, SQL не фильтрует. Аналогично measurement edge.

### 4.6. valueBoolean / valueInteger / valueRatio / valueDateTime / valueTime — не поддерживаются
Edge JSON упоминает только value:Boolean. На самом деле также valueInteger, valueRange, valueRatio, valueTime, valueDateTime — все не в view. Не критично для Synthea (qualitative).

### 4.7. Нет UTC normalization
Та же проблема как в measurement sibling — `::date / ::timestamp` без `AT TIME ZONE`.

## 5. Concept resolution

Те же таблицы что Observation/measurement:
- `cm.fhir_system_to_omop_vocab` (12 entries)
- inline `vocab.concept` Maps-to walk
- Domain filter = 'Observation' (отличие от measurement)
- UCUM unit lookup

`cm.interpretation` — **обещано, не материализовано**. Нет файла `mapspec/profiles/interpretation.cm.json`.

## 6. Action items

1. **[HIGH] исследовать 17730 missing observations** — выяснить почему ref имеет в 3x больше observation-строк. Вероятно нужен fallback "if no domain_id match, route by category" или просто более широкий filter.

2. **[MED] синхронизировать category routing** между edge JSON `vocabularies[domain_routing]` и SQL. Сейчас edge JSON описывает 6 категорий, SQL не использует category вообще.

3. **[MED] реализовать или удалить `cm.interpretation`** — qualifier_concept_id всегда NULL.

4. **[MED] UTC normalization** для consistency.

5. **[MED] status filter** — добавить.

6. **[LOW] valueBoolean/Integer/Range/Ratio/etc.** поддержка.

## 7. Verification

```
staging.obs_obs_view:           39478 (shared with measurement)
cdm_ours_fhir.observation:      6755 (17% of staging)
cdm.observation (ref):          21339 (3.2x ours!)

Diff:
  intersect:    3597 (17% of ref, 53% of ours)
  only_ours:    3146
  only_ref:     17730 ← MASSIVE DATA LOSS
  
type_concept_id: 32817 in both ✅
```

## 8. Cross-cutting

- **Domain-routing leak самая большая** в Observation/observation. Cross-edge паттерн (Condition 78% loss, Procedure 43%, Measurement 2%, Observation 83%). Нужен общий fix domain-routing strategy.
- **`qualifier_concept_id`** — паттерн "edge JSON declares concept_map but cm.* не материализован". Стоит проверить во всех edge'ях с `concept_maps`.
- **fhir-x-omop hardcoded concept_ids are systematically wrong** (32818, 32819, 32896, 32897) — не использовать как референс концепт-маппингов.
