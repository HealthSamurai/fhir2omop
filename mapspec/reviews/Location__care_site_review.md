# Location → care_site — review

Полный анализ кластера: **[Practitioner_Org_cluster_review.md](Practitioner_Org_cluster_review.md)** §3.4.

## Specific summary

- staging.location_care_site: **262**
- cdm_ours_fhir.care_site (Loc-source): **261** (1 dropped?)
- Reference cdm.care_site **отсутствует**

### Key

- `care_site_id = hash(Location.id)` — отдельный hash от Org-source care_site.
- ⚠️ **Дубликаты**: одна физическая площадка (Synthea hospital) может породить 2 care_sites — один от Organization, один от Location. Total care_site = 523 vs ожидаемые ~261 уникальных.
- `place_of_service_concept_id = 0` (всегда) — Location.type не используется для маппинга.
- `location_id = care_site_id` (тот же hash) — pointer на location row.

## Action items

См. cluster review §4.5, §5.4 (dedup Org-based + Loc-based care_sites).
