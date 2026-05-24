# Specimen → specimen — review

## 1. Summary

Edge **stub** (по факту implemented, но Synthea не emit Specimen resources, поэтому 0 rows).

- `staging.specimen_specimen` table — **не существует** (Synthea FHIR без Specimen → loader не материализует staging)
- `cdm_ours_fhir.specimen`: 0 строк
- Reference cdm.* не содержит specimen table.

## 2. SQL анализ (для real-world data)

SQL [`Specimen__specimen.sql`](../etl/Specimen__specimen.sql):
- SNOMED-only specimen type lookup → domain='Specimen'
- Plus anatomic_site через separate SNOMED Maps-to
- `specimen_type_concept_id = 32856` ⚠️ "Lab" — same misnamed как в DR_measurement (32856 actually "Lab", not "Lab result")
- WHERE `collected_dt IS NOT NULL`

## 3. Reference inventory

| Ref | Notes |
|---|---|
| **fhir-omop-ig** | `Specimen.fsh` only |
| ETL-German | `SpecimenMapper.java` — full |
| omoponfhir | `OmopSpecimen.java` |

## 4. Action items

1. **[LOW] потенциально wired correctly** — нет данных для тестирования.
2. **[MED] type_concept_id 32856** — see DR_measurement §1 misname.

## 5. Verification

Невозможна (нет staging таблицы, нет reference, нет данных).
