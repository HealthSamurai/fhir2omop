# Observation.status → OMOP filtering

## Источник

FHIR `Observation.status` — code из value set `ObservationStatus`: registered, preliminary, final, amended, corrected, cancelled, entered-in-error, unknown.

## Цель

Используется для **фильтрации** — определяет создавать ли запись.

## Фильтрация

| Значение | Действие | Причина |
|---|---|---|
| `final` | Map | Финальный результат |
| `amended` | Map | Исправленный — валидный результат |
| `corrected` | Map | Скорректированный — валидный результат |
| `preliminary` | Skip | Предварительный — может измениться |
| `registered` | Skip | Зарегистрирован — нет результата |
| `cancelled` | Skip | Отменён |
| `entered-in-error` | Skip | Ошибочная запись |
| `unknown` | Skip | Неизвестный статус |

## Решение

Маппим только `final`, `amended`, `corrected`. Preliminary пропускаем — для аналитики нужны стабильные результаты. Amended и corrected включаем — это обновлённые, но валидные значения.
