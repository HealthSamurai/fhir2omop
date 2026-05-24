# Encounter → visit_occurrence — review

## 1. Summary

`visit_occurrence` — анкор OMOP, к нему через `visit_occurrence_id` цепляются все клинические события. Edge **implemented**, **primary**, **required**. 16 колонок, три `cm.*`, наш SQL умеет UTC-нормализацию таймзон.

**На 100-Synthea-когорте: 6388 / 6388 строк** (полное совпадение по count), `visit_source_value = Encounter.id` joins полностью; **0 date mismatches** (UTC-trick работает); **303 visit_concept_id mismatches** — все из-за **information loss в Synthea FHIR exporter** (см. §4.4), не нашего бага.

Главные находки:
1. **IG `EncounterVisit.fml` написан для R5** — `actualPeriod`/`admission` вместо R4 `period`/`hospitalization`. Наш view явно об этом знает (description строка 15).
2. **SQL пишет `visit_type_concept_id = 32827`** ('EHR encounter record'), но edge JSON говорит про **32817** ('EHR'). Spec ≠ impl. (32827 более точный.)
3. **`cm.encounter_class_to_omop`** (21 entry) **расходится с edge JSON vocabularies** (10 entry): VR→722455 в cm vs 9202 в JSON, SS→8870 в cm vs 9202 в JSON. Spec stale.
4. SQL пишет в `visit_source_value = v.id` (Encounter UUID), не class.code как обещает edge JSON (`Encounter.class.code`).

## 2. Reference inventory

| Ref | File | Подход | Заметки |
|---|---|---|---|
| **fhir-omop-ig** (primary) | [`EncounterVisit.fml`](../../refs/refs/fhir-omop-ig/input/maps/EncounterVisit.fml) (45 строк) | FML skeleton **для R5** | `src.actualPeriod`, `src.admission` (R5-only); `src.class.coding.code` (в R4 class — Coding, не CodeableConcept, лишний `.coding` сломал бы R4); `tgt.visit_source_concept_id = a` где `a` строковый code — type-violation. **Skeleton, не работает.** |
| omoponfhir | [`OmopEncounter.java:285–424`](../../refs/refs/omoponfhir-v54-r4/omoponfhir-omopv5-r4-mapping/src/main/java/edu/gatech/chai/omoponfhir/omopv5/r4/mapping/OmopEncounter.java) | Bi-direction Java, **только OMOP→FHIR (constructFHIR)**. Inferential read: hardcoded enum IMP/AMB/EMER в reverse direction. F→O — IdMapping.getOMOPfromFHIR(). visit_type_concept_id=44818518. |
| FhirToCdm | [`FhirToCdmMappings.cs:173–250` `CreateVisitOccurenceAndProvider`](../../refs/refs/FhirToCdm/FhirToCdmMappings.cs) | C# .NET, **3-code switch** | `IMP→9201`, `EMER→9203`, **default 9202** (всё остальное outpatient). visit_type_concept_id=32817 константа. care_site_id — **создаёт Provider** из serviceProvider.display вместо care_site, что архитектурно странно. |
| ETL-German-FHIR-Core | [`EncounterInstitutionContactMapper.java:1–872`](../../refs/refs/ETL-German-FHIR-Core/src/main/java/org/miracum/etl/fhirtoomop/mapper/EncounterInstitutionContactMapper.java) | Java, **наиболее полная** | DB-backed `getCustomConcepts` (концепт-таблица), German class codes, `CONCEPT_STILL_PATIENT` для status=unknown без end-date → `end=LocalDate.now()`, visit_detail для transfers, incremental updates. |
| NACHC | [`OmopVisitOccurrenceBuilder.java:50–88`](../../refs/refs/NACHC-fhir-to-omop/src/main/java/org/nachc/tools/fhirtoomop/omop/person/factory/builder/visitoccurrence/OmopVisitOccurrenceBuilder.java) | Java, DB-backed concept | Sequence для id, `provider_id=1`/`care_site_id=1` константы (см. patient/person review). |
| fhir-to-omop-demo | [`Encounter.jq:1–146`](../../refs/refs/fhir-to-omop-demo/demo/translate/map/Encounter.jq) | jq, "**multi-output**" — из Encounter генерирует visit_occurrence + condition + observation + procedure | Filter participant by PPRF type. care_site_id из `location[0].location.id` (не serviceProvider). |
| fhir-x-omop | [`visit_occurrence.py`](../../refs/refs/fhir-x-omop/fhir_x_omop/to_omop/visit_occurrence.py) | Python `chidian.Mapper` (55 строк) | 5-code switch IMP/AMB/EMER/HH/VR, default 9202. **visit_source_value = type[0].coding[0].code** (SNOMED — более информативно чем class). Filter participant by ATND. discharge: home/snf/rehab/exp с явным concept_id. |
| mends-on-fhir | [`Visit_Encounter.wstl`](../../refs/refs/mends-on-fhir/whistle-mappings/synthea/whistle-functions/Visit_Encounter.wstl) | Whistle, O→F (107 строк) | Reverse direction. Использует ConceptMap JSON. |

**Реальный консенсус**:
- IMP/AMB/EMER → 9201/9202/9203 — **universal**.
- visit_type_concept_id: split — **32817** (FhirToCdm) vs **44818518** (omoponfhir, fhir-x-omop, jq) vs **32827** (мы, и Synthea-CSV reference). 32827 — самый специфичный.
- HH → split: 581379 (Inpatient Critical Care Facility — **wrong название** в edge JSON) vs 581476 (Home Visit) vs не-маппится. Наш cm — 581476 (Home Visit). fhir-x-omop — 581379. **Edge JSON говорит "581379 Home Health"** — но в Athena 581379 это "Inpatient Critical Care Facility" — **mislabeled**.

## 3. Side-by-side

| OMOP column | Наш (SQL) | IG fml (R5) | omoponfhir | FhirToCdm | German | fhir-x-omop |
|---|---|---|---|---|---|---|
| `visit_occurrence_id` | `referenceToId(v.id)` | TODO | IdMapping | Entity.Id | sequence | `int(id)` |
| `person_id` | `referenceToId(v.subject_ref)` | TODO | IdMapping | personIds dict | identifier+logicalId | `int(subject.split('/')[1])` |
| `visit_concept_id` | `COALESCE(cm.encounter_class_to_omop.concept_id, 0)` — 21 entry | code as-is (broken) | hardcode IMP/AMB/EMER | hardcode IMP/EMER/default 9202 | DB concept lookup | hardcode 5-code, default 9202 |
| `visit_start_date` | `(v.period_start::timestamptz AT TIME ZONE 'UTC')::date` | cast(start, date) | period.start или epoch 0 | Parse(Period.Start) | period.start или skip | split('T')[0] |
| `visit_start_datetime` | `(v.period_start::timestamptz AT TIME ZONE 'UTC')` | start | period.start | — | period.start | period.start |
| `visit_end_date` | `(COALESCE(period_end, period_start)::timestamptz AT TIME ZONE 'UTC')::date` | cast(end, date) | period.end или epoch 0 | Parse(Period.End) | period.end или now() для STILL_PATIENT | split('T')[0] |
| `visit_end_datetime` | same w/o ::date | end | period.end | — | period.end | period.end |
| `visit_type_concept_id` | **`32827`** ('EHR encounter record') | — | `44818518` | `32817` | derived from status | `44818518` |
| `provider_id` | `referenceToId(v.performer_ref)` — first participant | — | participant first | Provider object FromServiceProvider.display | participant | filter by `ATND` type |
| `care_site_id` | `referenceToId(v.service_provider_ref)` | — | IdMapping(serviceProvider) | **Provider from display** (нет care_site) | serviceProvider | `int(serviceProvider.reference.split('/')[1])` |
| `visit_source_value` | **`v.id`** (Encounter UUID) | code as-is | Encounter.id | `Encounter.Class.Code` | — | `type[0].coding[0].code` (SNOMED) |
| `visit_source_concept_id` | `0` константа | code as concept_id (broken) | — | — | — | `0` |
| `admitted_from_concept_id` | `0` константа | hospitalization.admit→code | — | — | post_process_map deferred | `0` |
| `admitted_from_source_value` | `v.admit_source_code` | — | — | — | (deferred) | `hospitalization.admitSource.coding[0].code` |
| `discharged_to_concept_id` | `0` константа | hospitalization.discharge→code | — | `0` | post_process_map | 4-code switch home/snf/rehab/exp |
| `discharged_to_source_value` | `v.discharge_disposition_code` | — | — | — | — | `display` |
| `preceding_visit_occurrence_id` | `referenceToId(v.part_of_ref)` | — | — | — | visit_detail | None |

## 4. Различия

### 4.1. ⚠️ IG fml — R5-only и сломан
[`EncounterVisit.fml:26–43`](../../refs/refs/fhir-omop-ig/input/maps/EncounterVisit.fml) использует:
- `src.actualPeriod` — R5 (R4 — `period`)
- `src.admission` — R5 (R4 — `hospitalization`)
- `src.class.coding.code` — в R4 `Encounter.class` это `Coding [1..1]` (НЕ CodeableConcept), правильно `class.code`. В R5 же `class` стал `CodeableConcept`, и `class.coding.code` корректен.

Наш view ([Encounter__visit_occurrence.view.json:15](../views/Encounter__visit_occurrence.view.json)) знает это и явно документирует: "Encounter.class is a Coding [1..1] (not a CodeableConcept), so use class.code directly — NOT class.coding.first().code." ✅

Также fml пишет `tgt.visit_source_concept_id = a` где `a` — строковый код (например "IMP"). visit_source_concept_id это integer FK на Concept. Type-violation. IG fml — **broken skeleton, не source of truth**.

> **Note для всех остальных ревью:** IG `.fml` файлы — R5, обычно skeleton. Не доверять, ориентироваться на pagecontent.

### 4.2. ⚠️ Spec ≠ implementation: `visit_type_concept_id`
SQL [`Encounter__visit_occurrence.sql:19`](../etl/Encounter__visit_occurrence.sql):
```sql
32827  AS visit_type_concept_id,   -- 'EHR encounter record'
```
Edge JSON [строка 328](../edges/Encounter__visit_occurrence.json) `constant: 32817`. Edge JSON `vocabularies[visit_type_concept]` (757–774) — **никакого 32827**, только 32817/44818518.

Verified в Athena:
```
32817   EHR                                Type Concept   S
32827   EHR encounter record               Type Concept   S    ← мы используем, более специфичный
44818518 Visit derived from EHR record    Visit Type    NULL
```

**32827 — точное название**, "EHR encounter record". Это лучший выбор для FHIR Encounter (а не для FHIR Observation/Procedure, например). И наш cdm.* reference тоже использует 32827.

> **Action [HIGH]:** обновить `Patient__visit_occurrence.json` edge JSON: `constant: 32827`, добавить в `vocabularies[visit_type_concept]` entry `{32827, "EHR encounter record", "OMOP-recommended for Encounter records (CDM v5.4)"}`. Удалить `constant: 32817`-ассоциированную ссылку на FhirToCdm как "our" (мы 32817 не используем).

### 4.3. ⚠️ Spec ≠ implementation: visit_source_value
SQL пишет `v.id AS visit_source_value` (= Encounter UUID). Edge JSON `fields[visit_source_value]` (526–528) обещает `Encounter.class.code`. Это **opposite**: то что обещает JSON — то что делает FhirToCdm/fhir-x-omop, а у нас наоборот сохраняется ID (как omoponfhir/NACHC).

UUID в visit_source_value — это формальный traceability identifier (часто наиболее ценно для дебага). Class code в нашем pipeline уже доступен через `staging.encounter_visit.class_code` или из linked staging row. UUID более информативен для join-back.

> **Action [MED]:** обновить edge JSON — `fhir_path: "Encounter.id"`, `notes: "Encounter UUID for traceability; FhirToCdm/fhir-x-omop use class.code instead"`.

### 4.4. **303 visit_concept_id mismatches — не наш баг, а Synthea FHIR exporter**
Distribution mismatch (наш ← ref):
```
9202  ← 8870    287 строк (мы: Outpatient Visit, ref: Emergency Room - Hospital)
9201  ← 8676     11 строк (мы: Inpatient Visit, ref: Nursing Facility)
581476 ← 8546     5 строк (мы: Home Visit, ref: Hospice)
```

Анализ: для всех 287 строк `staging.encounter_visit.class_code = 'AMB'`. Reference cdm.visit_occurrence — построен из Synthea CSV колонки `ENCOUNTERCLASS`, где значения более гранулярные (`urgentcare`, `wellness`, `hospice`, `snf`, etc.). **Synthea FHIR-экспортёр коллапсит**:
- CSV `urgentcare` → FHIR `class.code=AMB`
- CSV `snf` → FHIR `class.code=IMP`
- CSV `hospice` → FHIR `class.code=HH`

Гранулярность потеряна **на входе** нашего pipeline. cm.encounter_class_to_omop имеет entries для `urgentcare`/`snf`/`hospice`, но **наш view получает только AMB/IMP/HH из FHIR**, эти entries бесполезны.

Решение: **использовать `Encounter.type[0].coding[0].code`** (SNOMED code, более специфичный). Наш view уже извлекает это в колонку `type_code`, но SQL **не использует** её. fhir-x-omop делает именно это для `visit_source_value`.

```sql
-- предложение: visit_concept_id = COALESCE(type-based-lookup, class-based-lookup, 0)
```

> **Action [MED]:** добавить fallback концепт-резолюшен через SNOMED type-code. Завести `cm.encounter_type_snomed_to_omop` ConceptMap. Можно автогенерировать из существующих `vocab.concept WHERE concept_class_id='Visit' AND concept_code IN (Synthea-SNOMED-codes)`.

### 4.5. ⚠️ `cm.encounter_class_to_omop` богаче и расходится с edge JSON vocabularies
`cm.*` материализованная таблица — 21 entry. Edge JSON `vocabularies[visit_type]` — 10 entry. Расхождения:

| code | cm.* | edge JSON | Athena verified |
|---|---|---|---|
| `IMP` | 9201 ✓ | 9201 ✓ | 9201 Inpatient Visit S |
| `AMB` | 9202 ✓ | 9202 ✓ | 9202 Outpatient Visit S |
| `EMER` | 9203 ✓ | 9203 ✓ | 9203 Emergency Room Visit S |
| `HH` | 581476 | 581476 (note: "fhir-x-omop uses 581379") | 581476 Home Visit S, 581379 Inpatient Critical Care Facility S |
| `VR` | **722455 Telehealth** | **9202** Outpatient ❌ | 722455 Telehealth S |
| `SS` | **8870 Emergency Room - Hospital** | **9202** Outpatient ❌ | 8870 ER-Hospital S |
| `OBSENC` | 9202 | 9201 ❌ | — |
| `FLD` | 581476 | 9202 ❌ | — |
| `ACUTE` | 9201 ✓ | 9201 ✓ | — |
| `wellness` | 9202 (lowercase, не в JSON) | — | — |
| `outpatient` | 9202 (lowercase) | — | — |
| `inpatient` | 9201 (lowercase) | — | — |
| `urgentcare` | 8870 (lowercase) | — | — |
| `virtual` | 722455 (lowercase) | — | — |
| `snf` | 8676 (lowercase) | — | — |
| `NONAC` | 42898160 Non-hospital | — | — |
| `PRENC` | 9202 | — | — |
| `hospice` | 8546 Hospice | — | — |

**cm.* — правильнее**. Edge JSON `vocabularies` устарели. Также: edge JSON для `HH` говорит "fhir-x-omop uses 581379 (Home Health)" — в Athena **581379 = "Inpatient Critical Care Facility"**, не "Home Health". **Ещё одна misnamed concept в edge JSON.**

> **Action [HIGH]:** synchronize edge JSON `vocabularies[visit_type]` с фактическим `cm.encounter_class_to_omop`. Удалить misnamed 581379 "Home Health".

### 4.6. visit_type_concept_id derivation — fixed vs derived
ETL-German динамически вычисляет visit_type_concept_id из Encounter.status (с поддержкой `CONCEPT_STILL_PATIENT` для пациентов в реанимации). Все остальные — константа. Наш подход (константа 32827) проще и достаточен для Synthea, но теряет нюанс "ещё в больнице / выписан".

> **Note:** для production с обработкой `status=in-progress` стоит подумать о derivative concept_id, но это вторичная задача.

### 4.7. preceding_visit_occurrence_id — у нас есть, у большинства нет
SQL: `referenceToId(v.part_of_ref)` — пишем хеш `Encounter.partOf`. Это **уникально для нашего pipeline**: ни fhir-x-omop, ни FhirToCdm, ни omoponfhir не пишут это поле. ETL-German вместо preceding_visit_occurrence_id создаёт visit_detail-строки.

OMOP конвенция: preceding_visit_occurrence_id для **последовательных** визитов одного эпизода (ER→Inpatient transition). FHIR `partOf` — для **вложенных** визитов (child encounter is part of parent). Семантически разные. **Мы маппим неправильно** строго говоря.

> **Action [LOW]:** либо удалить колонку (всегда NULL = like ref), либо документировать что мы используем partOf как preceding (semantic mismatch).

### 4.8. UTC normalization — мы единственные кто это делает
SQL [строки 13–17](../etl/Encounter__visit_occurrence.sql) делает `period_start::timestamptz AT TIME ZONE 'UTC'`. Synthea FHIR пишет `+02:00` (java-машина запуска), CSV — UTC. Без этого было бы 287+ date mismatches на одну только разницу дня. **Очень умный трюк**, никто из refs так не делает. Однако работает только потому что мы знаем источник = Synthea. Production EHR из разных таймзон — отдельная история.

> **Note:** сохранить, добавить документацию.

### 4.9. Hospitalization concept_ids — все 0
Synthea не emit hospitalization.admitSource или dischargeDisposition, поэтому 0 не проявляется. На любом другом EHR — нужно подключить ConceptMap для UB-04 admission types и discharge dispositions. fhir-x-omop hardcode 4-code map (home/snf/rehab/exp). Достаточный для FHIR sample data, для production — Athena `vocab.concept WHERE vocabulary_id='UB04 Pt dis status'`.

### 4.10. visit_detail для partOf / location transfers — у нас НЕ реализовано
`mapspec/edges/` не содержит Encounter→visit_detail edge. ETL-German делает это (lines 519–571 в EncounterInstitutionContactMapper). Наш pipeline не различает inpatient + ICU transfer как два visit_detail-строки. Известный gap.

> **Note:** возможно стоит завести `Encounter__visit_detail` как 30-й edge в дальнейшем.

## 5. Concept resolution

### `cm.encounter_class_to_omop` (21 entry)
Полностью verified:
- HL7 v3 codes (IMP/AMB/EMER/HH/VR/SS/ACUTE/NONAC/PRENC/OBSENC/FLD) ✓
- lowercase Synthea CSV variants (для совместимости с CSV pipeline, бесполезные для нашего FHIR-пути) ✓
- additional (hospice/snf/urgentcare/wellness/virtual) ✓

### `cm.encounter_class_to_omop` vs reference (cdm.visit_occurrence)
6388/6388 совпадение по count. 6085/6388 (95%) совпадение по visit_concept_id. 303 расхождения объяснены §4.4 (Synthea FHIR information loss).

### visit_type_concept (никакой ConceptMap)
Hardcoded 32827. Reference тоже 32827.

### discharge_disposition (никакой ConceptMap)
Hardcoded 0. Нет дата для тестов.

## 6. Action items

1. **[HIGH] обновить edge JSON `vocabularies[visit_type]`** — синхронизировать с `cm.encounter_class_to_omop` (21 entry, правильные concept_ids). Удалить misname "581379 Home Health" (это "Inpatient Critical Care Facility").

2. **[HIGH] исправить `visit_type_concept_id` константу** — edge JSON говорит 32817, SQL пишет 32827. Поправить JSON на 32827 + добавить альтернативу в `vocabularies[visit_type_concept]`.

3. **[HIGH] синхронизировать `visit_source_value`** — JSON говорит `Encounter.class.code`, SQL пишет `v.id`. Обновить JSON на `Encounter.id` + notes.

4. **[MED] type-code fallback для visit_concept_id** — использовать `staging.encounter_visit.type_code` (SNOMED) как дополнительный источник для дисамбигуации AMB→urgentcare→ER, AMB→wellness→outpatient, etc. Завести `cm.encounter_type_snomed_to_omop`. Решит 303 mismatch.

5. **[MED] document UTC trick** — добавить в SQL header comment объяснение почему `AT TIME ZONE 'UTC'` нужен для Synthea и какой ofset. Сейчас слегка spelled out, но не на public-доступном месте.

6. **[LOW] preceding_visit_occurrence_id semantic** — либо удалить (always NULL like ref), либо документировать что мы маппим `partOf` (вложенность) на `preceding` (последовательность) — semantic mismatch.

7. **[LOW] visit_detail edge** — завести в `mapspec/edges/Encounter__visit_detail.json` для будущей поддержки transfers. Сейчас отсутствует.

8. **[LOW]** добавить `Encounter.diagnosis` мониторинг — Synthea кладёт diagnoses в condition_occurrence, но FHIR Encounter.diagnosis также может содержать ICD/SNOMED. Сейчас игнорируем.

## 7. Verification

```
ours / ref:    6388 / 6388 rows  ✅
join by source_value: 6388  ✅
only_ours / only_ref / sd_mismatch / ed_mismatch: 0 / 0 / 0 / 0  ✅
vc_mismatch:   303 (Synthea FHIR information loss, не наш баг — см. §4.4)
type_concept_id: 32827 в обоих, all 6388  ✅
visit_concept distribution:
  ours:    9202=6072, 9203=176, 722455=77, 9201=58, 581476=5
  ref:     9202=5785, 8870=287, 9203=176, 722455=77, 9201=47, 8676=11, 8546=5
  delta:   +287 9202 (AMB collapse), +11 9201 (IMP collapse), +5 581476 (HH collapse)
```

## 8. Cross-cutting (для goal.md)

- **IG `.fml` файлы — для FHIR R5**, наш pipeline R4. Расхождения в field names (`actualPeriod` vs `period`, `admission` vs `hospitalization`, etc.). Везде учитывать.
- **Source-data limitations через Synthea FHIR exporter** — мы получаем меньше гранулярности чем reference cdm.* (который из CSV). Это нашего бага не отражает; нужно сделать диф-tooling, который различает "source-data limitation" от "our-bug".
- **UTC timezone normalization** — нам нужно везде где есть `*_datetime` колонки. Сейчас только в Encounter сделано явно. Проверить Procedure (`performedPeriod`), Observation/Measurement (`effective[x]`), Medication* (`effectivePeriod`).
- **cm.* материализованные данные RICHER, чем edge JSON `vocabularies[]`**. Sync direction: cm → JSON (правда обычно), но проверять конкретику.
