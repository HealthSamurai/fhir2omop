# Goal — peer-review каждого edge против reference implementations

## Что делаем

Под каждый FHIR→OMOP edge (`mapspec/edges/<R>__<T>.json` + `mapspec/etl/<R>__<T>.sql` + `mapspec/views/<R>__<T>.view.json`) написать review-документ `mapspec/reviews/<R>__<T>_review.md`.

**Primary reference:** `refs/refs/fhir-omop-ig/` — HL7 Official FHIR↔OMOP IG.
- FSH logical models OMOP-таблиц: `input/fsh/<OmopTable>.fsh`
- StructureMap (FML) мапинги: `input/maps/<Resource>.fml`
- Narrative-объяснения: `input/pagecontent/StructureMap-<Map>-intro.md`
- Общая методология: `input/pagecontent/{F2OGeneralIssues,StrategiesBestPractices,CodeableConceptPattern,CodeMappingBasePattern,ValueAsConceptPattern,TerminologyServer,codemappings}.md`

**Secondary refs** (использовать где IG молчит или решение нетривиально):
- `refs/refs/FhirToCdm/` — OHDSI .NET, явные per-resource C# мапперы
- `refs/refs/NACHC-fhir-to-omop/` — Java ETL, обычно близко к Synthea
- `refs/refs/omoponfhir-v54-r4/` — обратное направление (OMOP→FHIR), полезно для проверки round-trip соглашений
- `refs/refs/ETL-German-FHIR-Core/` — немецкий MII, агрессивная нормализация
- `refs/refs/fhir2omop-cookbook/` — narrative cookbook от CodeX
- `refs/<name>.md` — pre-analyzed summaries по refs, читать ПЕРВЫМИ

## Структура каждого `<R>__<T>_review.md`

```markdown
# <R> → <T> — review

## 1. Summary
1–2 параграфа: что эта таблица представляет в OMOP, какой FHIR-источник, status (implemented/documented/stub) у нас.

## 2. Reference inventory
Таблица: ref → file → краткое описание подхода.

## 3. Side-by-side по полям
| OMOP column | Наш (mapspec/etl/<R>__<T>.sql) | IG (Allergy.fml ...) | FhirToCdm | NACHC | Verdict |
| --- | --- | --- | --- | --- | --- |

## 4. Различия
Где наш подход расходится с IG — почему, и можем ли подтянуть.

## 5. Concept resolution
Какие ConceptMap-ы используем мы vs IG (`codemappings.md`, `TerminologyServer.md`). Дыры в `cm.*`.

## 6. Action items
Маркированный список: что подкрутить в edge JSON / stage-1 view / stage-2 SQL. Указать конкретные строки.
```

## Workflow на один review

1. Открыть `mapspec/edges/<R>__<T>.json` — посмотреть `fields[]`, `references[]`, `vocabularies[]`.
2. Открыть наши `mapspec/views/<R>__<T>.view.json` и `mapspec/etl/<R>__<T>.sql`.
3. Найти соответствующий IG `.fml` + `*-intro.md`. Если прямого fml нет — взять FSH и общие doc-страницы.
4. Прогнать grep по `refs/refs/{FhirToCdm,NACHC-fhir-to-omop,ETL-German-FHIR-Core}/` для имени ресурса/таблицы.
5. Заполнить шаблон. Цитировать пути с `path:line`, лишних пересказов не лить.
6. В конце поставить в `goal.md` галочку `[x]` и закоммитить ревью + goal.md одним коммитом.

---

## Reviews — по одному edge

### Patient cluster
- [x] **Patient/person** → `mapspec/reviews/Patient__person_review.md`
  - IG primary: `input/maps/PersonMap.fml`, `pagecontent/StructureMap-PersonMap-intro.md`, `input/fsh/Person.fsh`
  - IG general: `F2OGeneralIssues.md`, `ValueAsConceptPattern.md` (для race/ethnicity)
  - Secondary: FhirToCdm `PersonMapper`, NACHC `PersonService`, ETL-German `person.sql`
  - Особое внимание: race/ethnicity (US Core extensions ↔ OMB), birth date splitting, gender concept_id, location_id linkage
- [x] **Patient/death** → `mapspec/reviews/Patient__death_review.md`
  - IG primary: `input/fsh/Death.fsh`; в PersonMap.fml death-колонки персоны
  - Secondary: FhirToCdm `DeathMapper`, NACHC death handling
  - Особое: deceasedBoolean vs deceasedDateTime, cause_concept_id (часто null)
- [x] **Patient/observation_period** → `mapspec/reviews/Patient__observation_period_review.md`
  - IG primary: `input/fsh/ObservationPeriod.fsh` (прямого fml нет)
  - Secondary: NACHC `ObservationPeriodService`, ETL-German period derivation
  - Особое: как считать start/end (по min/max encounter, по самой Patient, по claim period)
- [x] **Patient/location** → `mapspec/reviews/Patient__location_review.md`
  - IG primary: `input/fsh/Location.fsh` + PersonMap.fml address branch
  - Secondary: NACHC `LocationService`
  - Особое: дедупликация адресов, location vs care_site, ZIP/state parsing

### Encounter / Visit
- [x] **Encounter/visit_occurrence** → `mapspec/reviews/Encounter__visit_occurrence_review.md`
  - IG primary: `input/maps/EncounterVisit.fml`, `pagecontent/StructureMap-EncounterVisitMap-intro.md`, `input/fsh/VisitOccurrence.fsh`, `input/fsh/VisitDetail.fsh`
  - Secondary: FhirToCdm `VisitOccurrenceMapper`, NACHC `EncounterService`, ETL-German
  - Особое: class → visit_concept_id mapping, period.start/end, parent encounter (visit_detail), care_site_id, admitting/discharge providers

### Conditions / Procedures
- [x] **Condition/condition_occurrence** → `mapspec/reviews/Condition__condition_occurrence_review.md`
  - IG primary: `input/maps/condition.fml`, `pagecontent/StructureMap-ConditionMap-intro.md`, `input/fsh/ConditionOccurrence.fsh`, `input/fsh/ConditionEra.fsh`
  - Secondary: FhirToCdm `ConditionOccurrenceMapper`, NACHC `ConditionService`
  - Особое: onsetDateTime vs recordedDate vs abatement, condition_type_concept_id (encounter-diagnosis vs problem-list), category routing, ICD10→SNOMED через `cm.*`
- [x] **Procedure/procedure_occurrence** → `mapspec/reviews/Procedure__procedure_occurrence_review.md`
  - IG primary: `input/maps/Procedure.fml`, `pagecontent/StructureMap-ProcedureMap-intro.md`, `input/fsh/ProcedureOccurrence.fsh`
  - Secondary: FhirToCdm `ProcedureOccurrenceMapper`, NACHC `ProcedureService`
  - Особое: performedDateTime vs performedPeriod, modifier_concept_id, quantity

### Observations
- [x] **Observation/measurement** → `mapspec/reviews/Observation__measurement_review.md` ⚠️ **CRITICAL bug найден**: operator_concept_id `>` пишется как `4172703` (= equals), должен быть `4172704` (= greater than)
  - IG primary: `input/maps/Measurement.fml`, `pagecontent/StructureMap-MeasurementMap-intro.md`, `input/fsh/Measurement.fsh`
  - IG general: `CodeableConceptPattern.md`, `ValueAsConceptPattern.md`, `codemappings.md`, `TerminologyServer.md`
  - Secondary: FhirToCdm `MeasurementMapper`, NACHC `MeasurementService`, ETL-German `measurement.sql`
  - Особое: routing Observation→measurement vs observation (LOINC class, valueQuantity present), range_low/high, unit_concept_id (UCUM→concept), operator_concept_id
- [x] **Observation/observation** → `mapspec/reviews/Observation__observation_review.md` ⚠️ **Massive data loss**: 17730 / 21339 missing vs ref (83%!)
  - IG primary: `input/maps/Observation.fml`, `pagecontent/StructureMap-ObservationMap-intro.md`, `input/fsh/Observation.fsh`
  - Secondary: FhirToCdm `ObservationMapper`, NACHC `ObservationService`
  - Особое: value_as_string vs value_as_concept, qualifier_concept_id, что делать с component-ами не-measurement
- [x] **Observation_component/measurement** → `mapspec/reviews/Observation_component__measurement_review.md`
  - IG primary: Measurement.fml — секция fan-out по component
  - Secondary: FhirToCdm component handling, NACHC `ComponentMapper`
  - Особое: parent observation_id linking, BP-like patterns, наследование effectiveDateTime/encounter от parent
- [x] **AllergyIntolerance/observation** → `mapspec/reviews/AllergyIntolerance__observation_review.md`
  - IG primary: `input/maps/Allergy.fml`, `pagecontent/StructureMap-AllergyMap-intro.md`
  - Secondary: FhirToCdm `AllergyIntoleranceMapper`, NACHC `AllergyService`
  - Особое: почему observation, а не condition; reaction.manifestation как value_as_concept; severity; criticality

### DiagnosticReport (агрегатный — четыре edge'а)
- [x] **DiagnosticReport/measurement** → `mapspec/reviews/DiagnosticReport__measurement_review.md`
  - IG primary: `Measurement.fml` (DR обычно агрегирует Observation-ы)
  - Secondary: FhirToCdm `DiagnosticReportMapper`
  - Особое: extracting `result[]` → measurement rows, как избежать дублей с Observation→measurement
- [x] **DiagnosticReport/observation** → `mapspec/reviews/DiagnosticReport__observation_review.md`
  - IG primary: `Observation.fml` + DR-section в narrative
  - Особое: то же что выше, для observation-маршрута
- [x] **DiagnosticReport/procedure_occurrence** → `mapspec/reviews/DiagnosticReport__procedure_occurrence_review.md`
  - IG primary: `Procedure.fml`
  - Особое: когда DR порождает procedure (radiology/pathology), categorisation
- [x] **DiagnosticReport/note** → `mapspec/reviews/DiagnosticReport__note_review.md`
  - IG primary: `input/fsh/Note.fsh` + общие doc'и по note
  - Secondary: NACHC `NoteService`, mends-on-fhir (если есть)
  - Особое: presentedForm vs conclusion text, note_class_concept_id

### Medications (пять edge'ов с общим .fml)
- [x] **MedicationRequest/drug_exposure** → `mapspec/reviews/MedicationRequest__drug_exposure_review.md`
  - IG primary: `input/maps/medication.fml`, `pagecontent/StructureMap-MedicationMap-intro.md`, `input/fsh/DrugExposure.fsh`, `input/fsh/DrugEra.fsh`, `input/fsh/DoseEra.fsh`
  - Secondary: FhirToCdm `MedicationRequestMapper`, NACHC `MedicationService`, ETL-German
  - Особое: drug_type_concept_id для prescription, dosageInstruction parsing, sig, refills, days_supply
- [x] **MedicationAdministration/drug_exposure** → `mapspec/reviews/MedicationAdministration__drug_exposure_review.md`
  - IG primary: medication.fml (ветвь admin)
  - Особое: effective[x] handling, dosage.dose vs prescribed, route_concept_id
- [x] **MedicationDispense/drug_exposure** → `mapspec/reviews/MedicationDispense__drug_exposure_review.md`
  - Note: у нас status=stub (Synthea не emit)
  - IG primary: medication.fml (ветвь dispense)
  - Особое: quantity, daysSupply, whenHandedOver
- [x] **MedicationStatement/drug_exposure** → `mapspec/reviews/MedicationStatement__drug_exposure_review.md`
  - Note: у нас status=stub
  - IG primary: medication.fml (ветвь statement)
  - Особое: dateAsserted, taken (deprecated в R5), informationSource
- [x] **Medication/drug_exposure** → `mapspec/reviews/Medication__drug_exposure_review.md`
  - Note: contained Medication, у нас status=stub
  - IG primary: medication.fml
  - Особое: что делать когда Medication не contained, а отдельный ресурс; ingredient handling

### Immunization
- [x] **Immunization/drug_exposure** → `mapspec/reviews/Immunization__drug_exposure_review.md`
  - IG primary: `input/maps/ImmunizationMap.fml`, `pagecontent/StructureMap-ImmunizationMap-intro.md`
  - Secondary: FhirToCdm `ImmunizationMapper`, NACHC `ImmunizationService`
  - Особое: vaccineCode (CVX→RxNorm), drug_type_concept_id, lot_number, route

### Practitioners / Org / CareSite
- [x] **Practitioner/provider** → `mapspec/reviews/Practitioner__provider_review.md`
  - IG primary: `input/fsh/Provider.fsh` (нет fml)
  - Secondary: FhirToCdm `ProviderMapper`, NACHC `PractitionerService`
  - Особое: NPI/license parsing, specialty (qualification.code → concept_id)
- [x] **PractitionerRole/provider** → `mapspec/reviews/PractitionerRole__provider_review.md`
  - IG primary: Provider.fsh
  - Особое: PractitionerRole добавляет specialty/care_site; дедупликация с Practitioner edge
- [x] **Organization/care_site** → `mapspec/reviews/Organization__care_site_review.md`
  - IG primary: `input/fsh/CareSite.fsh`
  - Secondary: FhirToCdm `OrganizationMapper`, NACHC
  - Особое: organization.type → place_of_service_concept_id, location_id linkage
- [x] **Location/care_site** → `mapspec/reviews/Location__care_site_review.md`
  - IG primary: CareSite.fsh
  - Особое: когда Location едет в care_site, а когда в location; разделение от Organization-маршрута
- [x] **Location/location** → `mapspec/reviews/Location__location_review.md`
  - IG primary: `input/fsh/Location.fsh`
  - Особое: address[] parsing, geo coords, country/state concept_id

### Device / Specimen / Coverage
- [x] **Device/device_exposure** → `mapspec/reviews/Device__device_exposure_review.md`
  - IG primary: `input/fsh/DeviceExposure.fsh`
  - Secondary: NACHC `DeviceService`, FhirToCdm если есть
  - Особое: udiCarrier, type → device_concept_id (SNOMED)
- [x] **Specimen/specimen** → `mapspec/reviews/Specimen__specimen_review.md`
  - IG primary: `input/fsh/Specimen.fsh`
  - Особое: collection.collectedDateTime, type → specimen_concept_id, anatomic_site_concept_id
- [x] **Coverage/payer_plan_period** → `mapspec/reviews/Coverage__payer_plan_period_review.md`
  - Note: stub (Synthea не emit стандартный Coverage)
  - IG primary: `input/fsh/PayerPlanPeriod.fsh`
  - Secondary: FhirToCdm `CoverageMapper`, ETL-German
  - Особое: payer (Organization ref) → payer_source_value, period.start/end

---

## Top-3 critical fixes (2026-05-24)

1. ✅ **Operator concept bug fixed** — `mapspec/etl/Observation__measurement.sql:38–41` теперь `('>', 4172704)`. Synthea не активирует (нет comparator), но защита в действии.

2. ✅ **Observation/observation data loss fixed (+17625 строк)** — добавлен новый edge:
   - `mapspec/etl/Observation_component__observation.sql` (новый SQL)
   - `mapspec/edges/Observation_component__observation.json` (новый edge spec)
   - `script/etl-all.ts:62` (orchestrator: `Observation_component__observation` как `append`)
   - **Результат**: cdm_ours_fhir.observation 6755 → 24380; only_ref 17730 → **609** (97% совпадение с reference vs 17% до fix).

2a. ✅ **Component value extraction (PRAPARE answers + valueString)** — внутри 17625 added rows было 15922 row без value (только question, без answer):
   - `mapspec/views/Observation_component__measurement.view.json` — добавлены `component_value_code_system`, `component_value_code`, `component_value_text`, `component_value_string`
   - `mapspec/etl/Observation_component__observation.sql` — value_resolved CTE через `cm.fhir_system_to_omop_vocab` + Maps-to для answer codes; value_as_string из CC.text/valueString
   - **Результат**: было 15922 no-value → **0**. 15084 PRAPARE answers с value_as_concept_id; valueString тоже захватывается.

2b. ✅ **Parent panel filter в Observation_measurement / Observation_observation** — 1794+847 useless rows с NULL value (BP panel 85354-9, CBC, urinalysis panels — у parent нет value, только у components):
   - `mapspec/etl/Observation__measurement.sql:WHERE` — `value_number IS NOT NULL OR value_code IS NOT NULL OR value_text IS NOT NULL`
   - `mapspec/etl/Observation__observation.sql:WHERE` — same + value_string
   - **Результат**: measurement 40927 → 39133; observation 24380 → 23533. Полезного контента не потеряно — все values в дочерних rows через component-edges.

3. ✅ **Device CURRENT_DATE → manufactureDate** — больше не non-deterministic:
   - `mapspec/views/Device__device_exposure.view.json`: добавлены колонки `manufacture_date`, `expiration_date`
   - `mapspec/etl/Device__device_exposure.sql`: start/end dates из реальных device полей (98 distinct dates vs 1 до fix). Не совпадает с reference (ref берёт даты из procedures), но deterministic и device-attached.

---

## Прогресс
**29 / 29 готово. ВСЕ ревью завершены.** 🎉

Структура итоговых ревью в `mapspec/reviews/`:
- 11 standalone reviews (Patient cluster 4, Encounter, Condition, Procedure, Observation cluster 4)
- 4 DiagnosticReport reviews (короткие, share patterns)
- 1 combined `Medication_cluster_review.md` + 6 pointer-файлов (5 medication + Immunization)
- 1 combined `Practitioner_Org_cluster_review.md` + 5 pointer-файлов (Practitioner, PractitionerRole, Organization, Location×2)
- 3 standalone (Device, Specimen, Coverage)

## Summary of findings

### CRITICAL (real ETL bugs)
1. `mapspec/etl/Observation__measurement.sql:38` — `('>', 4172703)` → должно `4172704`. Пишет `=` вместо `>`.

### Data quality issues
- Observation/observation: 17730 missing rows vs ref (83% loss) — domain-filter слишком строгий.
- Condition/Procedure: 78% / 43% потеря строк из-за `domain_id='Condition/Procedure'` фильтра. Hidden domain-routing без записи в правильную таблицу.
- Device: `device_exposure_start_date = CURRENT_DATE` placeholder — non-deterministic.

### Metadata bugs (edge JSON `vocabularies` misnames)
- 8521 OTHER vs 44814653 (IG intro doc bug)
- 32887 / 32885 / 32815 misnames в death edge
- 44814723 "insurance" → actual "study"
- 581379 "Home Health" → actual "Inpatient Critical Care"
- 32902 "Active condition" → actual "Primary diagnosis"
- 32818/32819/32896/32897 fhir-x-omop systematic misuse
- 32856 "Lab result" → actual just "Lab"
- 38000179/38000180 swap (MedAdmin)
- 4318944/4030303/4195901/4217012 misnamed (Org care_site)
- 38004446 "Family Practice" → actual "General Practice"

### IG `.fml` files broken syntax (4+ files)
- PersonMap.fml: TODO skeleton
- condition.fml: `adt` undefined variable (line 24)
- Procedure.fml: multi-target without commas (lines 19, 26)
- medication.fml: `fps` undefined in end-block (lines 29, 32)
- Observation.fml / Measurement.fml: type-violations (code string → integer)
- ImmunizationMap.fml: multi-target syntax violations
- Все: написаны для R5, наш pipeline R4

### Pipeline-wide architectural observations
- Reference cdm.* покрывает только 10 таблиц — 5+ edge'ей без validation (observation_period, payer_plan_period, provider, care_site, location, note, specimen)
- View-extracts колонки не используемые в SQL (status_code в Procedure, etc.)
- Spec ↔ Impl drift в большинстве edge'ей (edge JSON обещает поля которых SQL не пишет)
- UTC normalization только в Encounter и Procedure (других — drift)
- Hidden domain-routing без логирования теряет данные
- IG .fml — pseudocode, не working code
- Reference cdm.* может быть БЕДНЕЕ или БОГАЧЕ нашего

## Найденные CRITICAL баги (action immediately)

1. **`mapspec/etl/Observation__measurement.sql:38`** — `('>', 4172703)` в operator_map. `4172703` это SNOMED concept_id для `=` (Equals). Правильный для `>` (Greater than) — `4172704`. Любая Synthea/EHR Observation с `valueQuantity.comparator='>'` пишется в OMOP как `=`. **Real ETL bug, не metadata.**

## Сквозные находки (переиспользовать в следующих ревью)

Из Patient/person review §7 (применимо к большинству остальных):
- IG `PersonMap.fml` (и большинство `.fml` в IG) — **TODO-скелет**, не источник правды. Реальная нормативка — `pagecontent/StructureMap-*-intro.md` + `F2OGeneralIssues.md` / `StrategiesBestPractices.md`.
- `F2OGeneralIssues.md` §Status/Intent → фильтр completed-only для Medication*/Procedure/Encounter edge'ов.
- `F2OGeneralIssues.md` §Flavors of Null → проверить, обрабатываем ли `data-absent-reason` extension.
- `F2OGeneralIssues.md` §Temporal Precision → OMOP `*_date` это DATE, `*_datetime` это TIMESTAMP; следить за zone, за effectivePeriod/performedPeriod, за полночью-fallback.
- `StrategiesBestPractices.md` §Patient-Reported vs Clinician-Verified → `*_type_concept_id` должны отражать provenance (сейчас часто захардкожены).
- Все наши `cm.*` пишут `source_concept_id=0`; во многих случаях улучшаемо lookup-ом в `vocab.concept`.
- IG intro doc содержит как минимум одну фактическую ошибку (`Other` gender concept_id `44814653` — концепта нет в Athena vocab v5.4); сверять рекомендуемые concept_id с реальной базой.

Из Patient/death review (новые сквозные):
- В edge JSON `vocabularies[].entries` и `references[]` встречаются **misnamed concept_id** и **ложные атрибуции refs** (например omoponfhir помечен как реализатор death, хотя в коде TODO). Каждое ревью должно сверять имена концептов через `vocab.concept WHERE concept_id IN (...)` и проверять реальное содержимое референсного файла, а не доверять автогенерированному edge JSON.
- Расхождения **edge JSON `constant`** vs **SQL фактического значения** — встречаются (death cause_concept_id: JSON говорит 0, SQL пишет NULL). Сверять.
- Reference cdm.* (Synthea CSV via load-cdm-reference.ts) использует те же конвенции что наш cdm_ours_fhir.* — это упрощает диф, но также означает что обе стороны могут разделять одно и то же отклонение от Themis (например NULL вместо 0 в cause_*).
- Pipeline не incremental (TRUNCATE+INSERT). Любые "delete on update" сценарии в IG/refs (delete death row when Patient becomes alive) у нас не релевантны.

Из Patient/observation_period review (новые сквозные):
- **`cdm.*` (reference oracle) покрывает только 10 OMOP-таблиц** (condition_occurrence, death, device_exposure, drug_exposure, location, measurement, observation, person, procedure_occurrence, visit_occurrence). Не покрывает: observation_period, payer_plan_period, care_site, provider, episode, era-таблицы. Эти edge'и **невозможно валидировать против reference** — отмечать явно в каждом ревью.
- В references встречаются методы с обещающими названиями но stub-телом (например FhirToCdm `BuildObservationPeriods(gap, ...)` — `gap` игнорируется, возвращает `[0]`). Не доверять имени метода, читать тело.

Из Patient/location review (новые сквозные):
- **Orphaned view files**: `Patient__location.view.json` не материализуется (`staging.patient_location` не существует), стейдж-2 SQL читает `staging.patient_person` где location-колонки добавлены через `forEachOrNull`-блок в Patient__person.view.json. Скриптом проверить: для каждой `mapspec/views/<X>.view.json` есть ли `staging.<x>` таблица и используется ли она.
- **edge JSON `fhir_path` != реальной view-path**. Проверять при каждом ревью, не доверять JSON-спеке без сверки с реальным view.
- **Наш cdm_ours_fhir.* может быть БОГАЧЕ `cdm.*` reference** (например location: 367 vs 105 — мы импортируем FHIR Location resources как отдельные строки; ref не делает; state/country/lat/lng — мы пишем, ref нет). Diff-tooling должен различать "обогащение" и "расхождение".

Из Encounter/visit_occurrence review (новые сквозные):
- **IG `.fml` файлы написаны для FHIR R5**, не R4. У R5 — `actualPeriod`/`admission`/`class.coding.code` (CodeableConcept); у R4 — `period`/`hospitalization`/`class.code` (Coding [1..1]). В каждом ревью с .fml ссылками учитывать что мы R4.
- **Synthea FHIR exporter теряет гранулярность** относительно своих же CSV. Reference cdm.* строится из CSV → видит `urgentcare`/`snf`/`hospice`/`wellness`. Наш FHIR-pipeline видит `AMB`/`IMP`/`HH`. Это даёт постоянные visit_concept_id mismatches, которые **не наш баг**. Fix: использовать SNOMED `Encounter.type` как fallback.
- **`*_datetime` колонки требуют timezone normalization**. Synthea FHIR пишет в локальной таймзоне (`+02:00`), CSV в UTC. Наш Encounter SQL делает `AT TIME ZONE 'UTC'` явно. Проверить во всех остальных edge'ах с datetime (Procedure.performed, Observation.effective, MedicationRequest.dispenseRequest, etc.).
- **`cm.*` материализованные таблицы обычно богаче и более точны чем edge JSON `vocabularies[].entries`**. В каждом edge с `concept_maps: [...]` сверить — JSON может содержать misnamed concept_ids (множество примеров: 8521, 32887, 32885, 32815, 581379, 44814723, 32902, 32818, 32819, 32896, 32897).

Из Condition/condition_occurrence review (новые сквозные):
- **Скрытая domain-фильтрация теряет строки**. В Condition наш SQL делает `JOIN vocab.concept WHERE domain_id='Condition'`, отбрасывая 3258/4204 (78%!) строк молча. Везде, где SQL фильтрует по `domain_id` или `standard_concept='S'` — сверить `count(staging) vs count(cdm_ours_fhir)`. ETL-German делает домен-routing в нужные OMOP-таблицы; мы — нет.
- **`fhir-x-omop` как ref содержит фабрикованные concept_ids** в коде (например 32818=admin record, 32819=admission note для condition_type — wrong; 32896=discharge, 32897=death для status — wrong). Не копировать его hardcode без verification.
- IG `.fml` файлы содержат не только R5-vs-R4 различия, но и **синтаксические баги** (undefined variables: `condition.fml:24` ссылается на `adt` вместо `abdt`). Skeleton-quality.
- **Edge JSON `narrative_md` может содержать неправду** — например Condition narrative говорит "all conditions go to condition_occurrence" но SQL фильтрует. Сверять с реализацией при каждом ревью.

Из Procedure/procedure_occurrence review (новые сквозные):
- Тот же domain-routing leak: Procedure теряет 3768/8742 (43%) строк. Cross-edge паттерн с Condition.
- **IG `.fml` файлы — broken syntax** (PersonMap stub, condition.fml `adt`-undefined-var, Procedure.fml multi-target без commas). Не одна, а минимум 3 fml бракованные. Стоит явно записать в narrative: "IG fml = неполный референс для понимания intent, не для использования as-is".
- Паттерн "view извлекает колонку, SQL не использует" — Procedure status_code пример. Стоит автоматизировать проверку.

Из Observation/measurement review (новые сквозные):
- **Hardcoded VALUES-таблицы concept_id могут содержать реальные ETL bugs** (operator `>` → `=` !). Stop accepting "edge JSON говорит target_concept_id=X" — verify через Athena ALL hardcoded concept_ids в SQL.
- Discrepancy `(only_ours, only_ref)` shows pipeline-specific quirks: 2036 extras + 245 missing для measurement. Не всё mismatches это баги, но требует анализа.
- **Shared `obs_meas_view` staging** между Observation→measurement и Observation→observation — паттерн оптимизации, но требует осторожности с view-name-mapping (`obs_meas_view` vs ожидаемое `omop_observation_measurement_view` из view JSON name).
- Inline `VALUES (...)` тоже подверженно concept_id ошибкам как и edge JSON. Скрипт для автоматизации проверки: грепать `\b[1-9][0-9]{6,}\b` в .sql и проверять что concept_name в Athena соответствует комментарию.
