# Condition → condition_occurrence — review

## 1. Summary

`condition_occurrence` — большая, primary, required. У нас edge **implemented** с самой сложной из всех edge'ей SQL — **домен-роутингом через `Maps to`-walk и vocab-priority fan-out**. Stage-1 view извлекает коды отдельными колонками по vocabulary (`code_snomed`, `code_icd10cm`, `code_icd9cm`, `code_icd10`, плюс evidence-варианты), Stage-2 делает приоритезированный union → resolve через `vocab.concept_relationship` `Maps to`.

**Validation на 100-Synthea-когорте**:
- staging.condition_occurrence: **4204 строки**
- cdm_ours_fhir.condition_occurrence: **946 строк** (3258 строк потеряны — см. §4.4)
- cdm.condition_occurrence: **946 строк** (та же фильтрация)
- 946 / 946 совпадение по `(condition_source_value, person_id, condition_start_date)` ✅
- 0 concept_mismatch, 0 type_mismatch ✅
- Всё в `condition_type_concept_id=32827` ('EHR encounter record'), `condition_status_concept_id=32893` ('Confirmed diagnosis')

Главные находки:
1. **3258 condition'ов теряются** при фильтрации `domain_id='Condition'` — это **скрытая domain-маршрутизация**, но мы не пишем их в observation/procedure/measurement (как ETL-German). Реальная потеря данных, замаскированная под "no domain routing" в narrative.
2. **Edge JSON `vocabularies[]` content fabricated**: `32902` назван "Active condition" — в Athena это "Primary diagnosis"; `encounter-diagnosis → 32817 EHR` — у нас на самом деле `32827 EHR encounter record`. **Spec ≠ impl + misnamed concepts.**
3. **IG `condition.fml` снова R5-skeleton**: `s.coding as sc → sc.code as a → tgt.condition_concept_id = a` — присваивает строку integer-у. И **`abdt`/`adt` typo** в строке 24 (FML ссылается на необъявленную переменную).
4. SQL не пишет `provider_id` (NULL), хотя edge JSON обещает `coalesce(asserter, recorder)`.

## 2. Reference inventory

| Ref | File | Подход | Заметки |
|---|---|---|---|
| **fhir-omop-ig** (primary) | [`condition.fml`](../../refs/refs/fhir-omop-ig/input/maps/condition.fml) (48 строк) | FML, R4/R5 mixed | Skeleton: person_id закомментирован, code/category/clinicalStatus присваиваются как code-string → concept_id (type-violation). **Bug в строке 24**: `tgt.condition_end_datetime = adt` — переменная `adt` не объявлена (объявлена `abdt`). FML не должен компилироваться. |
| omoponfhir | [`OmopCondition.java:1–620`](../../refs/refs/omoponfhir-omopv5-r4-mapping/src/main/java/edu/gatech/chai/omoponfhir/omopv5/r4/mapping/OmopCondition.java) | Bi-direction Java, наиболее полная среди refs | F→O: `ConceptService.fhirCode2OmopConcept` lookup. Onset: 9999-12-31 sentinel вместо skip. Category bidirectional через `OmopConceptMapping`. asserter only (без recorder fallback). |
| FhirToCdm | [`FhirToCdmMappings.cs:252–310`](../../refs/refs/FhirToCdm/FhirToCdmMappings.cs) `CreateConditionOccurrence` | C# .NET | DB `LookupCode()` — **итерирует все `code.Coding` entries, пишет отдельную строку per coding**. Hardcoded `type_concept_id = 32817`. Crashes on missing `onsetDateTime` (no fallback). |
| ETL-German-FHIR-Core | [`ConditionMapper.java:1–1654`](../../refs/refs/ETL-German-FHIR-Core/src/main/java/org/miracum/etl/fhirtoomop/mapper/ConditionMapper.java) | Java, **наиболее зрелая** | `FindOmopConcepts` с **полным domain-routing**: Condition→cd_occ, Observation→observation, Procedure→procedure, Measurement→measurement. ICD-10-GM + ORPHA + ICD-10-CM. **Severity / bodySite / stage** превращаются в дополнительные observation-записи (qualifier_concept_id). Diagnostic confidence ICD-10-GM extension → condition_status_concept_id. Multi-coding → multi-row. |
| NACHC | [`OmopConditionOccurrenceBuilder.java:1–66`](../../refs/refs/NACHC-fhir-to-omop/src/main/java/org/nachc/tools/fhirtoomop/omop/person/factory/builder/condition/OmopConditionOccurrenceBuilder.java) | Java, простой | DB-backed concept lookup. **`type_concept_id = 32020`** (`EHR encounter diagnosis`, **non-standard** Condition Type vocab, не Type Concept). |
| fhir-x-omop | [`condition_occurrence.py:1–46`](../../refs/refs/fhir-x-omop/fhir_x_omop/to_omop/condition_occurrence.py) | Python `chidian.Mapper` | Type: encounter-diagnosis→32817, problem-list-item→32818 ('EHR administration record'?), health-concern→32819 ('EHR admission note'?). **Эти 32818/32819 это очевидно НЕ те concepts что нужно — фабрикация в коде fhir-x-omop**. Status: active→32893 (правильно), resolved→32897 ('Immediate cause of death' — не correct!), inactive→32896 ('Discharge diagnosis' — НЕ correct). |

## 3. Side-by-side

| OMOP column | Наш | IG fml | omoponfhir | FhirToCdm | German | fhir-x-omop |
|---|---|---|---|---|---|---|
| `condition_occurrence_id` | `referenceToId(v.id)` | TODO | IdMapping | Entity.Id sequence | sequence | int |
| `person_id` | `referenceToId(v.subject_ref)` | TODO | IdMapping | personIds dict | identifier/logicalId | int |
| `condition_concept_id` | UNION-ALL fan-out → `Maps to` walk → std.domain='Condition' | code as concept_id (broken) | fhirCode2OmopConcept | LookupCode + multi-row | FindOmopConcepts + domain routing | undefined |
| `condition_start_date` | COALESCE(onsetDateTime, onsetPeriod.start, recordedDate) | recorded then onset (last wins) | onset, 9999-12-31 sentinel | onsetDateTime crash | onset:dt, period, age, range | onsetDateTime |
| `condition_start_datetime` | то же ::timestamp | same | same | — | same | onsetDateTime |
| `condition_end_date` | COALESCE(abatementDateTime, abatementPeriod.end) | bug `adt` undefined | abatementPeriod.end | visit end date fallback | abatement.dt/period | abatementDateTime |
| `condition_type_concept_id` | `COALESCE(cat.concept_id, 32817)` через cm.fhir_condition_category_to_omop | code as concept_id (broken) | OmopConceptMapping | `32817` const | `32817` const | switch encounter→32817/PL→32818/HC→32819 |
| `condition_status_concept_id` | `COALESCE(NULLIF(vstat.concept_id, 0), NULLIF(cstat.concept_id, 0), 0)` (prefer verification) | clinicalStatus.code as concept_id | — | — | diagnostic confidence ext | switch active→32893/resolved→32897/inactive→32896 |
| `condition_status_source_value` | `v.clinical_status_code` | — | — | — | diagnostic confidence | — |
| `stop_reason` | `v.abatement_string` (без труncate!) | — | — | — | — | `note[0].text` |
| `provider_id` | **`NULL::bigint`** (no impl) | — | asserter only | — | — | recorder |
| `visit_occurrence_id` | `referenceToId(v.encounter_ref)` | — | — | — | — | — |
| `visit_detail_id` | NULL | — | — | same as visit_occurrence_id | — | same as visit_occurrence_id |
| `condition_source_value` | `r.src_code` (chosen by priority) | — | first coding | each coding (multi-row) | each coding | — |
| `condition_source_concept_id` | `r.src_concept_id` | code as concept_id (broken) | concept_id | — | concept_id | — |

## 4. Различия

### 4.1. ⚠️ IG fml — broken
[`condition.fml`](../../refs/refs/fhir-omop-ig/input/maps/condition.fml):
- Строки 11–16 закомментированы (id, subject).
- Строки 17–21: `sc.code as a -> tgt.condition_concept_id = a` — присваивает строковый код integer-у.
- Строка 22: `src.recordedDate as rd -> tgt.condition_start_datetime = cast(rd, "dateTime")` — нормальное, но без priority над onset (строка 23 ниже перезаписывает: "last match wins" в FML, что приводит к onset > recordedDate, что само по себе нормально).
- **Строка 24 — bug**: `src.abatement : dateTime as abdt -> tgt.condition_end_datetime = adt`. Объявлена `abdt`, но присваивается `adt`. Эта FML не должна компилироваться.
- src.evidence (41–47) — присваивает evidence.coding.code → condition_source_concept_id (string → integer, broken).

Не доверять.

### 4.2. ⚠️ ️Скрытая domain-маршрутизация: 3258 / 4204 потеряны
SQL делает `JOIN vocab.concept std ... AND std.domain_id = 'Condition'`. Это **inner join** на стандартный концепт **только в Condition домене**. Что отфильтровывает:
- SNOMED-коды с domain `Observation` (например `15777000` "Prediabetes" — это иногда Observation)
- SNOMED-коды с domain `Procedure` (если кодом обозначена процедура)
- SNOMED-коды с domain `Measurement`
- Любые SNOMED/ICD коды без `Maps to` relationship

На Synthea: 4204 → 946 (22%) выживают. **3258 строк теряются молча**, без логирования.

ETL-German ([`ConditionMapper.java:921–988`](../../refs/refs/ETL-German-FHIR-Core/src/main/java/org/miracum/etl/fhirtoomop/mapper/ConditionMapper.java)) делает то же отделение — но **пишет в нужную OMOP-таблицу по domain_id**: Observation, Procedure, Measurement. У нас этого нет — данные теряются.

> **Action [HIGH]:** реализовать domain-routing — три дополнительных INSERT-а:
> 1. `WHERE std.domain_id = 'Observation'` → `cdm_ours_fhir.observation`
> 2. `WHERE std.domain_id = 'Procedure'` → `cdm_ours_fhir.procedure_occurrence`
> 3. `WHERE std.domain_id = 'Measurement'` → `cdm_ours_fhir.measurement`
> 
> Альтернатива: логировать `noDomainMatchCounter` (как German), чтобы понимать масштаб потерь.

Narrative_md в edge JSON (строка 10) утверждает "Domain routing is not implemented -- all conditions go to condition_occurrence". **Это неправда** — мы **отбрасываем** non-Condition-domain коды, не пишем их в condition_occurrence. Narrative нужно обновить.

### 4.3. ⚠️ Edge JSON `vocabularies[]` content fabricated
Verified в Athena:
| Edge JSON claim | Athena truth |
|---|---|
| `condition_status.active → 32902 "Active condition"` | **32902 = "Primary diagnosis"** (Condition Status, S). "Active condition" вообще нет. |
| `condition_status.recurrence → 32902` | same — wrong concept_name |
| `condition_status.relapse → 32902` | same |
| `condition_type.encounter-diagnosis → 32817 "EHR"` | 32817 правильно "EHR", но **наш SQL использует 32827** "EHR encounter record" через cm.fhir_condition_category_to_omop |
| `condition_type.problem-list-item → 32840 "Problem list from EHR"` | 32840 = "EHR problem list" (правильнее без "from") |
| fhir-x-omop notes: `problem-list-item→32818 / health-concern→32819` | 32818 = "EHR administration record", 32819 = "EHR admission note" — fhir-x-omop **выбрал неправильные concept_ids** (близкие по номеру 32817 но другие по смыслу) |
| fhir-x-omop status: `inactive→32896, resolved→32897` | 32896 = "Discharge diagnosis", 32897 = "Immediate cause of death" — **полностью wrong** |

**Edge JSON vocabularies и references фабриковали concept-имена не сверяясь с Athena**. fhir-x-omop сам по себе пишет неправильные concept_ids — это **баг fhir-x-omop**, который наш edge JSON слепо документирует.

> **Action [HIGH]:** переписать `condition_status` vocabularies секцию с реальными Condition Status concepts:
> - `confirmed → 32893 "Confirmed diagnosis"` (что мы делаем)
> - `provisional → 32899 "Preliminary diagnosis"`
> - `resolved → 32906 "Resolved condition"`
> - Удалить 32902 "Active condition" — такого нет.
> 
> И переписать condition_type:
> - `encounter-diagnosis → 32827 "EHR encounter record"` (что мы делаем)
> - `problem-list-item → 32840 "EHR problem list"`
> - `health-concern → 32817 "EHR"` (default)

### 4.4. Status mapping: clinicalStatus vs verificationStatus priority
Наш SQL [строка 62](../etl/Condition__condition_occurrence.sql):
```sql
COALESCE(NULLIF(vstat.concept_id, 0), NULLIF(cstat.concept_id, 0), 0) AS condition_status_concept_id
```
Берёт **verificationStatus сначала, clinicalStatus в fallback**. Это сильнее обоснованно semantically — verificationStatus говорит "diagnostic confidence" (confirmed/provisional/unconfirmed/differential/refuted), что и есть OMOP "Condition Status". clinicalStatus говорит "lifecycle" (active/inactive/resolved), что больше про время.

ETL-German использует diagnostic confidence ICD-10-GM extension (свой стандарт). Никто из refs не делает COALESCE prefer-verification-status, как мы.

Все Synthea conditions имеют `verification_status_code='confirmed'`, маппится в 32893. ✅

### 4.5. View `code_snomed`/`code_icd10cm`/`code_icd9cm`/`code_icd10` fan-out — наш паттерн
View [`Condition__condition_occurrence.view.json:44–67`](../views/Condition__condition_occurrence.view.json) вытаскивает каждую vocabulary отдельной колонкой:
```
code.coding.where(system=%snomedSystem).code.first()
```

Это **архитектурно более чистый approach**, чем (a) coding.first() (порядок-зависимое) или (b) iterate-all-codings (multi-row). Никто из refs так не делает:
- FhirToCdm — iterates всё → multi-row
- omoponfhir — fhirCode2OmopConcept (один call, выбирает первый success)
- ETL-German — same pattern as omoponfhir
- fhir-x-omop — `code.coding[0]` (zero check)

Наш подход избегает order-of-codings hazard и явно приоритизирует SNOMED.

> **Note:** хороший паттерн, оставить, документировать как best practice.

### 4.6. Evidence fallback — наш уникальный паттерн
SQL union-ит `evidence_snomed` и `evidence_icd10cm` (prio 5 и 6) как last-resort. Никто из refs не пытается читать `Condition.evidence` для primary coding.

Когда полезно: когда clinician задокументировал основной diagnosis через `code` плохо/без code, но evidence имеет богатую SNOMED-аннотацию. Synthea evidence не emit-ит, так что наша когорта не активирует эту ветку.

### 4.7. `stop_reason` — не truncate до 20 чарактеров
Edge JSON `transform: "substring(abatementString, 0, 20)"`, OMOP колонка `varchar(20)`. SQL [строка 63](../etl/Condition__condition_occurrence.sql):
```sql
v.abatement_string AS stop_reason,
```
**Без truncation**. Если Synthea однажды эмитит abatementString длиннее 20 — INSERT упадёт с `value too long for type character varying(20)`.

> **Action [LOW]:** добавить `LEFT(v.abatement_string, 20)`.

### 4.8. provider_id всегда NULL
Edge JSON [строка 366](../edges/Condition__condition_occurrence.json) обещает `coalesce(resolveRef(asserter), resolveRef(recorder))`. SQL [строка 64](../etl/Condition__condition_occurrence.sql) пишет **`NULL::bigint`** жёстко.

Synthea conditions не имеют asserter/recorder, так что в нашей когорте всё равно null. Но **spec ≠ impl**.

> **Action [MED]:** либо добавить `COALESCE(referenceToId(v.asserter_ref), referenceToId(v.recorder_ref))` (плюс соответствующие колонки во view), либо обновить spec.

### 4.9. severity / bodySite / stage — игнорируются
Naсhe SQL не учитывает `Condition.severity`, `bodySite`, `stage`. ETL-German создаёт separate observation rows с qualifier_concept_id. У нас этого нет. Synthea эмитит severity иногда — мы теряем.

> **Action [LOW, follow-up]:** возможно завести отдельный edge `Condition_severity__observation` или extension к этому. Если есть use case.

## 5. Concept resolution

### `cm.fhir_clinical_status_to_omop` (6 entries)
```
active     → 0    "No matching concept"   ← но active это базовое состояние, странно
inactive   → 0
recurrence → 0
relapse    → 0
remission  → 0
resolved   → 32906 "Resolved condition"   ← единственная содержательная entry
```
**Из 6 кодов FHIR `condition-clinical` только `resolved` имеет смысл**. Остальные — 0. Reason: OMOP Condition Status больше про **diagnostic confidence** (confirmed/provisional), чем lifecycle. Поэтому SQL приоритизирует `vstat` (verificationStatus).

### `cm.fhir_verification_status_to_omop` (6 entries)
```
confirmed         → 32893  "Confirmed diagnosis"
provisional       → 32899  "Preliminary diagnosis"
differential      → 0
entered-in-error  → 0
refuted           → 0
unconfirmed       → 0
```
2 из 6 имеют content. Не полный, но **достаточно** для clinical use cases.

### `cm.fhir_condition_category_to_omop` (3 entries)
```
encounter-diagnosis → 32827 "EHR encounter record"
health-concern      → 32817 "EHR"
problem-list-item   → 32840 "EHR problem list"
```
Полное покрытие FHIR `condition-category` CodeSystem. ✅ **Лучше чем edge JSON spec** (который ошибочно указывает 32817 для encounter-diagnosis).

### Vocabulary lookup chain (для condition_concept_id)
Уникальный для нашего pipeline: priority union → `concept_relationship Maps to` → filter `standard_concept='S' AND domain_id='Condition'`. Это работает для Synthea (все 946 SNOMED-коды резолвятся), но **молча отбрасывает 3258** — см. §4.2.

## 6. Action items

1. **[HIGH] реализовать domain routing** — добавить 3 параллельных INSERT-а в observation/procedure/measurement для кодов с соответствующими domain_id. Не теряем 3258 строк (§4.2). Либо завести `noDomainMatchCounter` для логирования.

2. **[HIGH] переписать edge JSON `vocabularies[]`** — `condition_status` и `condition_type` содержат фабрикованные concept-имена. Verify против Athena. Особенно: 32902 ≠ "Active condition", 32817 ≠ что мы используем для encounter-diagnosis (мы используем 32827). См. §4.3.

3. **[HIGH] обновить narrative_md edge JSON** — заявление "all conditions go to condition_occurrence regardless of domain_id" неправда; мы отбрасываем non-Condition-domain.

4. **[MED] исправить `provider_id`** — либо добавить SQL извлечение из asserter/recorder, либо обновить edge JSON.

5. **[MED] truncate `stop_reason` до 20 chars** — `LEFT(v.abatement_string, 20)`. Сейчас потенциальный crash.

6. **[LOW]** добавить condition.severity / bodySite / stage обработку — либо как отдельные observation-ы (как German), либо документировать что не поддерживаем.

7. **[LOW]** добавить `Condition.evidence` поддержку как первичный source, не только fallback. Сейчас prio 5/6 — низкий приоритет, едва используется.

## 7. Verification

```
staging.condition_occurrence:  4204 строки (входной FHIR)
cdm_ours_fhir.condition_occurrence: 946 (22% выживание)
cdm.condition_occurrence:           946 (та же фильтрация)
diff by (csv, person_id, sd):       946 / 946 / 0 / 0  ✅
concept_mismatch:                   0  ✅
type_mismatch:                      0  ✅ (все 32827 в обоих)
status_concept_id distribution:     32893 → 946 (Confirmed diagnosis)
```

## 8. Cross-cutting (для goal.md)

- **Скрытая фильтрация по domain_id** в SQL может маскировать data loss. Везде, где есть `JOIN vocab.concept std ... AND std.domain_id = X` — проверить, не теряем ли строки. Сравнить `count(staging)` vs `count(cdm_ours_fhir)`.
- **Edge JSON `vocabularies[]` сделаны без верификации в Athena**. Уже видим misnamed concepts в Patient/death, Patient/observation_period, Encounter, и теперь Condition. Стоит автоматизировать — скриптом проверять `target_concept_id` против `vocab.concept WHERE concept_id IN (...)` и алертить расхождения.
- **fhir-x-omop как ref содержит фабрикованные concept_ids** (32818/32819 для condition type, 32896/32897 для status). Не следует копировать его hardcoded mappings без верификации.
- IG `.fml` файлы могут содержать **синтаксические баги** (undefined variables, type violations) — они skeleton/placeholder, не production code.
