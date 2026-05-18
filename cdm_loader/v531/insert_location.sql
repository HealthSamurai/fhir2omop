

insert into @cdm_schema.location (
location_id,
address_1,
address_2,
city,
state,
county,
zip,
location_source_value
)
select
-- location_id = hash(zip). Matches our FHIR-side mint which uses the
-- same single-field hash for cdm_ours_fhir.location.
hashtextextended(locations.zip, 0) as location_id,
locations.*
from
(select distinct
cast(null as varchar)               address_1,
cast(null as varchar)               address_2,
p.city                              city,
states_map.state_abbreviation       state,
cast(null as varchar)               county,
p.zip                               zip,
p.zip                               location_source_value
from @synthea_schema.patients p
left join @cdm_schema.states_map states_map on p.state=states_map.state) locations
;
