# Location → location — review

Полный анализ кластера: **[Practitioner_Org_cluster_review.md](Practitioner_Org_cluster_review.md)** §3.5.

См. также **[Patient__location_review.md](Patient__location_review.md)** для shared schema.

## Specific summary

- staging.location_location: **262**
- cdm_ours_fhir.location (Location-source): **262** APPEND-ит к 105 patient locations = **367 total**
- Reference cdm.location: 105 (только patient-based, не FHIR Location resources)

### Key

- SQL почти идентичен Patient__location.sql (тот же staging columns, тот же country lookup).
- `state` всегда NULL (хотя `v.state` extracted) — sed-bug или quirk?
- `location_source_value = state` — то же weird поле как Patient/location.

Точная копия логики Patient/location, но с обогащением через FHIR Location resources. См. Patient__location review для общих проблем.

## Action items

См. Patient__location review §6 (location_source_value cleanup).
