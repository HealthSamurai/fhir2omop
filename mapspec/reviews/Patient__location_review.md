# Patient → location — review

## 1. Summary

OMOP `location` нормализует физический адрес. У нас edge **documented**, фактически **implemented** через [`Patient__location.sql`](../etl/Patient__location.sql) + stage-1 в [`Patient__person.view.json`](../views/Patient__person.view.json) (не в `Patient__location.view.json` — см. §4.1).

На 100-Synthea-когорте: **367 строк в `cdm_ours_fhir.location` vs 105 в `cdm.location`** — 3.5x больше, потому что мы добавляем 262 строки из FHIR `Location` resources (госпитали, провайдеры) через [`Location__location.sql`](../etl/Location__location.sql). Reference (Synthea CSV) этого не делает. Decomposition: 105 от Patient + 262 от FHIR Location = 367. На наш счёт это **полнее**, не баг.

Главные находки:
1. **`Patient__location.view.json` — мёртвый код**: `staging.patient_location` не существует, SQL читает `staging.patient_person`.
2. **Edge JSON `Patient.address.line[0]/[1]`** — fhir_path не отражает реальную имплементацию (`line.join(' ')`).
3. `address_2` всегда NULL.
4. `location_source_value = state` — необычно (ожидалось бы concat).
5. Patient → location: 1 пациент = 1 location, без дедупликации.

## 2. Reference inventory

| Ref | File | Подход |
|---|---|---|
| **fhir-omop-ig** (FSH only) | [`input/fsh/Location.fsh`](../../refs/refs/fhir-omop-ig/input/fsh/Location.fsh) | 11 колонок: address_1/2, city, state, zip, county, location_source_value, country_concept_id, country_source_value, latitude, longitude. Никаких маппингов из FHIR. |
| omoponfhir | [`OmopPatient.java`](../../refs/refs/omoponfhir-omopv5-r4-mapping/src/main/java/edu/gatech/chai/omoponfhir/omopv5/r4/mapping/OmopPatient.java) | **searchAndUpdate pattern** — `LocationService.search(...)` по композитному ключу, если нет — INSERT. Шарит location_id между persons с одинаковым адресом. |
| FhirToCdm | [`FhirToCdmMappings.cs:70–89`](../../refs/refs/FhirToCdm/FhirToCdmMappings.cs) | `HashSet<Location>` (стандартный C# равенство по value) — дедуплицирует в памяти **за один Patient**, но между Patient'ами разных location-ов не шарит. `address.City/State/PostalCode/Country` — без line[]. **`line.ToList()` закомментировано** (см. строки 81–86). |
| ETL-German-FHIR-Core | [`PatientMapper.java:283–334` `setLocation()`](../../refs/refs/ETL-German-FHIR-Core/src/main/java/org/miracum/etl/fhirtoomop/mapper/PatientMapper.java) | Deferred через `PostProcessMap`: `dataOne = "zip;city;country"`, `dataTwo = "lines;state"`. Делает hand-rolled serialization, реальный INSERT в location — в SQL post-processing. Проверяет `data-absent-reason` на address целиком. |
| NACHC | [`OmopPersonBuilder.java:45–47`](../../refs/refs/NACHC-fhir-to-omop/src/main/java/org/nachc/tools/fhirtoomop/omop/person/factory/builder/person/OmopPersonBuilder.java) | `if (dvo.getLocationId() == null) dvo.setLocationId(1)` — **захардкоженный fallback на 1**, маппинга адреса нет. |
| fhir-to-omop-demo | [`Patient.jq:101`](../../refs/refs/fhir-to-omop-demo/demo/translate/map/Patient.jq) | `null` для location_id — не реализован. |

**Реальный консенсус**: только omoponfhir и FhirToCdm пишут содержательные адреса; German готовит к этому через staging; NACHC и jq не делают. Мы пишем без дедупликации, но со всеми полями FSH (включая lat/long и country_concept_id), что **полнее, чем у любого ref**.

## 3. Side-by-side

| OMOP column | Наш SQL (`Patient__location.sql`) | omoponfhir | FhirToCdm | German | NACHC | IG FSH |
|---|---|---|---|---|---|---|
| `location_id` | `referenceToId(v.id)` — **= person_id**, без дедупа | searchAndUpdate(addr) — sharedID | HashSet dedup в памяти per-Patient | sequence в SQL после post-process | константа `1` | `1..1 integer` |
| `address_1` | `v.location_line` — `line.join(' ')` (см. §4.2) | `addLine(line0).addLine(line1)` | закомментирован line[] | `addLines(address, dataTwo)` | — | `0..1 string` |
| `address_2` | **`NULL::varchar`** (всегда) | `addLine(line1)` | — | — | — | `0..1 string` |
| `city` | `v.location_city` | `.setCity(city)` | `address.City` | `addCity()` | — | `0..1 string` |
| `state` | `v.location_state` | `.setState(state)` | `address.State` | `addState()` | — | `0..1 string` |
| `zip` | `v.location_zip` | `.setPostalCode(zip)` | `address.PostalCode` | `addZip()` | — | `0..1 string` |
| `county` | `v.location_county` (из `Address.district`) | — | — | — | — | `0..1 string` |
| `location_source_value` | **`v.location_state`** (только штат!) | — | — | (dataOne) | — | `0..1 string` |
| `country_concept_id` | `COALESCE(c.concept_id, 0)` LEFT JOIN `cm.country_iso_to_omop` | — | — | — | — | `0..1 code` |
| `country_source_value` | `v.location_country` | — | `address.Country` | `addCountry()` | — | `0..1 string` |
| `latitude` | `v.location_lat::numeric` | — | — | — | — | `0..1 decimal` |
| `longitude` | `v.location_lng::numeric` | — | — | — | — | `0..1 decimal` |

Reference `cdm.location` (Synthea CSV loader):
- address_1 ✓, city ✓, state **пустая строка** (не NULL), zip ✓ (с 00000), county/country_concept_id/country_source_value/latitude/longitude **отсутствуют**.

Наш cdm_ours_fhir.location полнее ref по `state`, `country_*`, `lat/lng`, `county`. Структурно — соответствует FSH полностью.

## 4. Различия

### 4.1. ⚠️ `Patient__location.view.json` — мёртвый код
В `staging.*` нет таблицы `patient_location`. Все 24 staging-таблицы проверены:
```
staging.patient_person          ← используется
staging.patient_death           ← используется
staging.patient_observation_period
staging.location_location       ← для Location/location edge
... (нет patient_location)
```

[`Patient__location.sql:22`](../etl/Patient__location.sql) джойнит `staging.patient_person`, который материализуется из [`Patient__person.view.json`](../views/Patient__person.view.json) (там есть `forEachOrNull` блок с location_line/city/state/zip/county/country/lat/lng колонками).

[`Patient__location.view.json`](../views/Patient__location.view.json) — **дубликат с расходящейся семантикой** (использует `Patient.address.line[0]/[1]`, не `join`) и **не материализуется ни в одну таблицу**. Никто его не читает. Это:
- сбивает с толку при ревью (читаешь "официальный" view, а пайплайн использует другой)
- расходится с edge JSON, который ссылается на line[0]/line[1]

> **Action [HIGH]:** удалить `Patient__location.view.json` либо переименовать `Patient__person.view.json` так чтобы было ясно что он также покрывает location/death. Возможный путь — выделить три отдельных view (`patient_person`, `patient_location`, `patient_death`), каждый материализуется в свою staging-таблицу, и Patient__location.sql джойнит `staging.patient_location`. Cleaner separation of concerns.

### 4.2. ⚠️ Edge JSON говорит `line[0]/line[1]`, реально — `line.join(' ')`
`mapspec/edges/Patient__location.json:70` обещает `address_1 ← Patient.address.line[0]`. View (Patient__person.view.json:88) делает `line.join(' ')`. Это значит:
- Для Synthea-пациента с адресом `["123 Main St", "Apt 4B"]` — мы пишем "123 Main St Apt 4B" в address_1, **address_2 = NULL** (всегда).
- Реально OMOP конвенция: address_1 = первая строка, address_2 = вторая. Терять `Apt 4B` структурно — не идеально.
- В Synthea адреса однострочные (нет Apt), так что в нашей когорте это не всплывает. Production EHR с многоэтажной адресацией — проблема.

> **Action [MED]:** либо обновить view на `line[0]` и `line[1]` (тогда edge JSON правда), либо обновить edge JSON `fhir_path` на `line.join(' ')` и `notes: "Multi-line addresses joined with space; address_2 unused"`.

### 4.3. ⚠️ `location_source_value = state` — точно ли это задумка?
SQL [`Patient__location.sql:17`](../etl/Patient__location.sql):
```sql
v.location_state    AS location_source_value,
```
То есть в `location_source_value` пишется только аббревиатура штата ("MA"). FSH описывает это поле как "Location Identifier Source Value" — обычно концат адреса для traceability. ETL-German пишет `"zip;city;country"` как `dataOne` и потом в location_source_value (или похожее) идёт композит. У нас — только state.

Также интересно: `Location__location.sql:12` для FHIR Location resources делает то же самое (`left(v.state, 50) AS location_source_value`).

Похоже, это устаревший выбор. Семантика "source value" — обычно полный source-формат адреса (e.g. JSON-ized или delimiter-separated), чтобы можно было найти источник.

> **Action [MED]:** заменить на `concat_ws(';', v.location_line, v.location_city, v.location_state, v.location_zip, v.location_country)` или похожий full-record-формат. Поможет traceability.

### 4.4. Нет дедупа адресов — N persons на одном адресе → N location rows
У нас `location_id = referenceToId(v.id) = hash(Patient.id)` — каждый пациент получает свой location_id, даже если адрес идентичен другому пациенту. Production-ETL (omoponfhir, ETL-German) дедуплицируют по composite key.

Для Synthea это малозначимо: каждый из 105 пациентов имеет уникальный адрес. Reference `cdm.location` тоже 105 строк, тоже без дедупа.

На больших датасетах с членами семей по одному адресу — будет дублирование. Не баг, но архитектурное упрощение.

> **Note:** записать в edge_cases уже было; **already covered**.

### 4.5. Country resolution через `cm.country_iso_to_omop`
ConceptMap materialized с 5 entry (AU/CA/DE/GB/US). FSH говорит "country_concept_id" should be Geography domain. Все 5 — валидные standard concepts (4330442 US, 4330427 CA, 4330437 GB, 4330439 DE, 4330448 AU).

Synthea использует только "US", всё попадает в concept_id `4330442`. Для production не-US — нужно расширить cm-файл (всего ~250 ISO-кодов). 

> **Action [LOW]:** расширить `mapspec/profiles/country-iso-to-omop.cm.json` хотя бы до топ-50 стран. Можно автогенерировать из `vocab.concept WHERE domain_id='Geography' AND vocabulary_id='Geography' AND concept_class_id='Country'`.

### 4.6. Reference `cdm.location` не пишет state, country, lat/lng — это limitation reference, не наш баг
Reference loader (`script/load-cdm-reference.ts`) написан Synthea-CSV-aware и **не извлекает** country/lat/lng. Наш cdm_ours_fhir.location пишет всё что есть. Это **уникальная situation для location edge** — мы богаче reference. Diff-страница покажет "наш state = MA, ref state = (пустая строка)" — это false-positive расхождение.

> **Note:** в diff-tooling стоит игнорировать "обогащение" над reference (один напр. `our_value IS NOT NULL AND ref_value IS NULL OR ref_value = ''`). Записать как cross-cutting в goal.md.

### 4.7. Multi-address policy
Edge JSON `edge_cases` обещает "most recent home address". В view: `(address.where(use='official') | address).first()` — берёт **первую** address с use='official', иначе первую любую. Это **НЕ "most recent"** (FHIR Address.period не учитывается).

Synthea эмитит ровно один address per Patient, без period, так что в когорте не разница.

> **Action [LOW]:** либо обновить spec/notes ("first 'official' or first; period not considered"), либо реализовать period-aware logic. Для Synthea — оставить как есть, обновить спецификацию.

## 5. Concept resolution

Используется `cm.country_iso_to_omop` (5 строк):
```
AU → 4330448  Australia
CA → 4330427  Canada
DE → 4330439  Germany
GB → 4330437  United Kingdom
US → 4330442  United States of America
```

Все standard concepts из Geography vocabulary. Маппинг прямой ISO2→OMOP, никаких сложностей.

Лимит — 5 стран. Для production добавить остальные.

## 6. Action items

1. **[HIGH] удалить или интегрировать `Patient__location.view.json`** — сейчас orphaned. Либо удалить (если Patient__person.view.json покрывает), либо переработать так чтобы он действительно материализовался в `staging.patient_location` и стейдж-2 SQL читал из него.

2. **[MED] синхронизировать edge JSON `fhir_path` с реальной имплементацией** (`line.join(' ')`, не `line[0]/[1]`). Либо изменить implementation на line[0]/line[1] — тогда address_2 будет нес осмысленные данные.

3. **[MED] переписать `location_source_value`** — сейчас просто state, должно быть `concat_ws(';', line, city, state, zip, country)` или JSON-сериализация для traceability.

4. **[LOW] расширить `cm.country_iso_to_omop`** до топ-50 стран — автогенерация из `vocab.concept WHERE domain_id='Geography' AND vocabulary_id='Geography' AND concept_class_id='Country'`. Сейчас лимитировано к 5.

5. **[LOW] period-aware address selection** — view сейчас "first" а edge JSON говорит "most recent". Либо align spec, либо align implementation.

6. **[NOTE] diff-tooling:** наш cdm_ours_fhir.location богаче reference cdm.location (state/country/lat/lng). False-positive расхождения в diff. Стоит флагнуть в diff-визуализации.

## 7. Cross-cutting

- **Reference cdm.* может быть беднее cdm_ours_fhir.*** (как с location). Diff-инструменты должны учитывать "обогащение" (наш > ref) отдельно от "расхождения" (наш ≠ ref).
- **Orphaned views**: `Patient__location.view.json` — пример. Стоит автоматически проверять: для каждого `mapspec/views/<X>.view.json` есть ли соответствующая `staging.<x>`-таблица и используется ли она в `mapspec/etl/<Y>.sql`. Скрипт `script/validate-staging.ts` существует — посмотреть, делает ли это.
- **Несоответствие edge JSON spec и реальной implementation** — это сквозной паттерн. Каждое ревью должно сверять `fhir_path` в edge JSON со фактической path в view JSON.
