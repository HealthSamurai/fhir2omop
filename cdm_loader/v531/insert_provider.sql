

insert into @cdm_schema.provider (
provider_id,
provider_name,
npi,
dea,
specialty_concept_id,
care_site_id,
year_of_birth,
gender_concept_id,
provider_source_value,
specialty_source_value,
specialty_source_concept_id,
gender_source_value,
gender_source_concept_id
)

select
-- provider_id = hash(Practitioner UUID). Note: does NOT match the FHIR
-- side (which hashes NPI, extracted from Encounter.participant.individual
-- references in Synthea). Diff for provider_id will need a bridge or a
-- backfill of cdm.provider.npi.
hashtextextended(id, 0)                   provider_id,
name                                      provider_name,
cast(null as varchar(20))                 npi,
cast(null as varchar(20))                 dea,
38004446                                  specialty_concept_id,
cast(null as integer)                     care_site_id,
cast(null as integer)                     year_of_birth,
case upper(gender)
when 'M' then 8507
when 'F' then 8532
end                                       gender_concept_id,
id                                        provider_source_value,
speciality                                specialty_source_value,
38004446                                  specialty_source_concept_id,
gender                                    gender_source_value,
case upper(gender)
when 'M' then 8507
when 'F' then 8532
end                                       gender_source_concept_id
from @synthea_schema.providers 
;
