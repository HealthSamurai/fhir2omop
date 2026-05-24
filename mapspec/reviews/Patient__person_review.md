# Patient → person — review

## 1. Summary

OMOP `person` — центральная identity-таблица; каждая клиническая запись несёт `person_id` FK к ней. У нас edge **implemented** ([`mapspec/edges/Patient__person.json`](../edges/Patient__person.json)): 18 колонок, четыре `cm.*` ConceptMap-а, нетривиальная обработка US Core race/ethnicity. На 100-пациентной Synthea-когорте — 105 строк, gender_concept_id ∈ {8507=45, 8532=60}, race_concept_id=0 нет.

Главный вывод: **наша реализация по большинству колонок аккуратнее, чем primary reference (HL7 IG StructureMap)**, которая по сути TODO-скелет. Расхождения с secondary refs объяснимы и в большинстве случаев в нашу пользу. Найдены: одна фактическая неточность в IG-доке (концепт `44814653`), и несколько мест где стоит дотянуть наш edge JSON / `cm.*`.

## 2. Reference inventory

| Ref | File (`refs/refs/...`) | Подход | Что покрывает |
|---|---|---|---|
| **fhir-omop-ig** (primary) | `fhir-omop-ig/input/maps/PersonMap.fml` | FML StructureMap, **строго skeleton** | gender (no translation), birthDate substring-parse. ID, race, ethnicity, location, provider, care_site — **отсутствуют**. `person_id` явно закомментирован с пометкой "should actually be a translate". |
| fhir-omop-ig (intro) | `fhir-omop-ig/input/pagecontent/StructureMap-PersonMap-intro.md` | narrative, обсуждение sex vs gender identity | таблица: male=8507/female=8532/**other=44814653**/unknown=8551. Convention: time-varying gender identity → observation, не person. |
| fhir-omop-ig (logical) | `fhir-omop-ig/input/fsh/Person.fsh` | FSH-описание target | `gender_concept_id` 1..1, доку трактует как "biological sex at birth", не gender identity. |
| fhir-omop-ig (general) | `F2OGeneralIssues.md`, `StrategiesBestPractices.md` | методология | identifier handling (external table vs direct vs exclude), null semantics, source-value preservation, temporal precision (OMOP = date). |
| omoponfhir-omopv5-r4-mapping | `…/mapping/OmopPatient.java:180–340` | reverse direction (OMOP→FHIR), но содержит парные правила | identifier split по `^` (vocab^code^value), birthDate fallback на 1970-06-15, SSN отдельным identifier. |
| FhirToCdm | `FhirToCdm/FhirToCdmMappings.cs:20–170` (`CreatePersonAndLocations`) | C# .NET, hardcoded switch | gender: только Male/Female → 8507/8532, всё остальное → 0. **other отсутствует.** Race: Synthea-text switch (`ASIAN`/`BLACK`/`OTHER`→8522/`WHITE`/`HISPANIC`). Ethnicity: только если race=`HISPANIC` → 38003563. Берёт `RaceSourceValue` из `Coding.Display`, не из `ombCategory.code` — менее устойчиво. |
| ETL-German-FHIR-Core | `…/mapper/PatientMapper.java:580–680` | Java + lookup-таблица `source_to_concept_map` | gender через `getCustomConcepts(gender, SOURCE_VOCABULARY_ID_GENDER, dbMappings)` — БД-driven, плюс немецкая extension `genderAmtlichDe` для `other`. `data-absent-reason` распознаётся явно. Death пишется в `post_process_map`. |
| NACHC-fhir-to-omop | `…/util/mapping/GenderMapping.java`, `…/builder/person/OmopPersonBuilder.java` | Java, sequence-id + DB-lookup | gender: только Male/Female (остальные → null → 0); `RaceMapping.getOmopConceptForFhirCode(code)` БД-запросом. Костыли: location/care_site/provider, если null → **1** (магическое "дефолтное"). |
| fhir-to-omop-demo | `fhir-to-omop-demo/demo/translate/map/Patient.jq` | jq-скрипт, выход @tsv | **Берёт `us-core-birthsex` (M/F)** для gender_concept_id, игнорируя `Patient.gender`. Совпадает с нашим COALESCE-приоритетом. Birthdate split через jq `tonumber`. |
| mends-on-fhir | `mends-on-fhir/whistle-mappings/synthea/concept-maps/Person.gender.conceptid.json` | Whistle ConceptMap (reverse) | только 8507↔male, 8532↔female, 0↔unknown. Демонстрирует Whistle-форму ConceptMap-а как у Google. |

## 3. Side-by-side по полям

Колонки OMOP `person` в порядке нашего INSERT (см. [`mapspec/etl/Patient__person.sql`](../etl/Patient__person.sql)). «IG» = что реально делает `PersonMap.fml` (не intro!).

| OMOP column | Наш | IG (PersonMap.fml) | omoponfhir | FhirToCdm | NACHC | German | jq |
|---|---|---|---|---|---|---|---|
| `person_id` | `hashtextextended(Patient.id, 0)` — детерминистский 64-bit hash | TODO, закомментировано | reverse: id из БД | `personIds` Dictionary, sequence | `FhirToOmopIdGenerator.getId` — sequence | sequence | `.id` верба-как-есть (нарушит integer-FK) |
| `gender_concept_id` | `COALESCE(us_core_birthsex, gender)` → `cm.gender_to_omop` → COALESCE 0 | прямой код → integer (некорректно) | reverse | switch на `Male`/`Female`, else 0 | DB lookup → null → 0 | `getCustomConcepts(gender, 'Gender', dbMappings)` | us-core-birthsex M/F → 8507/8532, else null |
| `gender_source_value` | `COALESCE(us_core_birthsex, gender)` | `cast(gender, "string")` | reverse | `Patient.Gender.ToString()` | `gender.toCode()` | gender строка | `gender.valueCode` |
| `gender_source_concept_id` | `COALESCE(g.source_concept_id, 0)` (всегда 0 в нашем `cm.*` — см. §5) | — | — | — | `setGenderSourceConceptId(genderId)` — пишет тот же concept_id | — | null |
| `year_of_birth` | `EXTRACT(YEAR FROM birth_date::date)` | `substring(0,4)` строка — без `cast` | DateTime.Parse | DateTime.Parse | `patient.getBirthYear()` | parse | jq `split("-")[0] \| tonumber` |
| `month_of_birth` | `EXTRACT(MONTH ...)` | `substring(5,2)` | — | DateTime.Parse | — | — | jq tonumber |
| `day_of_birth` | `EXTRACT(DAY ...)` | `substring(8,2)` | — | DateTime.Parse | — | — | jq tonumber |
| `birth_datetime` | `birth_date::timestamp` (полночь, нет us-core-birthtime!) | `bdSrc` сразу из birthDate | fallback 1970-06-15 если нет | DateTime.Parse | `patient.getBirthDate()` | LocalDateTime parse, ZoneId Europe/Berlin | `null` (не пишет) |
| `race_concept_id` | `COALESCE(rt.concept_id WHEN race_omb_code='UNK', r.concept_id, 0)` | — | — | switch на text (`ASIAN`/`BLACK`/`OTHER`→8522/…) | `RaceMapping.getOmopConceptForFhirCode(code)` DB | — | `.race.concept_id` уже decoded |
| `race_source_value` | `race_text` (из us-core-race extension `text`) | — | — | `Coding.Display` (хуже — display нестабилен) | `code` (омс OMB код) | — | `.race.concept_code` |
| `race_source_concept_id` | `COALESCE(r.source_concept_id, 0)` — всегда 0 | — | — | — | `setRaceSourceConceptId(raceId)` дублирует concept_id | — | `.race.source_concept_id` |
| `ethnicity_concept_id` | `COALESCE(e.concept_id, 0)` | — | — | switch на OMB display — только Mexican/Puerto Rican/… → 38003563 | DB lookup | — | `.ethnicity.concept_id` |
| `ethnicity_source_value` | `ethnicity_text` | — | — | `Coding.Display` | OMB код | — | `.ethnicity.concept_code` |
| `ethnicity_source_concept_id` | `COALESCE(e.source_concept_id, 0)` | — | — | — | дублирует | — | — |
| `location_id` | `referenceToId(v.id)` — **hashed на Patient.id** (не FK на отдельный location) | — | reverse: address из FPerson.location | по-address Location agg | если null → **1** | — | null |
| `provider_id` | `referenceToId(general_practitioner_ref)` | — | — | пусто (TODO) | если null → **1** | — | null |
| `care_site_id` | `referenceToId(managing_organization_ref)` | — | — | — | если null → **1** | — | null |
| `person_source_value` | `v.id` (Patient.id UUID) | — | identifier split `^vocab^code^value` | `patient.Id` | `patient.getId()` | — | `hapi_url` http://localhost:8080/Patient/... |

## 4. Различия с IG (и почему)

### 4.1. PersonMap.fml — не источник правды
[`refs/refs/fhir-omop-ig/input/maps/PersonMap.fml:10–18`](../../refs/refs/fhir-omop-ig/input/maps/PersonMap.fml) — это **8 строк** правил. `person_id` закомментирован с пометкой "should actually be a translate". `gender_concept_id` — прямой `tgt.gender_concept_id = gender` (типы не совпадают, было бы рантайм-ошибкой). Race/ethnicity/identifiers/location — отсутствуют. **Реальная нормативка IG живёт в narrative MD-страницах**, а не в FML. Для остальных edge'ов ситуация такая же: FML декларативно недописан, ориентируйся на `pagecontent/`.

### 4.2. IG intro vs Athena vocab — `other` gender concept_id
`StructureMap-PersonMap-intro.md:91–94` утверждает: `"other" → 44814653`. **Концепта `44814653` в Athena `vocab.concept` нет вообще** (May 2026 bundle):

```sql
SELECT * FROM vocab.concept WHERE concept_id=44814653;  -- 0 rows
```

Стандартные Gender-концепты — только 8507/8532. `8521 OTHER` и `8551 UNKNOWN` существуют, но `standard_concept IS NULL` (non-standard). Существует ещё `8570 AMBIGUOUS` (тоже non-standard). У нас `cm.gender_to_omop` маппит `other→8521`, `unknown→8551`. Это **согласуется с OHDSI Themis-конвенцией** ("0 для absent, non-standard concept для known-but-non-binary"), и фактически корректнее, чем `44814653` из IG.

> **Action:** оставить `8521`, добавить заметку в `mapspec/edges/Patient__person.json` `vocabularies[].notes` "IG intro doc reports 44814653 which does not exist in OMOP 5.4 vocab; use 8521 per OHDSI Themis". Можно завести issue в HL7 IG.

### 4.3. gender vs birthsex priority — мы согласны с jq, IG умалчивает
`Patient.gender` в FHIR R4 — административный пол (билетный/паспортный), может расходиться с биологическим. IG intro чётко говорит: `gender_concept_id` в OMOP — биологический пол, gender identity → Observation. Мы делаем `COALESCE(us_core_birthsex, gender)` — приоритет birthsex (US Core extension, M/F). [`Patient.jq:30–40`](../../refs/refs/fhir-to-omop-demo/demo/translate/map/Patient.jq) тоже берёт birthsex и **полностью игнорирует** Patient.gender. FhirToCdm/NACHC/German берут `Patient.gender`. Наш COALESCE — золотая середина: предпочитаем biological sex когда есть, иначе fallback. ✅

### 4.4. location_id = hash(Patient.id) — однопациентная Location
В нашем стейдже `location_id = referenceToId(v.id)`, т.е. **каждый пациент получает свою уникальную location_id** равную его `person_id` (одинаковый хеш). Это работает на Synthea (один адрес на пациента), но:
- если два пациента живут по одному адресу, у них будут разные location_id — теряем дедуп.
- IG (`F2OGeneralIssues.md`) и production-ETL (FhirToCdm, ETL-German) обычно дедуплицируют по `(line, city, state, zip)`-хешу.

> **Action:** в `Patient/location` review (отдельный edge) обсудить дедуп по composite key. Здесь — не блокер, но добавить в `edge_cases` "Address dedup not performed; one location_id per patient".

### 4.5. `*_source_concept_id` всегда 0 — недоиспользованное поле
Все наши `cm.*` имеют `source_concept_id=0` в каждой строке (см. §5). По `StrategiesBestPractices.md` source-id колонки должны нести concept_id, **если source-код существует в OMOP-вокабе как non-standard концепт**. Наш OMB race-код `2106-3` существует в Athena как concept (есть в `vocabulary_id='Race'`). Проверим — это можно автоматизировать одним join-апдейтом ConceptMap-ов. NACHC ([`OmopPersonBuilder.java:69–71`](../../refs/refs/NACHC-fhir-to-omop/src/main/java/org/nachc/tools/fhirtoomop/omop/person/factory/builder/person/OmopPersonBuilder.java)) пишет `raceId` в обе колонки — это упрощение (target=source), но семантически терпимое.

> **Action:** в `cm.race_omb_to_omop` и `cm.gender_to_omop` populate `source_concept_id` lookup-ом из `vocab.concept WHERE vocabulary_id IN ('Race','Gender','Race / Ethnicity')`. См. §6.

### 4.6. `birth_datetime` — теряем us-core-birthtime
Наш view вытаскивает `birthDate` как date, и в SQL делаем `birth_date::timestamp` (= полночь). У FHIR есть extension `http://hl7.org/fhir/StructureDefinition/patient-birthTime` (см. edge JSON `fields[].fhir_path: "Patient.birthDate + patient-birthTime extension"`), но **во view она не извлекается**, и в SQL не используется. ETL-German берёт zone Europe/Berlin (`PatientMapper.java:583`) — у нас зона потеряна. Synthea не emits birthTime, поэтому в наших тестах это не всплывает, но edge JSON обещает поддержку.

> **Action:** добавить во view `Patient__person.view.json` колонку `birth_time` из `extension('http://hl7.org/fhir/StructureDefinition/patient-birthTime').valueDateTime`; в SQL использовать `COALESCE(birth_time::timestamp, birth_date::timestamp)`.

### 4.7. `person_source_value` — голый UUID vs identifier-prioritized
Мы пишем `v.id` (Patient.id). Edge JSON `notes` обещает "best: SSN > MR > first". `omoponfhir` ([line 230–237](../../refs/refs/omoponfhir-omopv5-r4-mapping/src/main/java/edu/gatech/chai/omoponfhir/omopv5/r4/mapping/OmopPatient.java)) делает split по `^` (`<vocab>^<code>^<value>` Aidbox-like формат) — слишком cabalistic. F2OGeneralIssues §"Identifier Management" рекомендует **external mapping table** (отдельная таблица id↔Patient.id), а в `person_source_value` класть только то, что нужно для traceability. UUID — приемлемая дефолтная стратегия для трассировки.

> **Note:** Synthea generates `SS` (SSN), `MR`, `DL` (driver license), `PPN` (passport) identifiers + ehr-id. Если кому-то нужен SSN в person_source_value — стейдж-1 view должен пробросить колонку. Сейчас edge JSON обещает функционал, который SQL не реализует — **это inconsistency между edge spec и реализацией**.

### 4.8. Death — не на нашей стороне (отдельный edge)
ETL-German ([line 653–675](../../refs/refs/ETL-German-FHIR-Core/src/main/java/org/miracum/etl/fhirtoomop/mapper/PatientMapper.java)) объединяет Patient → person + death в одном маппере, через `post_process_map`. Наш дизайн — отдельный edge `Patient__death`. Это правильно по separation-of-concerns, но требует второго прохода по `fhir.patient`. Не блокер.

### 4.9. Никто из refs не использует ParadeDB/`source_to_concept_map` напрямую
IG `codemappings.md` (не читали в этом ревью — другие edge'и пересекутся) и StrategiesBestPractices рекомендуют **БД-таблицу маппинга** (`source_to_concept_map` или local equivalent). У нас это `cm.*` materialized из `mapspec/profiles/*.cm.json`. Архитектурно совпадает с German/NACHC (DB-driven), но input — FHIR ConceptMap JSON в репе, что декларативнее. ✅

## 5. Concept resolution: наши `cm.*` vs IG / Athena

Используем 4 ConceptMap-а из `mapspec/profiles/`:
- `gender-to-omop.cm.json` → `cm.gender_to_omop` — 8 строк, два группа (FHIR R4 lowercase + HL7 v3 uppercase M/F/OTH/UNK)
- `race-omb-to-omop.cm.json` → `cm.race_omb_to_omop` — 6 строк, OMB-коды
- `race-text-synthea-to-omop.cm.json` → `cm.race_text_synthea_to_omop` — 2 строки (Synthea-специфичный escape для UNK+text='Other')
- `ethnicity-omb-to-omop.cm.json` → `cm.ethnicity_omb_to_omop` — 2 строки (Hispanic / Not Hispanic)

**Проверено в Athena:**
```
8507  MALE       Gender:Gender   Standard='S'
8532  FEMALE     Gender:Gender   Standard='S'
8521  OTHER      Gender:Gender   Standard=NULL    ← non-standard, но валидный
8551  UNKNOWN    Gender:Gender   Standard=NULL
8570  AMBIGUOUS  Gender:Gender   Standard=NULL
8657  American Indian or Alaska Native     Race  Standard='S'
8515  Asian                                Race  Standard='S'
8516  Black or African American            Race  Standard='S'
8527  White                                Race  Standard='S'
8557  Native Hawaiian or Other Pacific Islander  Race  Standard='S'
8522  Other Race                           Race  Standard=NULL
8552  Unknown                              Race  Standard=NULL
38003563  Hispanic or Latino       Ethnicity   Standard='S'
38003564  Not Hispanic or Latino   Ethnicity   Standard='S'
44814653 — NOT IN VOCAB (IG intro doc error)
```

Все наши `cm.*.target_concept_id` валидны. `source_concept_id` везде 0 — улучшаемо (см. §4.5).

## 6. Action items (конкретные правки)

В порядке приоритета:

1. **[mid] `mapspec/views/Patient__person.view.json`** — добавить колонку `birth_time` из `extension('http://hl7.org/fhir/StructureDefinition/patient-birthTime').valueDateTime`. В `mapspec/etl/Patient__person.sql:21` заменить `v.birth_date::timestamp` на `COALESCE(v.birth_time::timestamp, v.birth_date::timestamp)`. (§4.6)

2. **[mid] `mapspec/profiles/race-omb-to-omop.cm.json`** и `gender-to-omop.cm.json` — заполнить `source_concept_id` lookup-ом в `vocab.concept` по `vocabulary_id IN ('Race','Gender')` через `concept_code = source_code`. Чтобы `cdm_ours_fhir.person.*_source_concept_id` нес осмысленные не-нулевые значения. Можно SQL-патчем после materialize, либо хардкодом в JSON. (§4.5)

3. **[low] `mapspec/edges/Patient__person.json`** — `vocabularies[name=gender].entries[other].notes` добавить: "HL7 FHIR↔OMOP IG intro doc lists 44814653, which is not present in OMOP CDM v5.4 Athena vocab; use 8521 OTHER per OHDSI Themis". (§4.2)

4. **[low] `mapspec/edges/Patient__person.json` `edge_cases`** — добавить: `{"case": "Multiple addresses, identical to other patient's address", "handling": "Not deduplicated; each Patient gets a unique location_id = hash(Patient.id). Production ETL should dedupe by (line, city, state, zip)."}`. (§4.4)

5. **[low] `mapspec/edges/Patient__person.json` field `person_source_value`** — либо реализовать SSN/MR priority в view+SQL, либо удалить обещание из `notes`. Сейчас edge spec лжёт о возможностях. (§4.7)

6. **[note] `mapspec/etl/Patient__person.sql`** — добавить комментарий в шапку про осознанное расхождение с IG intro (44814653) и про `location_id = hash(Patient.id)` стратегию (объяснить почему допустимо для Synthea).

7. **[follow-up]** В обзорах `Patient__location`, `Patient__death`, `Practitioner__provider`, `Organization__care_site` сверить, что `referenceToId(v.<ref>)` в `Patient__person.sql` действительно резолвится в существующие строки на той стороне. Сейчас стейджа 2 пишет `provider_id` хешем `general_practitioner_ref`, но если `Practitioner` edge никогда не пишет строку с этим хешем — FK будет битый.

## 7. Что в IG/refs полезно для остальных edge'ов

- **`F2OGeneralIssues.md` §"Status and Intent Elements"** — `MedicationRequest`, `Procedure`, `Encounter`, etc. имеют `status` (`completed`/`planned`/`cancelled`/`in-progress`). OMOP по конвенции хранит только completed activities. Проверить, фильтруем ли мы это во всех medication/procedure edge'ах. **TODO в этом проекте сквозной.**
- **`F2OGeneralIssues.md` §"HL7 Flavors of Null"** — `data-absent-reason` extension. Сейчас у нас не обрабатывается (ни в одном view). Synthea редко эмитит, но production EHR — постоянно.
- **`F2OGeneralIssues.md` §"Temporal Precision"** — OMOP колонки `*_date` — это `DATE`, `*_datetime` — `TIMESTAMP`. Где у нас может быть проблема: Encounter/Visit (наследование zone), Observation/Measurement (effectiveDateTime), Procedure (performedPeriod). Проверять во всех temporal edge'ах.
- **`StrategiesBestPractices.md` §"Differentiating Patient-Reported vs Clinician-Verified"** — type_concept_id поля (`drug_type_concept_id`, `observation_type_concept_id`) должны отражать provenance. Это в наших medication edge'ах сейчас захардкожено в константы — проверить.

Эти 4 пункта надо учесть в каждом следующем review, не дублируя copy-paste.
