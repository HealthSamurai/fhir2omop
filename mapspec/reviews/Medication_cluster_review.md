# Medication cluster → drug_exposure — combined review

Cluster ревью для **6 edges** (5 medication + Immunization), все маршрутируют в `drug_exposure`. Объединено для дедупликации.

| Edge | status | staging rows | output rows | drug_type_concept_id |
|---|---|---|---|---|
| `MedicationRequest__drug_exposure` | implemented | 5469 | 4592 (-877 dropped в Maps-to) | **38000177** Prescription written ✅ |
| `MedicationAdministration__drug_exposure` | implemented | 877 | 877 | **38000179** ⚠️ — semantic mismatch |
| `Immunization__drug_exposure` | implemented | 1616 | 1616 | **32827** ⚠️ — wrong vocabulary |
| `MedicationDispense__drug_exposure` | stub | 0 (Synthea doesn't emit) | 0 | 38000176 ⚠️ — misnamed |
| `MedicationStatement__drug_exposure` | stub | 0 (Synthea doesn't emit) | 0 | 38000178 ✅ |
| `Medication__drug_exposure` | stub (WHERE FALSE) | 0 | 0 | 38000175 ⚠️ — misnamed |

**Total cdm_ours_fhir.drug_exposure = 4592 + 877 + 1616 = 7085 rows**
**Reference cdm.drug_exposure = 5472** (только MedicationRequest-source — Synthea CSV не emits Immunization-related drug_exposure)

## 1. Summary

Sharing patterns:
- Все используют тот же `vocab.concept_relationship Maps to → standard_concept='S' AND domain_id='Drug'` фильтр (Immunization более forgiving — LEFT JOIN)
- Vocabulary priority: RxNorm > NDC (+ CVX для Immunization; + SNOMED для MedAdmin)
- Все APPEND-ят в `cdm_ours_fhir.drug_exposure` (TRUNCATE только в MedicationRequest, остальные APPEND)
- IG `medication.fml` написан для **MedicationStatement** (не MedRequest/MedAdmin), R5 syntax (`medication : CodeableReference`)
- IG `ImmunizationMap.fml` — отдельный, R4-compatible

## 2. Reference inventory

| Ref | Подход | Покрытие |
|---|---|---|
| **fhir-omop-ig** | [`medication.fml`](../../refs/refs/fhir-omop-ig/input/maps/medication.fml) (45 строк) | **Только MedicationStatement** (по словам description). R5 syntax (`medication : CodeableReference`). `tgt.drug_concept_id = a` где a — code string (type-violation). **Множество bug-ов:** `s.end as fpe -> ... tgt.drug_exposure_end_date = cast(fps, "date")` (`fps` undefined — should be `fpe`). |
| **fhir-omop-ig** Immunization | [`ImmunizationMap.fml`](../../refs/refs/fhir-omop-ig/input/maps/ImmunizationMap.fml) (54 строк) | Maps vaccineCode → drug_concept_id+source_value+source_concept_id (multi-target syntax violation). doseQuantity → quantity. route → route_concept_id + route_source_value. occurrence → start+end (point-in-time). lotNumber → lot_number. **Patient/encounter/performer commented out (TODO).** |
| **omoponfhir** | `OmopMedicationRequest.java` (lines 492+) | Full IdMapping + bidirectional. Type concepts hardcoded. |
| **FhirToCdm** | `FhirToCdmMappings.cs:322+` | Skips on unresolvable subject. Minimal. |
| **ETL-German** | `MedicationStatementMapper.java` / `MedicationAdministrationMapper.java` | Multiple medication mappers — full domain routing + ATC support. |
| **NACHC** | various Parser/Builder classes | Standard mapping. |

## 3. Side-by-side key fields

| Field | MedReq | MedAdmin | Immunization | MedDispense | MedStatement | Medication |
|---|---|---|---|---|---|---|
| date | `authored_on::date` | `effective_dt::date` | `occurrence_dt::date` | `dispense_dt::date` | `COALESCE(effective_dt, period_start)::date` | `CURRENT_DATE` |
| end_date | = start (no fallback) | = start | = start | = start | `COALESCE(period_end, effective_dt, period_start)::date` | `CURRENT_DATE` |
| type_concept_id | **38000177** ✅ | **38000179** ⚠️ | **32827** ⚠️ | **38000176** ⚠️ | **38000178** ✅ | **38000175** ⚠️ |
| Code vocabs | RxNorm/NDC | RxNorm/NDC/SNOMED | CVX/RxNorm | RxNorm/NDC | RxNorm/NDC | RxNorm/NDC |
| Maps-to | INNER | INNER | LEFT (forgiving) | INNER | INNER | INNER |
| WHERE filter | — | status IN (completed/in-progress/on-hold) | — | — | status NOT IN (entered-in-error/cancelled) | **FALSE** (stub) |
| quantity | NULL | NULL | NULL ⚠️ (Imm has doseQuantity!) | `quantity_value::numeric` | NULL | NULL |
| days_supply | NULL ⚠️ (MedReq.dispenseRequest has это!) | NULL | NULL | `days_supply::integer` | NULL | NULL |
| route_* | NULL | NULL | NULL ⚠️ (Imm.route!) | NULL | NULL | NULL |
| lot_number | NULL | NULL | NULL ⚠️ (Imm.lotNumber!) | NULL | NULL | NULL |
| sig | NULL ⚠️ (MedReq.dosageInstruction) | NULL | NULL | NULL | NULL | NULL |
| provider_id | `requester_ref` | NULL | NULL | NULL | NULL | NULL |

## 4. Critical findings

### 4.1. ⚠️ MedAdmin `drug_type_concept_id = 38000179` — wrong concept
Athena: `38000179 = "Physician administered drug (identified as procedure)"`. **Verified**: `38000180 = "Inpatient administration"`.

SQL header comment `[MedicationAdministration__drug_exposure.sql:5](../etl/MedicationAdministration__drug_exposure.sql)`:
```
-- drug_type_concept_id 38000179 'Inpatient administration'.
```

Comment claims 38000179 = "Inpatient administration". **It's not.** Should be 38000180.

> **Action [HIGH]:** заменить `38000179` на `38000180` (или принять semantic choice "Physician administered" — задокументировать).

### 4.2. ⚠️ Immunization `drug_type_concept_id = 32827` — wrong vocabulary
SQL header comment `[Immunization__drug_exposure.sql:5](../etl/Immunization__drug_exposure.sql)`:
```
-- drug_type_concept_id 32827 'EHR encounter record' default.
```

`32827` это Type Concept (для Encounter), не Drug Type. Использовать его в `drug_type_concept_id` is technically valid (FK на vocab.concept), но semantically wrong domain.

Семантически правильно для Immunization:
- `38000179` "Physician administered drug" (что Synthea immunizations and есть)
- `38000180` "Inpatient administration" (если в больнице)
- `38000175` "Prescription dispensed in pharmacy" (если pharmacy-driven)

> **Action [HIGH]:** заменить на `38000179` (или другой Drug Type). 32827 не из Drug Type vocab.

### 4.3. ⚠️ Medication `38000175` and MedDispense `38000176` — misnamed in comments
Both have SQL header comments claiming names that don't match Athena:
- `Medication__drug_exposure.sql:35`: `-- 'Medication list entry'` → actually 38000175 = "Prescription dispensed in pharmacy"
- `MedicationDispense__drug_exposure.sql:3`: `-- 'Dispensed in Outpatient office'` → actually 38000176 = "Prescription dispensed through mail order" — and no concept named "Dispensed in Outpatient office" exists.

Both stub'ы (0 rows на Synthea), но comments confusing для будущих разработчиков.

> **Action [MED]:** обновить comments. Возможно перевыбрать concept_ids на семантически правильные.

### 4.4. MedicationRequest теряет 877 строк
staging.medicationrequest_drug_exposure: 5469 → output: 4592. **877 rows dropped** в Maps-to walk (требуется standard concept в Drug domain). 17% loss. Сравнимо с Condition/Procedure pattern.

Vs ref: 4592 intersect — 4552 (99% match), 849 only_ref. Reference имеет больше rows чем мы потому что reference (Synthea CSV) маппит non-RxNorm/NDC codes тоже (DIN, ATC?), которых у нас нет в priority list.

### 4.5. Множество полей всегда NULL despite spec
- **MedicationRequest** spec обещает `days_supply` (from `dispenseRequest.expectedSupplyDuration`), `refills`, `sig` (from `dosageInstruction`), `route_concept_id`. **Все NULL.**
- **Immunization** spec обещает `quantity` (doseQuantity), `route_*` (route), `lot_number` (lotNumber). **Все NULL.**
- IG `ImmunizationMap.fml` actually maps these. У нас view не извлекает.

> **Action [MED]:** заметные spec-impl gaps. Реализовать хотя бы Immunization (lot_number, dose), потому что эти поля важны для vaccine analytics.

### 4.6. IG `medication.fml` syntax bugs
[`medication.fml`](../../refs/refs/fhir-omop-ig/input/maps/medication.fml):
- Строка 29: `s.end as fpe -> ... tgt.drug_exposure_end_date = cast(fps, "date")` — `fps` undefined (declared in different rule block as `s.start as fps`).
- Строка 32: same `cast(fps, "date")` bug.

3rd FML file with syntax errors (after Condition.fml `adt`, Procedure.fml multi-target). Pattern stable: **IG fml = pseudocode, не working code**.

## 5. Verification

```
Total cdm_ours_fhir.drug_exposure: 7085
  - MedicationRequest: 4592 (38000177)
  - MedicationAdministration: 877 (38000179) ⚠️ wrong concept
  - Immunization: 1616 (32827) ⚠️ wrong vocab
  - MedDispense: 0 (stub)
  - MedStatement: 0 (stub)
  - Medication: 0 (WHERE FALSE)

Reference cdm.drug_exposure: 5472
  - All 38000177 (only Prescription written; reference doesn't import immunizations)
  
Diff (MedReq only, vs ref):
  intersect: 4552
  only_ours: 2 (likely date edge)
  only_ref: 849 (probably non-RxNorm/NDC source codes not in our priority)
```

## 6. Action items (по приоритету)

1. **[HIGH] исправить MedAdmin type concept** — 38000179 → 38000180 (или semantically choose).
2. **[HIGH] исправить Immunization type concept** — 32827 → 38000179 (или другой Drug Type vocab entry).
3. **[MED] синхронизировать comments** в Medication/MedDispense с реальными именами concept_ids.
4. **[MED] реализовать Immunization extras** (quantity, route, lot_number, dose) — пишутся IG, у нас игнорируются.
5. **[MED] MedicationRequest dispenseRequest** (days_supply, refills) — Synthea эмитит, мы теряем.
6. **[LOW] анализ 849 only_ref MedReq** — какие codes в Synthea CSV есть, которых нет у нас.
