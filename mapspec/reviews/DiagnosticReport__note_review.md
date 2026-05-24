# DiagnosticReport → note — review

## 1. Summary

DR → OMOP `note` таблица — для clinical document content. **Самый "толстый" DR-маршрут**: все 10900 DR пишутся в note (если есть text/conclusion/code_text).

**Validation**: cdm_ours_fhir.note: **10900 строк** (100% DRs становятся notes).

Главные находки:
1. **Сильнейшая base64-обработка** — `convert_from(decode(presented_data, 'base64'), 'UTF-8')` для извлечения текста из FHIR `presentedForm.data`. Никто из refs так не делает.
2. **Hardcoded constants**: `note_type_concept_id = 32817 (EHR)`, `encoding_concept_id = 32678 (UTF-8)`, `language_concept_id = 4180186 (English)`. Все 3 проверены в Athena — корректны.
3. **note_class_concept_id** через Maps-to walk на LOINC — LOINC document class → OMOP concept. Без domain filter (любой standard concept).
4. **`cdm.note` reference table не существует** — невозможно валидировать (см. cross-cutting).

## 2. Reference inventory

| Ref | Подход |
|---|---|
| **ETL-German** | `DiagnosticReportMapper` — preferred path для clinical notes. Использует `presentedForm` extension. |
| **fhir-omop-ig** | Нет fml для DR→note. |
| **omoponfhir** | Нет dedicated note mapper. |
| **NACHC** | NoteService — простой text-based extractor. |

## 3. Side-by-side

| OMOP column | Наш |
|---|---|
| `note_id` | `referenceToId(v.id)` |
| `person_id` | `referenceToId(subject_ref)` |
| `note_date` | `effective_dt::date` (нет COALESCE с period_start!) |
| `note_type_concept_id` | **32817** EHR constant |
| `note_class_concept_id` | `COALESCE(LOINC Maps-to std, 0)` |
| `note_title` | `left(code_text, 250)` |
| `note_text` | `COALESCE(base64-decoded presentedForm.data, conclusion, code_text, '')` |
| `encoding_concept_id` | **32678** UTF-8 constant |
| `language_concept_id` | **4180186** English constant |
| `provider_id` | `referenceToId(performer_ref)` |
| `visit_occurrence_id` | `referenceToId(encounter_ref)` |
| `note_source_value` | `left(code_loinc, 50)` |

WHERE: `effective_dt IS NOT NULL AND (presented_data IS NOT NULL OR conclusion IS NOT NULL OR code_text IS NOT NULL)` — все 10900 проходят.

## 4. Различия

### 4.1. ⚠️ Hardcoded `language_concept_id = 4180186` (English)
Athena confirms: `4180186 = "English language"` (SNOMED Qualifier Value, standard). **Корректный концепт.** Но **жёстко привязан к английскому** — для не-английских EHR будет нужно localize.

> **Note:** OK для Synthea (en-US). Production multi-language — добавить detection (например `Bundle.language` или `Patient.communication`).

### 4.2. ⚠️ `encoding_concept_id = 32678` (UTF-8)
Athena: `32678 = "UTF-8"` (Metadata vocabulary). Correct. Тоже жёсткая константа. Не блокер.

### 4.3. Нет UTC normalization
Та же проблема как в Observation edges — `effective_dt::date` без `AT TIME ZONE 'UTC'`. Если присутствует timezone offset, дата может shift.

### 4.4. base64 decode без error handling
SQL [строка 16](../etl/DiagnosticReport__note.sql): `convert_from(decode(v.presented_data, 'base64'), 'UTF-8')`. Если `presented_data` не valid base64 — PG throws exception, INSERT fails. Synthea даёт valid base64 всегда, так что не проявляется. Real EHR с corrupt content — будет crash.

> **Action [LOW]:** обернуть в try/catch (через `CASE WHEN can_decode THEN ... ELSE NULL END` или PL/pgSQL function).

### 4.5. `cdm.note` отсутствует в reference
Reference cdm.* не содержит таблицу `note`. Невозможно валидировать. Synthea CSV не имеет note data, поэтому `load-cdm-reference.ts` не строит её. **Cross-cutting issue.**

## 5. Action items

1. **[LOW] error handling для base64 decode** — защитить от crash на corrupt data.
2. **[LOW] UTC normalization** для date.
3. **[LOW] language detection** — Bundle.language или Patient.communication. На сейчас English-only.
4. **[NOTE] нет reference валидации** для note. Cross-cutting.

## 6. Verification

```
staging.diagnosticreport_note: 10900
cdm_ours_fhir.note: 10900 (100%)
note_class_concept_id != 0: 10900 (все LOINCs из Synthea имеют Maps to)
```

cdm.note таблица **не существует** в reference. Single-source validation.

## 7. Cross-cutting

- **note таблица — uniquely наш edge** среди других DR-маршрутов; cdm.* не покрывает.
- **base64 decode без try/catch** — общий defensive-coding gap.
- **Hardcoded language** — везде где есть language_concept_id (note + потенциально drug_exposure) стоит unify decision.
