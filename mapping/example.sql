---viewdef
@name: patient_person
@url: <url>
name: getResourceKey() // comment
gender: gender
us_core_birthsex: extension.where(url='http://hl7.org/fhir/us/core/StructureDefinition/us-core-birthsex').valueCode.first()
birth_date: birthDate
race_omb_code: extension.where(url='http://hl7.org/fhir/us/core/StructureDefinition/us-core-race').extension.where(url='ombCategory').valueCoding.code.first()
race_text: extension.where(url='http://hl7.org/fhir/us/core/StructureDefinition/us-core-race').extension.where(url='text').valueString.first()
ethnicity_omb_code: extension.where(url='http://hl7.org/fhir/us/core/StructureDefinition/us-core-ethnicity').extension.where(url='ombCategory').valueCoding.code.first()
ethnicity_text: extension.where(url='http://hl7.org/fhir/us/core/StructureDefinition/us-core-ethnicity').extension.where(url='text').valueString.first()
general_practitioner_ref: generalPractitioner.getReferenceKey()
managing_organization_ref: managingOrganization.getReferenceKey()
@forEachOrNull: address.first()
  address_line: line.join(' ')
  address_city: city
  address_state: state
  address_zip: postalCode
  address_country: country

---sql
--@name: person
--@dep: <url> as patient_person
WITH map_gender as (
  SELECT 'male' as code  , 8507 as id
         'female' , 8532
         'other'  , 8521
         'unknown', 8551
         'M' , 8507
         'F' , 8532
), ....
SELECT
    hashtextextended(v.id, 0)::bigint              AS person_id,
    gender.id AS gender_concept_id,
    EXTRACT(YEAR  FROM v.birth_date::date)::int    AS year_of_birth,
    EXTRACT(MONTH FROM v.birth_date::date)::int    AS month_of_birth,
    EXTRACT(DAY   FROM v.birth_date::date)::int    AS day_of_birth,
    v.birth_date::timestamp                        AS birth_datetime,
    race.id as race_concept_id,
    ethnicity.id  AS ethnicity_concept_id,
    CASE WHEN v.address_zip IS NULL THEN NULL::bigint
         ELSE hashtextextended(v.address_zip, 0)::bigint
    END                                            AS location_id,
    -- ????
    NULL::bigint                                   AS provider_id,    -- Synthea: not in Patient
    NULL::bigint                                   AS care_site_id,   -- Synthea: not in Patient
    v.id                                           AS person_source_value,
    coalesce(v.us_core_birthsex, v.gender)         AS gender_source_value,
    0                                              AS gender_source_concept_id,
    v.race_text                                    AS race_source_value,
    0                                              AS race_source_concept_id,
    v.ethnicity_text                               AS ethnicity_source_value,
    0                                              AS ethnicity_source_concept_id

FROM
  patient_person v,
  map_gender g
where g.code = v.....
;
