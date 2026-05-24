# Patient → death — review

## 1. Summary

OMOP `death` — отдельная таблица (не колонки в `person`), одна запись на person. Условие: `Patient.deceasedDateTime` присутствует (`deceasedBoolean=true` без даты не порождает строку — `death_date` NOT NULL). У нас edge **documented** (статус, но фактически **implemented** — есть SQL+view, и validation проходит). На 100-пациентной Synthea-когорте: **5 / 5 строк совпадают** с `cdm.death` (по `person_id` и `death_date`).

Ревью обнаружило **серьёзную проблему с концепт-ID метаданными в edge JSON** (`vocabularies[].entries` несёт неправильные `target_concept_name` для 3 из 4 концептов), и одну **ложную атрибуцию refs** (omoponfhir упомянут как референс, но фактически death не реализует — TODO в коде).

## 2. Reference inventory

| Ref | File | Подход | Что реально делает |
|---|---|---|---|
| **fhir-omop-ig** (primary, FSH only) | [`refs/refs/fhir-omop-ig/input/fsh/Death.fsh`](../../refs/refs/fhir-omop-ig/input/fsh/Death.fsh) | Logical model — описание полей | 6 полей: person_id, death_date(1..1), death_datetime, death_type_concept_id, cause_concept_id, cause_source_value, cause_source_concept_id. **Нет .fml**. **Нет intro page.** Только дефиниция. |
| ETL-German-FHIR-Core | [`…/mapper/PatientMapper.java:653–675`](../../refs/refs/ETL-German-FHIR-Core/src/main/java/org/miracum/etl/fhirtoomop/mapper/PatientMapper.java) | Java, two-stage через `post_process_map` | Извлекает `srcPatient.getDeceasedDateTimeType()`, конвертирует `LocalDateTime`. Использует `CONCEPT_EHR_RECORD_STATUS_DECEASED = 38003569` (см. [`Constants.java:23`](../../refs/refs/ETL-German-FHIR-Core/src/main/java/org/miracum/etl/fhirtoomop/Constants.java)). Death складывается в `post_process_map` для batch-обработки. |
| omoponfhir | [`…/OmopPatient.java:1070`](../../refs/refs/omoponfhir-omopv5-r4-mapping/src/main/java/edu/gatech/chai/omoponfhir/omopv5/r4/mapping/OmopPatient.java) | **НЕ реализовано** | `// TODO set deceased value in Person; Set gender concept (source value` + строка 85: `// * death : death on FHIR (need to revisit) TODO`. Death создания нет. |
| FhirToCdm | [`FhirToCdmMappings.cs:42–48`](../../refs/refs/FhirToCdm/FhirToCdmMappings.cs) | C# .NET | Только `foreach (var ex in patient.Extension) { if (ex.Url.ToLower().Contains("death")) {} }` — пустой блок. Death НЕ создаётся. |
| NACHC-fhir-to-omop | [`OmopPersonBuilder.java`](../../refs/refs/NACHC-fhir-to-omop/src/main/java/org/nachc/tools/fhirtoomop/omop/person/factory/builder/person/OmopPersonBuilder.java) | Java | `mapRace/mapEthnicity/mapGender/mapBirthDay` — никакой death-маппинг. Не реализовано. |

**Вывод по refs**: из 5 «потенциальных» референсов **только 1 (ETL-German) реально пишет death**. omoponfhir/FhirToCdm/NACHC — все TODO. Это согласуется с edge JSON `edge_cases.case`: "6 of 9 surveyed implementations silently lose mortality data". Хорошая статистика, но наша атрибуция per-source в `fields[].sources` слегка вводит в заблуждение (см. §4.1).

## 3. Side-by-side по полям

| OMOP column | Наш (`Patient__death.sql`) | IG `Death.fsh` | ETL-German |
|---|---|---|---|
| `person_id` | `referenceToId(v.id)` — `hashtextextended(Patient.id, 0)::bigint` | `1..1 Reference(Person)` | `fhirLogicalId(patientLogicId)` + `fhirIdentifier(patientSourceIdentifier)` — складывает в post_process_map для дальнейшего lookup |
| `death_date` | `v.death_dt::date` | `1..1 date` | `deathDateTime.toLocalDate().toString()` (через `dataOne`) |
| `death_datetime` | `v.death_dt::timestamp` | `0..1 dateTime` | `format("yyyy-MM-dd HH:mm:ss")` (через `dataTwo`) |
| `death_type_concept_id` | `32817` константа ('EHR') | `0..1 code` | **`38003569`** ('EHR record patient status "Deceased"') — `omopId` поле |
| `cause_concept_id` | `NULL::integer` | `0..1 code` | не выставляется (post_process_map не имеет cause field) |
| `cause_source_value` | `NULL::varchar` | `0..1 string` | не выставляется |
| `cause_source_concept_id` | `NULL::integer` | `0..1 code` | не выставляется |

WHERE-фильтр у нас: `v.death_dt IS NOT NULL` — это и есть стейдж-1 эквивалент IG-овского "deceasedDateTime is present" условия. View ([`Patient__death.view.json`](../views/Patient__death.view.json)) использует `deceased.ofType(dateTime)`, что отсекает `deceasedBoolean=true`-only кейс автоматически — boolean не пройдёт через `ofType(dateTime)`. ✅ Семантически верно.

## 4. Различия (и почему)

### 4.1. ⚠️ Edge JSON `vocabularies[]` содержит неправильные target_concept_name
В [`mapspec/edges/Patient__death.json:137–162`](../edges/Patient__death.json) перечислены 4 кандидата для `death_type_concept_id` с подписями:

| edge JSON говорит | Athena vocab.concept реально |
|---|---|
| `32817 → "EHR"` | ✅ `32817 EHR` (Type Concept) — совпадает |
| `32887 → "EHR record patient status Deceased"` | ❌ `32887 OMOP Condition Status` (Vocabulary entry, **не Type Concept**) |
| `32815 → "Claim"` | ❌ `32815 Death Certificate` (Type Concept) |
| `32885 → "Death Certificate"` | ❌ `32885 US Social Security Death Master File` (Type Concept) |

**Все три не-используемые альтернативы перепутаны.** Правильные концепты для death_type:
- `32817` "EHR" — generic, что мы и используем
- `38003569` "EHR record patient status 'Deceased'" — то, что использует ETL-German (более специфичный)
- `32494` "EHR record patient status 'Deceased'" — то же название, другой vocab (`Condition Type` vs `Type Concept`)
- `32815` "Death Certificate" — vital records source
- `32500` / `261` "US Social Security Death Master File record"

> **Action [HIGH]:** переписать `vocabularies[death_type].entries` с правильными именами и расширить список (см. §6 п.1).

### 4.2. Edge JSON `references[]` врёт про omoponfhir
`mapspec/edges/Patient__death.json:166–169` указывает omoponfhir как реализацию. Но в `OmopPatient.java:85,1070,1215` — три явных TODO-комментария, что death не реализован. Это вводит в заблуждение читателя UI (`/mapspec/Patient/death`). 

> **Action [MED]:** удалить omoponfhir из `references[]` либо явно пометить `notes: "TODO in source — not implemented"`. То же касается `fields[death_date].sources[0]` где omoponfhir упомянут.

### 4.3. SQL пишет `NULL`, edge JSON говорит `constant: 0`
`mapspec/edges/Patient__death.json:119` — `cause_concept_id: {constant: 0, ...}`. `cause_source_concept_id: {constant: 0}` (строка 134). **Но SQL** ([`Patient__death.sql:11–13`](../etl/Patient__death.sql)) пишет `NULL::integer` для обоих. 

Семантически: OMOP-конвенция — `*_concept_id` поля **никогда не NULL**, используется `0` (No matching concept) для отсутствия маппинга. Наш SQL технически не соответствует конвенции — поля nullable в Death.fsh (`0..1`), но Themis-конвенция говорит "writers should use 0 for missing concept_id". 

Reference cdm.* тоже пишет NULL для cause (проверено: `SELECT death_type_concept_id, cause_concept_id FROM cdm.death` → все 5 строк с cause=NULL). Так что наш NULL **совпадает с reference**, но **расходится с собственным edge JSON**.

> **Action [MED]:** либо обновить SQL писать `0::integer` для cause_concept_id / cause_source_concept_id, либо обновить edge JSON `constant: null`. Решение зависит от того, что мы хотим: соответствие нашему cdm.* reference (NULL) или OMOP Themis (0). Reference выбрал NULL — оставим NULL.

### 4.4. `death_type_concept_id = 32817 EHR` — generic, не специфический
ETL-German использует `38003569` "EHR record patient status 'Deceased'" — описывает не только источник (EHR), но и **семантическое назначение** (это запись о смерти, не запись о, скажем, выписке). По строгости — `38003569` лучше. Но Synthea/ETL-Synthea-cdm используют `32817`, и наш reference cdm.* тоже `32817`. То есть мы согласуемся с реальностью Synthea-pipeline, а не с теоретически "правильным" концептом.

> **Note:** не блокер. Стоит документировать выбор в комментарии SQL: "Following ETL-Synthea convention (32817 EHR generic); ETL-German uses 38003569 (more specific)".

### 4.5. Нет `cause_concept_id` lookup из Observation LOINC 69453-9
Edge JSON `fields[cause_concept_id].notes` (строка 120) обещает: "Populate from Observation LOINC 69453-9 in post-processing". 69453-9 = "Cause of death". Synthea эту LOINC-Observation не emits для всех пациентов (проверка: можно посмотреть `fhir.observation` после фильтра по коду). У нас нет ни post-processing шага, ни вью.

Это известная gap — задокументирована, не реализована. ETL-German тоже не имеет `cause_concept_id`-lookup.

> **Note:** оставить как есть. Если когда-то понадобится — отдельный stage-2 UPDATE по `cdm_ours_fhir.death JOIN staging.observation WHERE code = '69453-9'`. Можно завести как отдельный edge (`Observation/death.cause`).

### 4.6. Partial deceasedDateTime — не обрабатывается
Edge JSON `edge_cases`: "Partial deceasedDateTime (2024-03)" → pad to last day per OMOP Themis. Сейчас SQL `v.death_dt::date` упадёт или вернёт неожиданное, если строка не парсится как полный datetime. View FHIRPath `deceased.ofType(dateTime)` вернёт partial dateTime, и стейджа 1 положит как есть.

Synthea всегда даёт полный dateTime, так что в тестах не всплывает. Production EHR — может.

> **Action [LOW]:** добавить в SQL `COALESCE(v.death_dt::date, ...)` с fallback, или явно фильтровать `WHERE v.death_dt ~ '^\d{4}-\d{2}-\d{2}'`. Сейчас тихий потенциальный crash.

### 4.7. Incremental delete (Patient updated to alive) — мы не поддерживаем
ETL-German использует `post_process_map` именно для этого: при инкрементальном апдейте если пациент стал alive — удаляется существующая `death`-запись по person_id. Наш SQL `INSERT INTO cdm_ours_fhir.death` начинается с `TRUNCATE` (см. `src/etl_fhir/runEdge.ts`), так что full-rebuild всегда корректен. Но incremental — нет.

> **Note:** наш pipeline вообще не incremental (full TRUNCATE+INSERT). Это сквозная архитектурная особенность, не специфичная для death. Записать в `mapspec/GAPS.md` (если такой файл есть/появится).

## 5. Concept resolution

Концепт-мапинга для death_date / cause нет — нечего смотреть. Единственная вокабула используется константой `death_type_concept_id = 32817`.

Verified в Athena:
```
32817   EHR                                          Type Concept   Standard='S'
38003569  EHR record patient status "Deceased"     Condition Type   Standard=NULL
32494   EHR record patient status "Deceased"      Type Concept     Standard='S'  (S!)
32500   US Social Security Death Master File record  Type Concept   Standard='S'
261     US Social Security Death Master File record  Type Concept   Standard='S'
4216643  Patient died                          SNOMED Clinical Finding  Standard='S'  (для cause, не type)
```

Любопытно: **32494** — это standard (`S`) Type Concept с тем же названием что non-standard 38003569 в `Condition Type`. Для production стоило бы использовать 32494, не 38003569 (как делает German). Но опять же, ETL-Synthea convention = 32817.

## 6. Action items

1. **[HIGH] `mapspec/edges/Patient__death.json:137–162`** — переписать `vocabularies[death_type]`:
   ```json
   "entries": [
     {"target_concept_id": 32817, "target_concept_name": "EHR", "notes": "Default; ETL-Synthea convention; what we use"},
     {"target_concept_id": 32494, "target_concept_name": "EHR record patient status \"Deceased\"", "notes": "Standard Type Concept; more specific than 32817"},
     {"target_concept_id": 38003569, "target_concept_name": "EHR record patient status \"Deceased\"", "notes": "Condition Type vocab (non-standard); used by ETL-German"},
     {"target_concept_id": 32815, "target_concept_name": "Death Certificate", "notes": "Vital records source"},
     {"target_concept_id": 32500, "target_concept_name": "US Social Security Death Master File record", "notes": "Government death record"}
   ]
   ```
   Заодно поправить ту же ошибку в [`mapspec/edges/Patient__death.json:80`](../edges/Patient__death.json) (constant note "32887 EHR record patient status Deceased" → "38003569").

2. **[MED] `mapspec/edges/Patient__death.json:166–181`** — обновить `references[]`:
   - omoponfhir: добавить `notes: "TODO/not implemented — see OmopPatient.java:85,1070,1215"`
   - либо просто удалить
   - проверить, нет ли других edge'ов с похожей ложной атрибуцией (см. follow-up)

3. **[MED] определиться NULL vs 0 для cause_*_concept_id** — обновить либо `Patient__death.sql:11,13` (на `0::integer`), либо `Patient__death.json:119,134` (constant: null). Reference cdm.* пишет NULL, я бы оставил NULL и поправил JSON.

4. **[LOW] `mapspec/etl/Patient__death.sql`** — добавить header-комментарий: "Type concept 32817 (EHR) per ETL-Synthea convention. ETL-German uses 38003569 / 32494 (more specific). cause_concept_id requires separate post-processing from Observation LOINC 69453-9 — not implemented."

5. **[LOW] partial deceasedDateTime fallback** — либо WHERE-фильтр на полный формат, либо `make_date(...)` с padding. Сейчас тихий потенциальный crash на нестандартных EHR. Synthea-only тесты этого не вскрывают.

6. **[FOLLOW-UP]** Аудит ложных атрибуций refs в остальных edge'ах. Вероятный паттерн: автогенерированные `sources[]` могли пометить omoponfhir/FhirToCdm как референс там, где TODO в коде. Можно скриптом грепнуть `// TODO` рядом с упоминанием domain-имени.

## 7. Verification (наш cdm_ours_fhir.death vs reference cdm.death)

```
ours = 5 строк
ref  = 5 строк
matched (person_id + death_date) = 5
only_ours / only_ref / date_mismatch = 0 / 0 / 0
death_type_concept_id distribution: 32817 → 5 в обоих
cause_concept_id: NULL → 5 в обоих
```

100% совпадение на 100-пациентной когорте. Death-pipeline работает корректно — проблемы только в метаданных edge JSON, не в реальной ETL.
