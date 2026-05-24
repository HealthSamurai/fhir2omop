# Organization → care_site — review

Полный анализ кластера: **[Practitioner_Org_cluster_review.md](Practitioner_Org_cluster_review.md)** §3.3.

## Specific summary

- staging.organization_care_site: **261**
- cdm_ours_fhir.care_site (Org-source): **262** (1 extra?)
- Reference cdm.care_site **отсутствует**

### Key

- ⚠️ **4 из 5 concept_id mappings misnamed** в CASE statement — dept/edu/govt/team имена comments не соответствуют Athena.
- Synthea Orgs почти все type=`prov` → 8940 (Office) — единственный correct mapping в активном использовании.
- `care_site_id = hash(Org.id)` — UUID-based, matches `Encounter.serviceProvider.reference` resolution.

## Action items

См. cluster review §4.1, §5.1 (исправить 4 misnamed concept_ids).
