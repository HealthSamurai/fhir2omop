# Practitioner → provider — review

Полный анализ кластера: **[Practitioner_Org_cluster_review.md](Practitioner_Org_cluster_review.md)** §3.1.

## Specific summary

- staging.practitioner_provider: **261**
- cdm_ours_fhir.provider: **261** (100% survive)
- Reference cdm.provider **отсутствует** — нет валидации

### Key

- ⚠️ `provider_id = hash(NPI)` — **unique strategy**, отличается от UUID-hashing других edge'ей. Reason: Encounter references practitioner by NPI not UUID.
- `specialty_concept_id = 38004446` — Athena имя "General Practice" (SQL comment "Family Practice" — близко но не exact).
- gender_concept_id mapping consistent с Patient/person.

## Action items

См. cluster review §4.4, §5.3.
