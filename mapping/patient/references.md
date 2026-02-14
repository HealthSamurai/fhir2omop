# Patient.generalPractitioner / managingOrganization → OMOP PERSON provider_id / care_site_id

## Источник

- `Patient.generalPractitioner` — массив Reference(Practitioner | Organization | PractitionerRole). Первичный лечащий врач.
- `Patient.managingOrganization` — Reference(Organization). Организация, управляющая записью пациента.

## Цель

OMOP PERSON:
- `provider_id` (integer) — FK → PROVIDER
- `care_site_id` (integer) — FK → CARE_SITE

## Маппинг

| FHIR | OMOP | Примечания |
|---|---|---|
| `generalPractitioner[0]` | `provider_id` | Первый из массива, разрешение Reference → integer ID |
| `managingOrganization` | `care_site_id` | Разрешение Reference → integer ID |

## Правила разрешения Reference

FHIR Reference имеет формат `"ResourceType/id"` (например `"Practitioner/123"`).

1. Извлекаем ID из строки reference: `"Practitioner/123"` → `123`
2. Если ID — число, используем напрямую как FK
3. Если ID — не число (UUID), требуется таблица маппинга FHIR ID → OMOP integer ID
4. Если reference отсутствует — NULL

## Решение по множественным generalPractitioner

FHIR допускает массив `generalPractitioner`. OMOP PERSON имеет одно поле `provider_id`.

**Правило**: берём `generalPractitioner[0]` — первый элемент массива. Остальные теряются.

## Решение по типу Reference

`generalPractitioner` может ссылаться на Practitioner, Organization или PractitionerRole. Для `provider_id` нас интересует только Practitioner. Если reference указывает на Organization — игнорируем для provider_id (это ближе к care_site).

На данном этапе: маппим любой generalPractitioner[0] в provider_id, без фильтрации по типу.

## Отсутствующие значения

| Ситуация | provider_id | care_site_id |
|---|---|---|
| generalPractitioner есть | ID из reference | — |
| generalPractitioner отсутствует | NULL | — |
| managingOrganization есть | — | ID из reference |
| managingOrganization отсутствует | — | NULL |

Не используем дефолтные значения (вроде 1 или 0) — NULL корректно отражает отсутствие данных.

## Консенсус реализаций

| Project | generalPractitioner → provider_id | managingOrganization → care_site_id |
|---|---|---|
| omoponfhir-v54-r4 | ✓ | ✓ |
| omopfhirmap | ✓ | ✓ |
| mends-on-fhir | ✓ | — |
| GT-FHIR | ✓ | — |
| ETL-German-FHIR-Core | — | — |
| FhirToCdm | — | — |
| NACHC | — (defaults to 1) | — (defaults to 1) |

- **4/9** маппят generalPractitioner
- **2/9** маппят managingOrganization
- NACHC использует дефолт 1 — мы считаем это некорректным
