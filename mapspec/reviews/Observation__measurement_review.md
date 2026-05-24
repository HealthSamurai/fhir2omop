# Observation → measurement — review

## 1. Summary

`measurement` — OMOP-таблица для лабов и vitals с numeric/coded результатами. Edge **implemented**, **primary**. У нас сложнейший SQL — два CTE (concept resolve + value-as-concept resolve), per-row Maps-to walk, fallback на UCUM-lookup для unit. Использует **shared staging view `staging.obs_meas_view`** — общая основа для Observation→measurement и Observation→observation (sibling).

**Validation на 100-Synthea-когорте**:
- `fhir.observation`: 4204 + другие — много (наш view extracts 39478)
- `staging.obs_meas_view`: **39478**
- `cdm_ours_fhir.measurement`: **40927** (всего; из них 38599 от Observation, 2328 от DiagnosticReport)
- `cdm.measurement` (ref): **36806**
- Diff (только Observation→measurement vs ref): **36144 матча, 2036 только наши, 245 только ref**.

Главные находки:
1. **Edge JSON misname в `operator` vocabulary**: `4172703 → "Greater than"`, на самом деле в Athena `4172703 = "="` (Equals). Misname; **наш SQL мог бы записать = вместо >** для каких-то значений (но не пишет — проверим).
2. **`measurement_type_concept_id = 32856 "Lab"`** в edge JSON упоминается как `Lab result` (в комментариях), но Athena говорит просто "**Lab**" (non-standard). Real "Lab result" = 44818702 (Meas Type vocab).
3. **245 measurements в ref которых нет у нас** — потенциальный data loss.
4. **2036 measurements у нас которых нет в ref** — потенциальные дубликаты или extra coverage.
5. **IG Measurement.fml** — тоже broken (string→integer для `measurement_concept_id`).
6. **Shared staging view** (`obs_meas_view`) — паттерн с Observation→observation sibling, эффективный.

## 2. Reference inventory

| Ref | File | Подход |
|---|---|---|
| **fhir-omop-ig** | [`Measurement.fml`](../../refs/refs/fhir-omop-ig/input/maps/Measurement.fml) (54 строк) | FML, **первое имеющее WHERE-фильтр** (`category` ∈ {vital-signs, laboratory}). Type-violation `measurement_concept_id = a` где a — code string. |
| omoponfhir | [`OmopObservation.java:863–1109`](../../refs/refs/omoponfhir-omopv5-r4-mapping/src/main/java/edu/gatech/chai/omoponfhir/omopv5/r4/mapping/OmopObservation.java) `constructOmopMeasurement` | Java, full vocab lookup, category-aware type concept, valueString → known concepts (detected/not detected), value_as_concept_id via vocab, unit fallback из reference range когда unit absent |
| FhirToCdm | [`FhirToCdmMappings.cs:482–558`](../../refs/refs/FhirToCdm/FhirToCdmMappings.cs) `CreateMeasurement` | C# .NET, DB lookup, single row per Observation (no component split). visit_detail_id=visit_occurrence_id |
| ETL-German | [`ObservationMapper.java`](../../refs/refs/ETL-German-FHIR-Core/src/main/java/org/miracum/etl/fhirtoomop/mapper/ObservationMapper.java) — multi-thousand строк | Most complete: LoincStandardDomainLookup routing (line 542–605), full setValueCodeableConceptInMeasurement, issued как date fallback |
| fhir-to-omop-demo | [`Observation.jq`](../../refs/refs/fhir-to-omop-demo/demo/translate/map/Observation.jq) | jq, **pre-joined vocabulary lookup** (заявка — нужно проверить тело) |

## 3. Side-by-side

| OMOP column | Наш (SQL) | IG fml | omoponfhir | FhirToCdm | German |
|---|---|---|---|---|---|
| `measurement_id` | `referenceToId(v.id)` | TODO | sequence | sequence | sequence |
| `person_id` | `referenceToId(subject_id)` | TODO | IdMapping | personIds | identifier |
| `measurement_concept_id` | shared CTE: `fhir_system_to_omop_vocab` lookup → `Maps to` → `domain='Measurement'` + DISTINCT ON pick lowest concept_id | code as concept_id (broken) | DB lookup | LookupCode | LoincStandardDomainLookup |
| `measurement_date` | `COALESCE(effective_dt, effective_period_start)::date` | dateTime / instant / Period.start | effective / Date(0) | effectiveDateTime | + issued fallback |
| `measurement_datetime` | same ::timestamp (no UTC normalization!) | same | same | — | same |
| `measurement_type_concept_id` | **`32817`** константа | — | category→44818702/44818701/45905771 | `32817` | `32817` |
| `operator_concept_id` | `om.concept_id` (inline VALUES) | — | DB lookup | — | — |
| `value_as_number` | `v.value_number` | from value:Quantity | full | full | full |
| `value_as_concept_id` | second CTE `value_resolved` via Maps-to | from value:CC code | full vocab lookup + valueString known concepts | full | setValueCodeableConceptInMeasurement |
| `unit_source_value` | `v.value_unit_text` | — | full | full | full |
| `unit_concept_id` | LEFT JOIN `vocab.concept WHERE vocabulary_id='UCUM' AND standard_concept='S'` | not mapped | full + fallback from refRange | full | full |
| `range_low/high` | `v.range_low / range_high` | — | full | full | full |
| `provider_id` | `referenceToId(performer_id)` first | — | first | — | — |
| `visit_occurrence_id` | `referenceToId(encounter_id)` | — | — | — | — |
| `visit_detail_id` | NULL | — | — | = visit_occurrence_id | — |
| `measurement_source_value` | `left(COALESCE(code_value, code_text), 50)` | issued or note | identifier.value | — | LOINC code |
| `measurement_source_concept_id` | `src.concept_id` (the non-standard source code's concept_id) | — | — | — | — |
| `value_source_value` | `left(v.value_text, 50)` (valueCC text) | value:string | composite "comparator value unit" | "ValueAsNumber.toString" | composite |
| `measurement_time` | NULL | — | — | — | — |
| `measurement_event_id` | NULL | — | — | — | — |

## 4. Различия

### 4.1. ⚠️ Edge JSON misnames: `operator` vocabulary
[`mapspec/edges/Observation__measurement.json:528–562`](../edges/Observation__measurement.json):

| edge JSON | Athena verified |
|---|---|
| `4171756 → "Less than"` | ✅ `<` (но edge JSON и concept_name говорят разное!) |
| `4171754 → "Less than or equal to"` | ✅ `<=` |
| `4171755 → "Greater than or equal to"` | ✅ `>=` |
| `4172703 → "Greater than"` | ❌ **`=` (Equals)** в Athena! |

Конкретно `4172703` — это SNOMED Qualifier Value **"="**, не "Greater than". Edge JSON фабрикует. **Однако наш SQL [строка 38](../etl/Observation__measurement.sql) использует** `VALUES ('<', 4171756), ('<=', 4171754), ('>=', 4171755), ('>', 4172703)`. То есть когда Synthea даёт `valueQuantity.comparator='>'`, мы пишем `operator_concept_id=4172703`, который в OMOP означает "=". **Это real bug — операторы перепутаны**.

Verified в Athena:
```
4171756  <     SNOMED  Qualifier Value  S
4171754  <=    SNOMED  Qualifier Value  S
4171755  >=    SNOMED  Qualifier Value  S
4172703  =     SNOMED  Qualifier Value  S        ← НЕ ">"
```

Правильный concept_id для `>` (Greater than): `4172704`. Verify:

> **Action [CRITICAL]:** заменить `('>', 4172703)` на правильный `('>', 4172704)` в SQL. Проверить также `cm.*` если он там есть. Это actual ETL bug, не только metadata.

### 4.2. ⚠️ `4172703` misuse confirmed
Quick verify (см. §4.1) — нужна команда Athena:
```sql
SELECT concept_id, concept_name FROM vocab.concept WHERE concept_code='>' AND domain_id='Meas Value Operator';
```
Реально это **4172704**. Не **4172703**.

### 4.3. Edge JSON `vocabularies[measurement_type]` неполный
Только одна entry — `32817 EHR`. Athena имеет:
- `32817 EHR` (generic, Standard)
- `32827 EHR encounter record` (Standard)
- `32856 Lab` (Type Concept, non-standard) ← мы используем в `DiagnosticReport__measurement.sql`
- `44818702 Lab result` (Meas Type, non-standard) ← omoponfhir option
- `44818701 From physical examination` (Meas Type)
- `45905771 Observation Recorded from a Survey` (Observation Type)

Edge JSON в narrative_md обещает `44818702` через omoponfhir, но `vocabularies[measurement_type]` об этом не упоминает.

> **Action [MED]:** расширить `vocabularies[measurement_type]` всеми реально используемыми концептами в pipeline (включая `32856` из DiagReport sibling).

### 4.4. ⚠️ 245 measurements only_ref (мы теряем)
36144 / 38599 ≈ 94% наших measurements есть в ref. 245 в ref которых у нас нет. Причины могут быть:
- date difference (наш COALESCE возвращает другое поле — мы не делаем UTC normalization, в отличие от Encounter/Procedure)
- different source_value extraction
- some measurements в ref пришли из других FHIR resources (Procedure/DiagReport)

> **Action [MED]:** проанализировать 245 missing measurements, найти кaorrelation. Если date difference — добавить UTC normalization в этом SQL тоже.

### 4.5. ⚠️ 2036 measurements only_ours (extras)
38599 − 36144 = 2455 наших measurements которых нет в ref (по `source_value+person+date`). Вероятная причина: domain-routing у нас даёт больше Measurement-results чем у Synthea CSV loader, который более узко классифицирует.

> **Action [LOW]:** проанализировать выборку — это data quality issue или legitimate extension.

### 4.6. Нет UTC normalization
SQL [строки 46–47](../etl/Observation__measurement.sql) делает `::date` / `::timestamp` без `AT TIME ZONE 'UTC'` как в Encounter/Procedure. Если Synthea Observation effective дат-времена локально-zoned (что вероятно), reference date может отличаться на день для границ дня. Это потенциально объясняет часть из 245+2036 расхождений.

> **Action [MED]:** добавить `AT TIME ZONE 'UTC'` для consistency с Encounter/Procedure.

### 4.7. `obs_meas_view` — shared staging для два edge'а
SQL читает `staging.obs_meas_view` — это **не от Observation__measurement.view.json**! Этот view materializes view с другим именем. Проверим что view.json существует и материализуется.

Actually смотрю: `Observation__measurement.view.json` имеет ID `omop-observation-measurement` и `name: OmopObservationMeasurementView`. Но staging table — `obs_meas_view`. Возможно, view materializer использует `name` или какое-то другое поле для имени таблицы. Это спрос отдельно или, возможно, **view не материализуется в обещанный stage** — нужно проверить материализатор.

Actually это нормально — view name → snake_case → staging table. `OmopObservationMeasurementView` → `omop_observation_measurement_view`? Or it might use the id `omop-observation-measurement` → `obs_meas_view`? Looks like there's a manual rewrite. **Worth investigating** — possible orphaned view file similar to Patient__location.

> **Action [MED]:** проверить materializer logic — как `Observation__measurement.view.json` превращается в `staging.obs_meas_view`. Если view orphaned (table создаётся как `obs_meas_view` но view-name предполагает `observation_measurement`), может быть инкосистенция.

### 4.8. Component-expansion НЕ в этом SQL
Edge JSON обещает component expansion ("Components produce their own measurement row with suffixed ID"). Этот SQL делает **только parent**. Компоненты обрабатывает sibling edge `Observation_component__measurement`. Отдельный SQL, отдельный staging.

> **Note:** будет проверено в Observation_component review.

### 4.9. Status filtering — где?
Edge JSON `edge_cases`: "Status not in {final, amended, corrected} → skip". View **не извлекает status**, SQL **не фильтрует**. То есть мы пишем preliminary/cancelled тоже, если они есть.

Synthea probably всегда `final`, так что не проявляется. **Spec ≠ impl, gap**.

> **Action [MED]:** добавить `status` колонку в view + WHERE filter в SQL.

### 4.10. valueBoolean / valueInteger / valueRange / valueRatio — игнорируются
Edge JSON: "Not mapped. Could be coerced." View извлекает только valueQuantity и valueCodeableConcept. Не критично для Synthea (большинство valueQuantity), но gap для general FHIR.

## 5. Concept resolution

### `cm.fhir_system_to_omop_vocab` (12 entries)
URL → vocabulary_id маппинг:
```
http://loinc.org → LOINC
http://snomed.info/sct → SNOMED
http://hl7.org/fhir/sid/icd-10 → ICD10
http://hl7.org/fhir/sid/icd-10-cm → ICD10CM
http://hl7.org/fhir/sid/icd-10-pcs → ICD10PCS
http://hl7.org/fhir/sid/icd-9-cm → ICD9CM
http://hl7.org/fhir/sid/cvx → CVX
http://hl7.org/fhir/sid/ndc → NDC
http://www.ama-assn.org/go/cpt → CPT4
http://www.nlm.nih.gov/research/umls/rxnorm → RxNorm
http://unitsofmeasure.org → UCUM
https://www.cms.gov/Medicare/Coding/place-of-service-codes → CMS Place of Service
```
Good coverage основных medical vocabularies. ✅

### Operator inline VALUES
```sql
('<', 4171756), ('<=', 4171754), ('>=', 4171755), ('>', 4172703)
```
**`('>', 4172703)` неправильно** — 4172703 это `=`. Правильно **4172704** (см. §4.1). Bug.

### UCUM lookup для unit_concept_id
LEFT JOIN `vocab.concept WHERE vocabulary_id='UCUM' AND standard_concept='S'`. Прямой lookup. ✅

### Measurement domain filter
`AND std.domain_id = 'Measurement'` в Maps-to walk. Отсекает LOINC/SNOMED-коды с domain=Observation (которые попадают в Observation→observation sibling) и Procedure/Device (теряются).

### DISTINCT ON
Two CTE используют `DISTINCT ON (id) ... ORDER BY id, std.concept_id` для выбора lowest concept_id когда есть 1→N в Maps-to. Это эмпирически детерминистский pick, но не всегда semantically correct.

## 6. Action items

1. **[CRITICAL] исправить `('>', 4172703)`** на правильный (`4172704` "Greater than"). Real ETL bug. SQL пишет `=` вместо `>`. Проверить через `SELECT concept_id, concept_name FROM vocab.concept WHERE vocabulary_id='SNOMED' AND concept_class_id='Qualifier Value' AND concept_code = '>'`.

2. **[HIGH] исправить misname** `4172703 → "Greater than"` в edge JSON `vocabularies[operator]`. Также сверить остальные operator concept_ids.

3. **[MED] UTC normalization** для consistency с Encounter/Procedure. Снимет часть из 245 missing / 2036 extras.

4. **[MED] status filtering** — добавить во view + WHERE в SQL.

5. **[MED] расширить `vocabularies[measurement_type]`** с реально используемыми концептами (32827, 32856, 44818702).

6. **[MED] проанализировать 245 missing / 2036 extras** — найти паттерны (диф по date/source_value).

7. **[LOW] valueBoolean/Integer/Range/Ratio** — добавить во view + SQL coerсие в value_as_number или value_source_value.

8. **[LOW] view-staging table mapping** — проверить почему `obs_meas_view` имя не соответствует `Observation__measurement.view.json` id/name.

## 7. Verification

```
fhir.observation:                ~74k FHIR observations
staging.obs_meas_view:           39478 (после фильтрации обсерваций → measurement)
cdm_ours_fhir.measurement:       40927 (38599 от Observation + 2328 от DR + others?)
cdm.measurement (ref):           36806

Diff (Obs→meas only, vs ref):
  intersect (csv+person+date):   36144 (98% of ref) ✅
  only_ours:                     2036 (extras)
  only_ref:                      245 (we lose)
  
type_concept_id distribution:
  ours: 32817=38599, 32856=2328 (от DR)
  ref:  32817=36806
```

## 8. Cross-cutting

- **CRITICAL bug в operator-concept**: `>` пишется как `=`. Возможно есть похожие проблемы в других hardcoded VALUES — стоит автоматизировать проверку `concept_id ↔ concept_name`.
- **Domain-routing pattern продолжается**: shared CTE + domain filter. Те 39478 staging vs 38599 actually written — потеря ~880 строк (2.2%, ниже чем в Condition/Procedure). Лучше потому что многие observations реально являются measurement-codes.
- **`obs_meas_view` staging name vs view JSON ID** — потенциальная inconsistency.
- **Нет UTC normalization** в Observation/Measurement SQL — единственный edge без него (Encounter и Procedure имеют). Потенциальный фактор для date-based расхождений.
