# Practitioner / Org / Location / CareSite cluster — combined review

5 edges, все строят non-event таблицы (provider / care_site / location):

| Edge | status | staging | output | target | notes |
|---|---|---|---|---|---|
| `Practitioner__provider` | implemented | 261 | 261 | cdm_ours_fhir.provider | INSERT |
| `PractitionerRole__provider` | implemented | 261 | augments | cdm_ours_fhir.provider | **UPDATE** (специальная mode) |
| `Organization__care_site` | implemented | 261 | 262 | cdm_ours_fhir.care_site (Org-source) | INSERT |
| `Location__care_site` | implemented | 262 | 261 | cdm_ours_fhir.care_site (Loc-source) | APPEND |
| `Location__location` | implemented | 262 | (262 в location) | cdm_ours_fhir.location | APPEND после Patient__location |

**Reference cdm.* НЕ содержит provider или care_site** — single-source validation. Все эти 5 edge'ей не могут быть верифицированы против oracle.

## 1. Summary

Cluster для **reference-data** edges (вместо event-data). Объединено для деduplications.

Главные находки:
1. **`PractitionerRole__provider` это UPDATE, не INSERT** — уникальный паттерн в pipeline. Augments existing provider rows added by Practitioner edge.
2. **Hardcoded `specialty_concept_id = 38004446`** — SQL comment claims "Family Practice", Athena имя "**General Practice**". Не совсем misname (Family Practice ≈ General Practice), но not exact.
3. **`Organization__care_site` CASE statement с 4 ИЗ 5 wrong concept_names в комментариях**.
4. **Reference data validation impossible** — `cdm.provider`/`cdm.care_site` не существует в reference.
5. **Двойная стратегия для location** — `Patient__location.sql` пишет per-patient, `Location__location.sql` APPEND-ит FHIR Location resources отдельно.

## 2. Reference inventory

| Ref | File | Notes |
|---|---|---|
| **fhir-omop-ig** | [`Provider.fsh`](../../refs/refs/fhir-omop-ig/input/fsh/Provider.fsh) (21 строк), [`CareSite.fsh`](../../refs/refs/fhir-omop-ig/input/fsh/CareSite.fsh) (13 строк), [`Location.fsh`](../../refs/refs/fhir-omop-ig/input/fsh/Location.fsh) (12 строк) | **Только FSH logical models, нет .fml** для этих 3 таблиц. Никакого нормативного mapping. |
| omoponfhir | OmopPractitioner.java / OmopOrganization.java / OmopLocation.java | searchAndUpdate pattern с dedup. Бо́льшая часть для O→F. |
| FhirToCdm | `FhirToCdmMappings.cs` | Provider creation inside other mappers (per-encounter). |
| ETL-German | `OrganizationMapper.java`, `PractitionerMapper.java`, `LocationMapper.java` | Specialty mapping через `OrgUnitToConcept` custom lookup. |
| NACHC | `ProviderService` / `OrganizationService` | DB-backed lookup. |

## 3. Side-by-side per edge

### 3.1. Practitioner → provider

| OMOP column | Наш |
|---|---|
| `provider_id` | `hashtextextended(COALESCE(npi, id), 0)::bigint` — **hash NPI** (НЕ Practitioner.id) |
| `provider_name` | `family || ', ' || given` |
| `npi` | `v.npi` |
| `dea` | NULL (Synthea не emit) |
| `specialty_concept_id` | **`38004446`** (hardcoded "General Practice") |
| `care_site_id` | NULL (populated by PractitionerRole later) |
| `gender_concept_id` | CASE male/female/other/unknown → 8507/8532/8521/8551 |
| `provider_source_value` | **`v.id`** (Practitioner UUID, NOT NPI) — matches ref convention |
| `gender_source_value` | `v.gender` |

⚠️ **NPI-hashing для provider_id**: это **уникальный architectural выбор**. Encounter.participant.individual.reference в Synthea = `Practitioner?identifier=…|NPI`. SQL header comment объясняет: "FK lookup from Encounter needs NPI". Это smart, но **отличается от cdm.* reference** (которая использует UUID). 

Verified Athena: **`38004446` = "General Practice" (Standard, Medicare Specialty)** ✅. SQL comment "Family Practice" близко но не exact.

### 3.2. PractitionerRole → provider (**UPDATE**)

```sql
UPDATE cdm_ours_fhir.provider p
SET
    specialty_concept_id = COALESCE(std.concept_id, p.specialty_concept_id),
    care_site_id         = COALESCE(referenceToId(v.org_ref), p.care_site_id)
FROM staging.practitionerrole_provider v
LEFT JOIN vocab.concept src ON src.vocabulary_id = 'SNOMED' AND src.concept_code = v.specialty_code
LEFT JOIN ... Maps to → standard ...
WHERE p.provider_id = referenceToId(v.practitioner_ref)
```

**Уникальный паттерн** в pipeline — augments existing rows вместо INSERT. orchestrator должен знать о specifically routing `update` mode.

> **Action [NOTE]:** проверить как orchestrator (`src/etl_fhir/runEdge.ts`) обрабатывает UPDATE-mode. Возможно требует special-case handling.

⚠️ **JOIN на `referenceToId(practitioner_ref)`** не учитывает что Practitioner.sql использует `hashtextextended(NPI)` не `hashtextextended(Practitioner.id)`. Если PractitionerRole.practitioner reference указывает на UUID, JOIN не matched. Реально работает потому что Synthea PractitionerRole references то же что Encounter — `Practitioner?identifier=…|NPI`-formatted, и `referenceToId` извлекает NPI часть.

Проверить: 261 PractitionerRole UPDATE successfully apply to 261 provider rows? Стоит логировать `affected rows`.

### 3.3. Organization → care_site

```sql
hashtextextended(v.id, 0)::bigint AS care_site_id,
v.name AS care_site_name,
CASE v.type_code
    WHEN 'prov'  THEN 8940     -- Office (correct ✅)
    WHEN 'dept'  THEN 4318944  -- "Department" claim ⚠️ Athena says "Hospital"
    WHEN 'edu'   THEN 4030303  -- "Educational institution" claim ⚠️ Athena says "Hospital AND/OR institution"
    WHEN 'govt'  THEN 4195901  -- "Government" claim ⚠️ Athena says "Government hospital"
    WHEN 'team'  THEN 4217012  -- "Team" claim ⚠️ Athena says "Health maintenance organization"
    ELSE 0
END AS place_of_service_concept_id,
```

**4 из 5 concept_ids misnamed в комментариях**. Verified в Athena:

| code | claimed | actual concept_name |
|---|---|---|
| 8940 | Office | ✅ Office |
| 4318944 | Department | ❌ **Hospital** |
| 4030303 | Educational institution | ❌ **Hospital AND/OR institution** |
| 4195901 | Government | ❌ **Government hospital** |
| 4217012 | Team | ❌ **Health maintenance organization** |

Semantically тоже сомнительно — например `dept` это subdivision внутри Organization, не Hospital. Лучше mapping был бы:
- `dept` → 4318944 not (Hospital): можно искать какой-то Department concept в SNOMED (например 4046571 "Department")
- `team` → 4217012 (HMO) тоже странно

> **Action [HIGH]:** проверить семантический выбор каждого concept_id, обновить как имена так и mapping. Synthea organizations почти все `prov` (provider) → 8940 — поэтому ошибки в остальных entries не активируются.

### 3.4. Location → care_site

```sql
referenceToId(v.id) AS care_site_id,
left(v.name, 255) AS care_site_name,
0 AS place_of_service_concept_id,        -- always 0
referenceToId(v.id) AS location_id,      -- = care_site_id! (suspicious)
v.id AS care_site_source_value,
left(v.type_code, 50) AS place_of_service_source_value
```

**`location_id = care_site_id`** через `referenceToId(v.id)` — те же hashes. Это работает только когда Location__location.sql также пишет location с тем же ID hash, что и происходит (видим ниже).

⚠️ Дубликаты care_sites: Organization создаёт hash(Org.id), Location создаёт hash(Loc.id). Если Encounter.serviceProvider = Org, Encounter.location = Loc — две разные care_sites для одного physical site. Это **дублирование care_sites** (одна площадка → 2 care_site_id).

### 3.5. Location → location

Тот же SQL pattern что Patient__location, но из staging.location_location (FHIR Location resources, не Patient.address). 262 строки — то что мы видели в Patient/location review как "extra 262" rows.

## 4. Critical findings

### 4.1. ⚠️ Org care_site concept_id misnames + semantic mismatches
См. §3.3. 4 из 5 entries с неправильными именами в комментариях. Synthea данные не активируют большинство, но edge JSON spec'и and comments confusing.

### 4.2. ⚠️ Provider `gender_concept_id = 8521` для 'other'
Совпадает с Patient/person — мы используем 8521 (non-standard but valid OTHER) вместо 44814653 (which doesn't exist). См. Patient__person_review.md §4.2.

### 4.3. PractitionerRole UPDATE pattern
Уникальный — augments existing rows. Стоит проверить:
- Что 261 UPDATE successful (нет ROWS=0 для какого-то PractitionerRole)
- Что orchestrator runner правильно identifies "update" mode

### 4.4. NPI vs UUID provider_id strategy
Наш `provider_id = hash(NPI)`, reference (Synthea CSV) uses `hash(UUID)`. **Систематический mismatch** при diff. Невозможно ассоциировать наши providers с reference. 

`provider_source_value = UUID` ✅ matches reference convention — позволяет JOIN на source_value для верификации.

### 4.5. Duplicated care_sites (Org-based + Location-based)
Organization.id и Location.id — разные UUIDs для same физического site. Hash-strategy создаёт два разных care_site_id. Pipeline пишет в один table = 523 care_sites вместо ~261 уникальных.

> **Action [LOW]:** дедупликация care_sites через FHIR Organization.location reference. Сейчас нет JOIN'а между Org → Location.

### 4.6. Reference validation невозможна
`cdm.provider`, `cdm.care_site` не существуют. Cross-cutting (см. Patient/observation_period review §4.1).

## 5. Action items

1. **[HIGH] Organization care_site concept_id verification** — исправить 4 misnamed concepts в CASE statement. Проверить семантический выбор для dept/edu/govt/team.

2. **[MED] PractitionerRole UPDATE row count logging** — добавить `RAISE NOTICE` про affected rows.

3. **[MED] specialty_concept_id = 38004446** — переименовать comment "Family Practice" → "General Practice" (точное имя в Athena).

4. **[LOW] dedup care_sites** Org-based + Loc-based — JOIN на Organization.location.

5. **[NOTE] orchestrator UPDATE-mode support** — проверить что special mode для PractitionerRole edge handled.

## 6. Verification

```
Practitioner: 261 → provider 261  ✅
PractitionerRole: 261 → UPDATEs existing provider rows  (need RAISE NOTICE)
Organization: 261 → care_site (Org-source) 262
Location: 262 → care_site (Loc-source) 261 + location 262
Total care_site: 523 (likely 262 duplicates Org/Loc)
Total location: 367 (from Patient__location 105 + Location__location 262)

Reference validation: NOT POSSIBLE (cdm.provider, cdm.care_site missing)
```

## 7. Cross-cutting

- **UPDATE mode** is unique in pipeline. Document in `mapspec/etl/` README.
- **NPI vs UUID strategy** — provider_id ≠ ref provider_id. Diff-tooling needs source_value-based join.
- **5 edges без reference validation** — vertical for "reference data" tables.
