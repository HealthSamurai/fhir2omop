# Observation.category → OMOP domain routing (measurement vs observation)

## Источник

FHIR `Observation.category` — CodeableConcept из `observation-category`: laboratory, vital-signs, social-history, survey, activity, imaging, procedure, exam, therapy.

## Цель

Определяет целевую таблицу OMOP: `MEASUREMENT` или `OBSERVATION`.

## Маппинг

| FHIR category | OMOP таблица | Обоснование |
|---|---|---|
| `laboratory` | measurement | Лабораторные результаты |
| `vital-signs` | measurement | Витальные показатели |
| `social-history` | observation | Социальные данные |
| `survey` | observation | Опросники (PHQ-9, AUDIT) |
| `activity` | observation | Физическая активность |
| отсутствует | measurement | Default — лаборатория наиболее частый случай |

## Текущее ограничение

Роутинг по category — упрощённый подход. Полноценный OMOP ETL определяет домен по `concept.domain_id` из Athena vocabulary. Например:
- SNOMED concept может принадлежать домену Measurement, Condition или Procedure
- LOINC код может быть Measurement или Observation

## Будущая работа

При интеграции Athena vocabulary — переключиться на domain-based routing:
```
domain = athena.lookupDomain(concept_id)
if domain == 'Measurement' → measurement table
if domain == 'Observation' → observation table
```
