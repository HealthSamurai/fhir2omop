# Procedure → procedure_occurrence — review

## 1. Summary

`procedure_occurrence` — primary, required. У нас edge **documented**, фактически **implemented** через тот же vocabulary-priority+domain-routing паттерн как [Condition→condition_occurrence](Condition__condition_occurrence_review.md). Stage-1 fan-out на 4 vocabulary колонки (SNOMED/CPT4/HCPCS/ICD10PCS), Stage-2 union + `Maps to` walk + domain_id='Procedure' фильтр.

**Validation на 100-Synthea-когорте**:
- staging.procedure_occurrence: **8742 строки**
- cdm_ours_fhir.procedure_occurrence: **4974 строки** (3768 потеряны = 43%)
- cdm.procedure_occurrence: **4974 строки** (та же фильтрация)
- diff JOIN_n=**4998** vs 4974/4974 — **24 строки дублируются** при join по (source_value, person_id, date) — у некоторых процедур повторяющиеся `(code, person, date)` кортежи
- 0 concept_mismatch ✅, всё type_concept_id=32827 (в обоих)

Главные находки:
1. **3768 procedure-кодов теряются** (как в Condition) при фильтрации domain_id='Procedure'. Скрытая domain-routing.
2. **24 строки повторяются** по `(source_value, person_id, date)` — потенциальная проблема дедупа.
3. **SQL не фильтрует по `status`** (preparation/cancelled и т.д. могли бы попасть). View извлекает `status_code`, но не используется. Edge JSON `vocabularies[status_filter]` описывает правила, но они не реализованы.
4. **IG Procedure.fml имеет 2 синтаксические ошибки** в строках 19 и 26 (multi-target assignment без commas).
5. `procedure_type_concept_id=32827` (мы) vs 32817 (edge JSON `constant`) — Spec ≠ impl, как в Condition.

## 2. Reference inventory

| Ref | File | Подход | Тип concept |
|---|---|---|---|
| **fhir-omop-ig** | [`Procedure.fml`](../../refs/refs/fhir-omop-ig/input/maps/Procedure.fml) (29 строк) | FML skeleton + bugs | — |
| omoponfhir | [`OmopProcedure.java:369–513`](../../refs/refs/omoponfhir-omopv5-r4-mapping/src/main/java/edu/gatech/chai/omoponfhir/omopv5/r4/mapping/OmopProcedure.java) | Java bi-direction, no status filter, no body site, no domain routing | **44786630** Primary Procedure (non-standard) |
| FhirToCdm | [`FhirToCdmMappings.cs:407–451`](../../refs/refs/FhirToCdm/FhirToCdmMappings.cs) `CreateProcedureOccurrence` | C# .NET, one row per coding (как Condition) | **32817** EHR |
| ETL-German | [`ProcedureMapper.java:1–1140`](../../refs/refs/ETL-German-FHIR-Core/src/main/java/org/miracum/etl/fhirtoomop/mapper/ProcedureMapper.java) | Java, **самый полный**: OPS/SNOMED/DICOM priority, full domain routing → drug/observation/measurement, body site + OPS extension, **device_exposure из Procedure.usedCode**, status filtering, incremental updates | **32817** EHR (CONCEPT_EHR) |
| NACHC | [`OmopProcedureBuilder.java:1–136`](../../refs/refs/NACHC-fhir-to-omop/src/main/java/org/nachc/tools/fhirtoomop/omop/person/factory/builder/procedure/OmopProcedureBuilder.java) | Java DSTU3, domain routing, defaults | **44786630** |
| fhir-x-omop | [`procedure_occurrence.py`](../../refs/refs/fhir-x-omop/fhir_x_omop/to_omop/procedure_occurrence.py) | Python | **switch по vocab URL**: 32818/32820 |
| HealthcareLakeETL | [`procedure_occurrence.py`](../../refs/refs/HealthcareLakeETL/mappings/procedure_occurrence.py) | PySpark, минимальный, Period.start only | — |

## 3. Side-by-side

| OMOP column | Наш SQL | IG fml | omoponfhir | FhirToCdm | German | fhir-x-omop |
|---|---|---|---|---|---|---|
| `procedure_occurrence_id` | `referenceToId(v.id)` | TODO | IdMapping | sequence | sequence | int |
| `person_id` | `referenceToId(subject_ref)` | TODO | IdMapping | personIds | identifier | int |
| `procedure_concept_id` | union vocabs → `Maps to` → domain='Procedure' | code as concept_id (broken) | OmopConceptToUse | LookupCode multi-row | OPS/SNOMED + routing | **0** hardcoded |
| `procedure_date` | `COALESCE(performed_dt, period_start)::timestamptz AT TIME ZONE 'UTC'::date` | occurrence:dateTime cast | performed | Parse(Period) | period.start или performed.dt | performedDateTime |
| `procedure_datetime` | то же | same | same | same | same | same |
| `procedure_end_date` | `performed_period_end::timestamptz AT TIME ZONE 'UTC'::date` | end | period.end | Period only (fails for dateTime) | period.end only | null |
| `procedure_type_concept_id` | **`32827`** | — | `44786630` | `32817` | `32817` | switch по URL: 32818/32820 |
| `modifier_concept_id` | **`NULL::integer`** (no body site) | — | not mapped | not mapped | SNOMED bodySite + OPS ext | not |
| `quantity` | `NULL::integer` | — | null | — | null | **1** |
| `provider_id` | `referenceToId(performer_ref)` | — | first Practitioner performer | not | first | — |
| `visit_occurrence_id` | `referenceToId(encounter_ref)` | — | — | — | — | — |
| `visit_detail_id` | `NULL::bigint` | — | — | = visit_occurrence_id | — | = visit_occurrence_id |
| `procedure_source_value` | `r.src_code` (best vocab) | — | first coding | each coding | first coding | — |
| `procedure_source_concept_id` | `r.src_concept_id` | code as concept_id (broken) | concept_id | — | concept_id | — |
| `modifier_source_value` | **`NULL::varchar`** | — | — | — | first SNOMED bodySite | — |

## 4. Различия

### 4.1. ⚠️ IG `Procedure.fml` — 2 синтаксические ошибки
[`Procedure.fml`](../../refs/refs/fhir-omop-ig/input/maps/Procedure.fml):
- **Строка 19**: `sc.code as a -> tgt.procedure_concept_id, tgt.procedure_source_value, tgt.procedure_source_concept_id = a` — нельзя так присваивать одну переменную нескольким targets без явного rewriting каждого. Должно быть `tgt.procedure_concept_id = a, tgt.procedure_source_value = a, tgt.procedure_source_concept_id = a`. Получается неполная FML.
- **Строка 26**: `s.end as end -> tgt.procedure_end_datetime, tgt.procedure_end_date = end` — то же самое: `end` присваивается обеим, но синтаксис неверный.

Дополнительно — string→integer присвоение `procedure_concept_id = a` (a это string code). Это semantical bug, не syntax.

IG fml **broken и не должна компилироваться**. Очередное подтверждение: не доверять fml, использовать pagecontent.

### 4.2. ⚠️ Скрытая domain-routing теряет 3768 / 8742 (43%) строк
Как в Condition: `JOIN vocab.concept std ... AND std.domain_id = 'Procedure'`. Только Procedure-domain SNOMED-коды выживают. Остальные 3768 — куда деваются?
- Многие Synthea-процедурные SNOMED-коды на самом деле имеют `domain_id = 'Measurement'` (например лабораторные тесты, BMI/vitals)
- Часть — `Observation`
- Часть — без `Maps to`-relationship

ETL-German делает full routing — drug/observation/measurement. У нас — silent drop. **Reference cdm.* делает то же отбрасывание**, потому что Synthea CSV loader использует похожую логику. Так что diff не показывает проблему, но **3768 строк теряются** на обоих сторонах.

> **Action [HIGH]:** реализовать domain-routing INSERT-ы в observation/measurement из staging.procedure_occurrence для кодов с соответствующими domain_id. Либо логировать.

### 4.3. ⚠️ 24 дублирующиеся строки по `(source_value, person_id, date)`
diff JOIN_n = 4998 vs counts 4974/4974. Это значит 4998 − 4974 = **24 строки имеют дублированные `(csv, person_id, sd)` кортежи** на одной стороне или обеих. Возможные причины:
- одинаковая процедура выполнена дважды в один день (Period vs DateTime для одного и того же)
- multi-coding → multi-row в каком-то другом маппере (но у нас not — мы делаем DISTINCT ON по staging_id)

Однако `DISTINCT ON (c.staging_id)` гарантирует одну resolved-строку на staging row, а staging row — одна на FHIR Procedure (через id PK). Так что multi-row быть не должно… **unless 24 пациента имеют 2 одинаковых процедуры в один день**, что валидно в реальности (например 2 разные процедуры с одинаковым SNOMED кодом в один день).

> **Action [LOW]:** запросить:
> ```sql
> SELECT person_id, procedure_source_value, procedure_date, count(*) 
> FROM cdm_ours_fhir.procedure_occurrence
> GROUP BY 1,2,3 HAVING count(*) > 1;
> ```
> и разобрать — это data fact или ошибка.

### 4.4. SQL не фильтрует по `status`
Edge JSON `vocabularies[status_filter]` (строки 557–602) подробно описывает: `completed` → map, `not-done`/`entered-in-error`/`stopped`/`preparation` → skip. View [`Procedure__procedure_occurrence.view.json:37`](../views/Procedure__procedure_occurrence.view.json) извлекает `status_code`. SQL **не использует**. То есть если Synthea эмитит `preparation` или `entered-in-error` — мы их всё равно пишем.

Synthea-данные: вероятно все `status='completed'`, так что в когорте нет drift. Но **обещание spec'а не выполняется**. Reference тоже не фильтрует (Synthea CSV не имеет status, или используется только completed).

> **Action [MED]:** добавить `WHERE v.status_code IN ('completed', 'in-progress')` в SQL. Иначе при production load с разными statuses пайплайн потенциально загрязнится.

### 4.5. `procedure_type_concept_id = 32827`, edge JSON говорит 32817
Та же проблема что в Encounter/Condition: SQL пишет 32827, JSON `constant: 32817`. Reference cdm.procedure_occurrence тоже 32827 (Synthea convention). **Spec ≠ impl**.

> **Action [HIGH]:** обновить edge JSON `constant: 32827`, добавить entry с правильным concept_name в `vocabularies[procedure_type]`.

### 4.6. `modifier_concept_id` всегда NULL
SQL [строка 51](../etl/Procedure__procedure_occurrence.sql) пишет жёстко `NULL::integer`. View **даже не извлекает** `bodySite` колонку. Edge JSON обещает SNOMED body site lookup. **Не реализовано вообще**.

ETL-German имеет full body site handling. Synthea эмитит bodySite редко, так что не активирует. Но обещание spec'а — не выполнено.

> **Action [MED]:** добавить во view `body_site_snomed: bodySite.first().coding.where(system=%snomedSystem).code.first()`, в SQL добавить дополнительный JOIN на vocab.concept WHERE domain_id='Spec Anatomic Site' (это где body sites живут в OMOP). 

### 4.7. UTC normalization — есть, и комментарий есть
SQL [строки 43–48](../etl/Procedure__procedure_occurrence.sql) делает `AT TIME ZONE 'UTC'` с поясняющим комментарием. ✅ Хорошо. Тот же паттерн как в Encounter.

### 4.8. Только 4 vocabulary — нет ICD9Proc, OPS, и более экзотических
View извлекает SNOMED/CPT4/HCPCS/ICD10PCS. ETL-German добавляет OPS (German) и DICOM. Synthea использует только SNOMED, так что для нашей когорты не критично. Для production multi-source — расширять.

### 4.9. Procedure.usedCode / focalDevice — не используются
ETL-German создаёт device_exposure-строки из `Procedure.usedCode`. У нас этого нет — отдельный edge не определён. Synthea не эмитит usedCode, но для real EHR (surgical devices) — gap.

> **Note:** возможно завести `Procedure_device__device_exposure` edge.

## 5. Concept resolution

### Vocabulary chain (procedure_concept_id)
Тот же паттерн как Condition: UNION ALL → `concept_relationship Maps to` → `standard_concept='S' AND domain_id='Procedure'`. Priority: SNOMED > CPT4 > HCPCS > ICD10PCS.

На Synthea: все 4974 SNOMED-коды резолвятся в Procedure. **3768 потерянных** — это коды с domain_id != Procedure (Measurement / Observation / Drug).

### `procedure_type_concept_id` (константа)
- Мы и Synthea CSV reference: **32827** EHR encounter record (Type Concept, Standard)
- omoponfhir/NACHC: 44786630 Primary Procedure (Procedure Type, **non-standard**)
- FhirToCdm/ETL-German: 32817 EHR (generic, Standard)
- fhir-x-omop: 32818/32820 (admin/ancillary report, switch по URL)

`32827` — самый точный (encounter-record-based procedure), и совпадает с reference. ✅

Никакого фактического `cm.*` для procedure_type — это константа.

### `body_site` (concept_map: body_site)
Декларируется в edge JSON, но **никакого `cm.body_site_*` не существует**, и SQL не делает lookup. Mappings блок — фикция.

## 6. Action items

1. **[HIGH] domain-routing** — реализовать INSERT-ы в observation/measurement для кодов с не-Procedure domain. Не теряем 43% строк (§4.2). Альтернатива: counter+log.

2. **[HIGH] обновить edge JSON `constant: 32827`** — синхронизировать с SQL. Добавить в `vocabularies[procedure_type]` правильный entry.

3. **[MED] status filter** — добавить `WHERE v.status_code IN ('completed', 'in-progress')` в SQL. Сейчас пишем всё, даже `entered-in-error` (теоретически).

4. **[MED] реализовать modifier_concept_id из body site** — view + SQL дополнить. Сейчас всегда NULL хотя edge JSON обещает.

5. **[LOW] исследовать 24 дубликата** по `(source_value, person_id, date)` — может быть валидный data fact, может быть баг pipeline.

6. **[LOW] truncate `procedure_source_value` до 50 chars** — `LEFT(r.src_code, 50)`. OMOP колонка varchar(50). Сейчас потенциальный crash на длинных codes (HCPCS/ICD10PCS могут быть длинными).

7. **[LOW] usedCode → device_exposure** — отдельный edge для будущего.

## 7. Verification

```
staging.procedure_occurrence: 8742
cdm_ours_fhir.procedure_occurrence: 4974 (57% выживает)
cdm.procedure_occurrence: 4974 (та же фильтрация)
diff JOIN (csv, person_id, sd): 4998 (vs 4974 — 24 дубликата, требует анализа)
concept_mismatch: 0  ✅
type_concept_id: 32827 в обоих, all 4974  ✅
```

## 8. Cross-cutting

- **Domain-routing gap** — теряем 78% Conditions, 43% Procedures, потенциально и Observations (проверить в следующем ревью). Это сквозная проблема pipeline.
- **IG `.fml` syntax bugs** — теперь 2 файла (condition.fml и Procedure.fml) с битым синтаксисом. PersonMap.fml тоже неполный. Можно констатировать: **ни один IG fml не работает as-is**.
- **`status_code` extracted but unused** — паттерн "view извлекает, SQL ignore-ит". Стоит автоматизировать проверку: каждая view-колонка должна быть упомянута в каком-то SQL.
- Тот же spec-impl gap: type_concept_id=32827 (impl) vs 32817 (JSON spec) — встретили уже в Encounter, Condition, теперь Procedure. Нужен патч edge JSONов всех таблиц где SQL использует 32827.
