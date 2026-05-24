# Device → device_exposure — review

## 1. Summary

Device implants/equipment записываются в `device_exposure`. У нас edge **implemented**.

**Validation на 100-Synthea-когорте**:
- staging.device_device_exposure: **113**
- cdm_ours_fhir.device_exposure: **111** (2 dropped, либо WHERE status filter, либо Maps-to)
- cdm.device_exposure (ref): **111** ✅ — **полное совпадение по count**

## 2. Reference inventory

| Ref | Notes |
|---|---|
| **fhir-omop-ig** | `input/fsh/DeviceExposure.fsh` (logical model only, no fml) |
| NACHC | `DeviceService` — стандартный mapper |
| ETL-German | `DeviceMapper.java` — наиболее полный, поддерживает UDI parsing |
| omoponfhir | OmopDevice.java — bi-direction |

## 3. SQL анализ

```sql
SELECT
    referenceToId(v.id) AS device_exposure_id,
    referenceToId(v.subject_ref) AS person_id,
    std.concept_id AS device_concept_id,
    CURRENT_DATE AS device_exposure_start_date,  -- ⚠️ placeholder!
    NULL AS device_exposure_start_datetime,
    NULL AS device_exposure_end_date,
    32817 AS device_type_concept_id,
    left(v.udi, 255) AS unique_device_id,
    left(v.lot_number, 255) AS production_id,
    ...
```

WHERE: `status_code IN ('active', 'inactive')`. Inner JOIN на Maps-to → domain='Device'.

## 4. Различия

### 4.1. ⚠️ `device_exposure_start_date = CURRENT_DATE` — placeholder!
**Critical semantics issue.** SQL header comment объясняет: "FHIR Device has no native timing field. Synthea drops START/STOP." Мы пишем сегодняшнюю дату как placeholder. Это **меняет данные с каждым re-run** — pipeline non-deterministic для device dates.

Reference cdm.device_exposure тоже использует CURRENT_DATE? Или у него реальные даты из Synthea CSV? Synthea CSV `devices.csv` имеет START/STOP колонки — load-cdm-reference.ts наверняка их пишет. Если ref имеет реальные даты, а мы placeholder — это major drift.

> **Action [HIGH]:** проверить cdm.device_exposure dates vs cdm_ours_fhir. Если ref имеет реальные даты, нам нужно либо извлекать из связанной DeviceUseStatement, либо передать через staging. Synthea FHIR действительно теряет dates — но возможно есть extension или связь с Procedure.

### 4.2. ⚠️ `device_type_concept_id = 32817` (EHR) 
Generic type concept. Athena имеет более специфичные Device Type concepts (44818708 "Device Recorded from EHR"). Не блокер.

### 4.3. Inner JOIN на Maps-to + domain='Device' — Synthea-friendly
2 / 113 (1.8%) drop rate — minimal. Synthea devices в основном SNOMED standard.

## 5. Verification

```
staging.device_device_exposure: 113
cdm_ours_fhir.device_exposure: 111
cdm.device_exposure (ref): 111
Match by count ✅ — but date semantics likely different (см. §4.1)
```

## 6. Action items

1. **[HIGH] date placeholder issue** — проверить vs reference, fix если diff.
2. **[LOW] device_type_concept_id** — рассмотреть более специфичные concepts.
