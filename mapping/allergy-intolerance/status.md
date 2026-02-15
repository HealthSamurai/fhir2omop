# AllergyIntolerance.clinicalStatus / verificationStatus → OMOP filtering

## Источник

FHIR `AllergyIntolerance.clinicalStatus` — CodeableConcept: active, inactive, resolved.
FHIR `AllergyIntolerance.verificationStatus` — CodeableConcept: unconfirmed, confirmed, refuted, entered-in-error.

## Цель

Используется для **фильтрации**.

## Фильтрация

### Clinical Status

| Значение | Действие | Причина |
|---|---|---|
| `active` | Map | Текущая аллергия |
| `inactive` | Skip | Неактивная |
| `resolved` | Skip | Разрешилась |
| отсутствует | Map | clinicalStatus опционален |

### Verification Status

| Значение | Действие | Причина |
|---|---|---|
| `confirmed` | Map | Подтверждённая |
| `unconfirmed` | Map | Неподтверждённая — всё равно маппим |
| `refuted` | Skip | Опровергнутая |
| `entered-in-error` | Skip | Ошибочная запись |
| отсутствует | Map | verificationStatus опционален |

## Решение

Строже чем Condition: только `active` для clinicalStatus. Аллергии `inactive` или `resolved` не создают записи — они представляют историческое состояние.
