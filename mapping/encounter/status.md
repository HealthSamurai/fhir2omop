# Encounter.status → OMOP filtering

## Источник

FHIR `Encounter.status` — code из value set `EncounterStatus`: planned, arrived, triaged, in-progress, onleave, finished, cancelled, entered-in-error, unknown.

## Цель

Используется для **фильтрации** — определяет создавать ли запись VISIT_OCCURRENCE.

## Фильтрация

| Значение | Действие | Причина |
|---|---|---|
| `finished` | Map | Завершённый визит |
| `in-progress` | Map | Текущий визит — валидные данные |
| `planned` | Skip | Планируемый — ещё не произошёл |
| `arrived` | Skip | Прибыл — визит не начался |
| `triaged` | Skip | Триаж — визит не начался |
| `onleave` | Skip | Отсутствует — нет стабильных данных |
| `cancelled` | Skip | Отменён |
| `entered-in-error` | Skip | Ошибочная запись |
| `unknown` | Skip | Неизвестный статус |

## Решение

Маппим только `finished` и `in-progress`. Planned/cancelled/entered-in-error не представляют реальные визиты. in-progress включаем для поддержки текущих госпитализаций.
