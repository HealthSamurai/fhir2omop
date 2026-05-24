# PractitionerRole → provider — review

Полный анализ кластера: **[Practitioner_Org_cluster_review.md](Practitioner_Org_cluster_review.md)** §3.2.

## Specific summary

- staging.practitionerrole_provider: **261**
- Output: augments existing provider rows (**UPDATE**, not INSERT)
- specialty + care_site_id populated на стадии PractitionerRole.

### Key

- ⚠️ **Уникальный UPDATE-mode** в pipeline.
- SNOMED specialty code → Maps to → standard → specialty_concept_id.
- Reference невозможна.

## Action items

См. cluster review §4.3, §5.2 (orchestrator UPDATE-mode support и row count logging).
