# Patient.generalPractitioner / managingOrganization → OMOP PERSON FK fields

## Источник

FHIR Patient:
- `Patient.generalPractitioner` — массив Reference(Practitioner | Organization | PractitionerRole)
- `Patient.managingOrganization` — Reference(Organization)

## Цель

OMOP PERSON:
- `provider_id` (integer, FK → PROVIDER) — последний известный лечащий врач
- `care_site_id` (integer, FK → CARE_SITE) — место оказания помощи

## Маппинг

### generalPractitioner → provider_id

| FHIR | OMOP | Примечание |
|---|---|---|
| `generalPractitioner[0]` типа Practitioner | `provider_id` | FK → PROVIDER |
| `generalPractitioner[0]` типа PractitionerRole | `provider_id` | Разрешить через PractitionerRole.practitioner |
| `generalPractitioner[0]` типа Organization | Не маппится в `provider_id` | Organization → care_site_id |
| отсутствует | NULL | |

Правило: берём первую ссылку на Practitioner из массива `generalPractitioner`.

### managingOrganization → care_site_id

| FHIR | OMOP | Примечание |
|---|---|---|
| `managingOrganization` | `care_site_id` | FK → CARE_SITE |
| отсутствует | NULL | |

## Зависимости

Эти маппинги зависят от того, что связанные ресурсы **уже обработаны**:

1. **Practitioner → PROVIDER** должен быть загружен до Patient
2. **Organization → CARE_SITE** должен быть загружен до Patient

### Порядок загрузки

```
1. Location      → LOCATION
2. Organization  → CARE_SITE
3. Practitioner  → PROVIDER
4. Patient       → PERSON (с FK на LOCATION, PROVIDER, CARE_SITE)
```

### Разрешение ссылок

FHIR Reference содержит строку вида `"Practitioner/123"` или `"Organization/456"`. Для маппинга нужна таблица соответствий FHIR ID → OMOP integer ID.

```
FHIR "Practitioner/abc-123" → OMOP provider_id = 42
FHIR "Organization/org-456" → OMOP care_site_id = 7
```

Если ссылка не разрешается (Practitioner/Organization ещё не загружен) — `provider_id` / `care_site_id` = NULL, событие логируется как warning.

## Семантика OMOP

- `provider_id` — "the last known primary care provider (General Practitioner)"
- `care_site_id` — "where the Provider typically provides care"

Это соответствует семантике FHIR `generalPractitioner` и `managingOrganization`.

## Консенсус реализаций

- **4/9** маппят `generalPractitioner` → `provider_id`
- **2/9** маппят `managingOrganization` → `care_site_id`
- Остальные пропускают эти поля (ставят NULL или default)
