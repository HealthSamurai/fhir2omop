# Patient → observation_period — review

## 1. Summary

`observation_period` определяет интервалы, в которые person "observable" — данные пишутся, отсутствие записи означает отсутствие событий. Не строится напрямую из `Patient`-полей — **деривативная таблица** из event-данных. У нас edge **documented**, фактически **implemented** ([SQL](../etl/Patient__observation_period.sql) есть).

**На нашей 100-Synthea-когорте: 105 строк**, по одной на person, `period_type_concept_id=44814724`, диапазон 1943-12-30…2026-05-21.

**Валидация против reference невозможна** — `cdm.observation_period` НЕ СУЩЕСТВУЕТ в нашем reference-схеме `cdm.*` (`script/load-cdm-reference.ts` строит из Synthea CSV только 10 таблиц: condition_occurrence, death, device_exposure, drug_exposure, location, measurement, observation, person, procedure_occurrence, visit_occurrence). Это сквозная проблема — затронет также `payer_plan_period`, `care_site`, `provider`, и все era-таблицы.

Главные находки: (1) edge JSON содержит неправильное название `44814723`, (2) edge JSON приписывает FhirToCdm "gap merging" которого там нет (заглушка), (3) наш SQL агрегирует **только по visit_occurrence**, в то время как OMOP-конвенция — по всем event-таблицам.

## 2. Reference inventory

| Ref | File | Стратегия |
|---|---|---|
| **fhir-omop-ig** (primary, FSH only) | [`fhir-omop-ig/input/fsh/ObservationPeriod.fsh`](../../refs/refs/fhir-omop-ig/input/fsh/ObservationPeriod.fsh) | Logical-модель: 5 колонок, все NOT NULL. Ни .fml ни .md intro нет. Никакого описания **как** строить периоды. |
| NACHC-fhir-to-omop | [`…/WriteOmopPersonToDatabase.java:69–82`](../../refs/refs/NACHC-fhir-to-omop/src/main/java/org/nachc/tools/fhirtoomop/omop/write/singlepatient/WriteOmopPersonToDatabase.java) | **Strategy A**: фиксированное окно 1900-01-01 ↔ 2100-01-01, hardcoded `44814724`. Пишется при создании person. Для production — **бессмысленно** (все 200 лет наблюдаемы). |
| FhirToCdm | [`CdmPersonBuilder.cs:459–478`](../../refs/refs/FhirToCdm/CdmPersonBuilder.cs) `BuildObservationPeriods(gap, observationPeriods)` | **Заглушка**: принимает параметр `gap` и массив periods, но в теле `yield return observationPeriods[0]` с метаданными `Id/PersonId/StartDate/EndDate/TypeConceptId` — без gap-merging и без итерации. Гэп-параметр игнорируется. Откуда массив берётся — отдельный код выше по стеку (не разобран). |
| ETL-German-FHIR-Core | [`post_process_observation_period.sql`](../../refs/refs/ETL-German-FHIR-Core/src/main/resources/post_processing/post_process_observation_period.sql) | **Strategy B**: SQL post-processing, UPSERT-расширение существующих границ. Источник дат — `cds_etl_helper.post_process_map` где `type='ENCOUNTER'`. **`period_type_concept_id = 32817 (EHR)`** константой, **не 44814724**. |
| omoponfhir | — | Не реализован (нет observation_period маппера в коде проекта). |
| fhir-to-omop-demo | — | Не реализован. |

**Реальный консенсус**: только 2 из 4+ refs пишут что-то осмысленное (NACHC — фиксированное окно, German — agg over encounters). Никто **не агрегирует по всем event-таблицам**, как требует OMOP-конвенция строго. Наш подход (агрегация по visit_occurrence) ближе всего к German.

## 3. Side-by-side

| OMOP column | Наш | NACHC | FhirToCdm | German | IG FSH |
|---|---|---|---|---|---|
| `observation_period_id` | `referenceToId(p.id)` — hash(Patient.id), **тот же что person_id** | `FhirToOmopIdGenerator.getId('observation_period', 'observation_period_id')` sequence | `observationPeriods[0].Id` (откуда-то выше) | UPSERT (нет явного id в SQL) | `1..1 integer` PK |
| `person_id` | `referenceToId(p.id)` | `personDvo.getPersonId()` | `observationPeriods[0].PersonId` | `omop_id` из post_process_map | `1..1 Reference(Person)` |
| `observation_period_start_date` | `MIN(vo.visit_start_date)` GROUP BY person | **`1900-01-01`** константа | `observationPeriods[0].StartDate` | `min(data_one)` из post_process_map | `1..1 date` |
| `observation_period_end_date` | `MAX(vo.visit_end_date)` | **`2100-01-01`** константа | `observationPeriods[0].EndDate` | `max(data_two)` | `1..1 date` |
| `period_type_concept_id` | **`44814724`** константа | `44814724` константа | `observationPeriods[0].TypeConceptId` (динамически) | **`32817`** ('EHR') константа | `1..1 code` |

Условие WHERE: у нас `JOIN cdm_ours_fhir.visit_occurrence` — пациенты без визитов **выпадают** (не получают observation_period). NACHC пишет для всех. German пишет для всех у кого есть encounter-записи в post_process_map. У нас — то же самое de-facto, потому что Synthea гарантирует ≥1 encounter на patient.

## 4. Различия

### 4.1. ⚠️ Невозможно валидировать против reference
В `cdm.*` (oracle из Synthea CSV) **нет observation_period**. `script/load-cdm-reference.ts` строит 10 таблиц, observation_period не в их числе. Это значит:
- diff-страница UI `/mapspec/Patient/observation_period` не сможет показать reference column
- любые claim в edge JSON про "правильность" — не проверяется автоматически
- то же относится к `Coverage/payer_plan_period`, `Practitioner/provider`, `PractitionerRole/provider`, `Organization/care_site`, `Location/care_site`

> **Action [HIGH, сквозной]:** в каждом ревью отмечать, валидируется ли против `cdm.*`. Возможно, имеет смысл расширить `load-cdm-reference.ts` или явно отдокументировать в `mapspec/GAPS.md`, что эти 6+ edge'ей "single-source" (только наш cdm_ours_fhir, без oracle).

### 4.2. ⚠️ Edge JSON: 44814723 называется неправильно
`mapspec/edges/Patient__observation_period.json:179–183`:
```
44814723 → "Period while enrolled in insurance"
```
Athena `vocab.concept`:
```
44814723 → "Period while enrolled in study"      Obs Period Type
```

"insurance" сюда никак не относится — это для study-enrollment. Insurance-периоды — это `payer_plan_period`, отдельная таблица с собственным `payer_plan_period_id` и без понятия "period type concept".

> **Action [HIGH]:** исправить в edge JSON.

### 4.3. ⚠️ Edge JSON приписывает FhirToCdm "gap merging" — этого там нет
`mapspec/edges/Patient__observation_period.json:64,108–109` ссылается на FhirToCdm `BuildObservationPeriods()` "with gap merging" / "configurable gap parameter". Реальность ([`CdmPersonBuilder.cs:465–478`](../../refs/refs/FhirToCdm/CdmPersonBuilder.cs)):
```csharp
public virtual IEnumerable<ObservationPeriod> BuildObservationPeriods(int gap, EraEntity[] observationPeriods) {
    if (observationPeriods.Length > 0) {
        yield return new ObservationPeriod {
            Id = observationPeriods[0].Id,
            PersonId = observationPeriods[0].PersonId,
            StartDate = observationPeriods[0].StartDate,
            EndDate = observationPeriods[0].EndDate.Value,
            TypeConceptId = observationPeriods[0].TypeConceptId
        };
    }
}
```
Принимает `gap`, но **не использует**. Никакого слияния. Возвращает только первую запись. Имя функции вводит в заблуждение.

> **Action [HIGH]:** в edge JSON `fields[].sources` поправить комментарий: "BuildObservationPeriods signature suggests gap merging but body is a passthrough returning observationPeriods[0]". Если хочется реального референса гэп-мерджинга — `EraHelper` где-то в том же проекте делает периодизацию для drug_era/condition_era, но не для observation_period.

### 4.4. Мы агрегируем только по visit_occurrence — узкое определение
OMOP-конвенция (`CommonDataModel` docs, [Book of OHDSI ch.4](https://ohdsi.github.io/TheBookOfOhdsi/CommonDataModel.html#observation_period)):
> "...time during which a Person is at-risk to have clinical events recorded... bound by start/end as derived from the source data."

Что под "source data" — каждый ETL решает сам. ETL-Synthea (которому мы по идее follow) — считает по всем event-таблицам. Наш SQL ([`Patient__observation_period.sql:14–17`](../etl/Patient__observation_period.sql)) джойнит только `cdm_ours_fhir.visit_occurrence`. Возможные последствия:
- если у пациента есть Observation вне рамок encounter (например `effectiveDateTime` до первого визита) — теряется
- если есть Procedure без encounter — не учитывается
- Synthea гарантирует, что все события привязаны к encounter, так что **на нашей когорте проблемы нет**; на production EHR — может быть

> **Action [MED]:** добавить в SQL header comment про ограничение. Опционально — переписать на UNION ALL по всем event-таблицам:
> ```sql
> WITH event_dates AS (
>   SELECT person_id, visit_start_date AS d FROM cdm_ours_fhir.visit_occurrence
>   UNION ALL SELECT person_id, condition_start_date FROM cdm_ours_fhir.condition_occurrence
>   UNION ALL SELECT person_id, procedure_date FROM cdm_ours_fhir.procedure_occurrence
>   UNION ALL SELECT person_id, drug_exposure_start_date FROM cdm_ours_fhir.drug_exposure
>   UNION ALL SELECT person_id, measurement_date FROM cdm_ours_fhir.measurement
>   UNION ALL SELECT person_id, observation_date FROM cdm_ours_fhir.observation
> )
> SELECT person_id, MIN(d), MAX(d), 44814724 FROM event_dates GROUP BY 1;
> ```

### 4.5. End date для умерших — не ограничиваем death_date
ETL-German ([post_process_observation_period.sql:22–31](../../refs/refs/ETL-German-FHIR-Core/src/main/resources/post_processing/post_process_observation_period.sql)) делает UPSERT, который при наличии существующей записи **расширяет** период. Наш SQL — full TRUNCATE+INSERT, всегда новый `MAX(visit_end_date)`. Для deceased Synthea ставит последний encounter ≤ death_date, так что в нашей когорте проблемы нет. Но edge JSON `edge_cases` (строка 230) обещает "min(latest_event, death_date)". Не реализовано.

> **Action [LOW]:** либо реализовать `LEAST(MAX(vo.visit_end_date), d.death_date)` (LEFT JOIN cdm_ours_fhir.death), либо удалить обещание из edge JSON.

### 4.6. Один период на person — не поддерживаем gap merging / multiple periods
OMOP spec **допускает** несколько `observation_period` строк на person. Наш `GROUP BY p.id` гарантирует ровно одну. NACHC — тоже одна (но фиксированная). FhirToCdm — задизайнен на multiple (`IEnumerable<ObservationPeriod>`), но фактически возвращает одну (см. §4.3). German — тоже фактически одну на person через UPSERT.

Реальный production-сценарий с gap-merging бывает при больших промежутках "темноты" (пациент исчез из системы на 5 лет, потом вернулся — два периода). Synthea этого не симулирует. Не блокер.

### 4.7. `period_type_concept_id`: 44814724 vs 32817 — два валидных выбора
Verified:
```
44814724  Period covering healthcare encounters  Obs Period Type  Standard=NULL
32817     EHR                                    Type Concept     Standard='S'
44814725  Period inferred by algorithm           Obs Period Type  Standard=NULL
44814723  Period while enrolled in study         Obs Period Type  Standard=NULL
```
- `44814724` — семантически точнее ("период, выведенный из encounters")
- `32817` — более general ("источник = EHR"), что German использует

OHDSI Conventions phab no единого ответа. NACHC и наш — за 44814724, German — за 32817. Не блокер; **44814724 более информативен** для cohort tooling (ATLAS), которое может использовать period_type для фильтрации.

## 5. Concept resolution

Используется константа `period_type_concept_id = 44814724`. ConceptMap-а как такового нет — есть `vocabularies[].entries` в edge JSON (4 entry) с указанием альтернатив, но `cm.period_type` **не материализован** (нет файла `mapspec/profiles/period-type-to-omop.cm.json`). Это нормально, поскольку у нас константа.

Verified:
```
44814724  Period covering healthcare encounters   Obs Period Type   Standard=NULL  ← мы
44814723  Period while enrolled in study          Obs Period Type   Standard=NULL  (edge JSON ошибочно)
44814725  Period inferred by algorithm            Obs Period Type   Standard=NULL
32817     EHR                                     Type Concept      Standard='S'   (alternative — German)
```

Все четыре существуют. 44814724/3/5 — non-standard (Obs Period Type vocab), но это допустимо для type concept ID (Themis не требует standard concept для `*_type_concept_id`).

## 6. Action items

1. **[HIGH] исправить misname в edge JSON** `mapspec/edges/Patient__observation_period.json:179–183` — `44814723 source_display`/`target_concept_name` должны быть **"Period while enrolled in study"**, не "insurance".

2. **[HIGH] поправить ложное описание FhirToCdm** в `fields[start].sources` и `fields[end].sources`. Реальный код — passthrough без merging. Либо удалить ссылку, либо явно пометить "API signature suggests merging but body is stub".

3. **[MED] cross-cutting: явно задокументировать, что 6+ edge'ей не имеют reference в `cdm.*`** — observation_period, payer_plan_period, care_site, provider, episode, и т.д. Создать `mapspec/GAPS.md` или раздел в CLAUDE.md. Это **сквозное наблюдение**, поднимать в каждом следующем ревью затронутых таблиц.

4. **[MED] расширить SQL до UNION ALL по всем event-таблицам** (см. §4.4) либо явно задокументировать ограничение "visit_occurrence only" в SQL header comment.

5. **[LOW] cap end_date at death_date** для deceased — `LEAST(MAX(vo.visit_end_date), d.death_date)` с `LEFT JOIN cdm_ours_fhir.death d`. На Synthea не всплывает, но edge JSON это обещает.

6. **[LOW]** addObservation period_type альтернатив с правильными именами; либо удалить `concept_maps: ["period_type"]` из edge JSON (раз materialized cm.* нет — нечего ссылаться).

## 7. Cross-cutting findings (для goal.md)

- **6+ edge'ей не валидируются против `cdm.*`** (observation_period, payer_plan_period, care_site, provider, episode, era-таблицы). `load-cdm-reference.ts` строит только 10 таблиц. В каждом таком ревью писать явно "validation not possible vs cdm.*".
- `BuildObservationPeriods` в FhirToCdm — пример мисcleading-кода, где имя метода обещает gap-merging, а тело — passthrough. Стоит насторожиться к другим методам FhirToCdm с агрегирующими именами (например `BuildPayerPlanPeriods`, `BuildDeath`).
