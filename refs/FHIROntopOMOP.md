# FHIROntopOMOP

## Project Information

- **Repository**: https://github.com/fhircat/FHIROntopOMOP
- **Organization**: FHIRCat

## Purpose

FHIROntopOMOP exposes OMOP (Observational Medical Outcomes Partnership) Common Data Model data as a queryable Knowledge Graph compliant with the HL7 FHIR standard using the Ontop Virtual Knowledge Graph (VKG) engine. This allows OMOP data to be queried using SPARQL with FHIR-compliant RDF representations without physically transforming or copying the data.

## Key Features

- Virtual Knowledge Graph approach - no data duplication required
- SPARQL endpoint for querying OMOP data as FHIR resources
- Docker-based deployment
- Pre-configured FHIR ontology (OWL/TTL format)
- OBDA (Ontology-Based Data Access) mappings from OMOP to FHIR
- Includes demo dataset from MIMIC-IV OMOP for testing
- Web-based SPARQL query interface with example queries

## Technology Stack

- **Ontop**: Version 5.1.0 - Virtual Knowledge Graph engine for OBDA
- **Database**: PostgreSQL (OMOP CDM schema)
- **Docker/Docker Compose**: For containerized deployment
- **Standards**:
  - SPARQL for querying
  - OWL for ontology
  - R2RML/OBDA for mappings
  - FHIR RDF representation

## Architecture

The system uses Ontop's Virtual Knowledge Graph approach:

1. **FHIR Ontology** (`fhir.ttl`): OWL ontology defining FHIR resource classes and properties
2. **OBDA Mappings** (`omop.obda`, `fhir.obda`): Define how OMOP SQL queries map to FHIR RDF triples
3. **Ontop Engine**: Translates incoming SPARQL queries to SQL on-the-fly, querying the underlying PostgreSQL OMOP database
4. **SPARQL Endpoint**: Exposed on port 8080 for querying

No data transformation or ETL is required - the FHIR representation is generated virtually at query time.

## FHIR Resources Exposed

Based on the OBDA mappings, the following FHIR resources are exposed:

| FHIR Resource | Description |
|---------------|-------------|
| **Patient** | Demographics from OMOP person table |
| **Practitioner** | Provider information |
| **PractitionerRole** | Provider roles and specialties |
| **Location** | Care site and location information |
| **Encounter** | Visit occurrences |
| **Condition** | Condition occurrences with clinical status |
| **Procedure** | Procedure occurrences |
| **MedicationStatement** | Drug exposures |
| **Observation** | Measurements with values, units, and reference ranges |
| **CodeableConcept/Coding** | Concepts from OMOP vocabulary |
| **ConceptMap** | Concept relationships and hierarchies |

## OMOP Tables Mapped

| OMOP Table | Mapped To |
|------------|-----------|
| `person` | Patient |
| `provider` | Practitioner, PractitionerRole |
| `care_site` | Location |
| `location` | Location (Address) |
| `visit_occurrence` | Encounter |
| `condition_occurrence` | Condition |
| `procedure_occurrence` | Procedure |
| `drug_exposure` | MedicationStatement |
| `measurement` | Observation |
| `concept` | CodeableConcept, Coding |
| `concept_relationship` | ConceptMap |
| `concept_ancestor` | ConceptMap (subsumption relationships) |

## Mapping Details

Key OMOP-to-FHIR field mappings include:

- `person.person_id` -> `Patient.id`
- `person.gender_concept_id` -> `Patient.gender` (via concept lookup)
- `person.year/month/day_of_birth` -> `Patient.birthDate`
- `visit_occurrence.visit_occurrence_id` -> `Encounter.id`
- `visit_occurrence.visit_start/end_datetime` -> `Encounter.period`
- `condition_occurrence.condition_concept_id` -> `Condition.code`
- `measurement.value_as_number` -> `Observation.valueQuantity`
- `measurement.unit_concept_id` -> `Observation.valueQuantity.unit`

## Demo Dataset

Includes MIMIC-IV demo data in OMOP format from PhysioNet:
- Source: https://physionet.org/content/mimic-iv-demo-omop/0.9/
- Contains sample patient data for testing and demonstration

## License

- **Demo Dataset**: ODC Open Database License (ODbL)
- **Project License**: Not explicitly specified in repository (check with maintainers)

## Installation

1. Install Docker
2. Configure `.env` file with PostgreSQL OMOP database connection:
   ```
   ONTOP_DB_URL=jdbc:postgresql://host.docker.internal:5432/mimic?currentSchema=omop
   ONTOP_DB_USER=user
   ONTOP_DB_PASSWORD=password
   ```
3. Run `docker-compose up`
4. Access SPARQL endpoint at http://localhost:8080/

For the demo with sample data:
```bash
cp .env.demo .env
docker-compose -f docker-compose.demo.yml up demo-db
docker-compose -f docker-compose.demo.yml up ontop
```

## Example SPARQL Queries

Query patients:
```sparql
PREFIX fhir: <http://hl7.org/fhir/>
SELECT * WHERE {
    ?sub a fhir:Patient .
    ?sub fhir:Patient.gender    [ fhir:value ?gender ] .
    ?sub fhir:Patient.birthDate [ fhir:value ?birthDate ] .
} LIMIT 10
```

Query conditions with SNOMED codes:
```sparql
PREFIX fhir: <http://hl7.org/fhir/>
SELECT DISTINCT ?patient ?code ?system ?display WHERE {
    ?condition a fhir:Condition .
    ?condition fhir:Condition.subject ?patient .
    ?condition fhir:Condition.code [
        fhir:CodeableConcept.coding [
            fhir:Coding.code [ fhir:value ?code ];
            fhir:Coding.system [ fhir:value ?system ];
            fhir:Coding.display [ fhir:value ?display ]
        ]
    ].
    FILTER (str(?system) = 'SNOMED')
} LIMIT 100
```

## References

- Ontop VKG: https://ontop-vkg.org/
- OMOP CDM: https://www.ohdsi.org/data-standardization/the-common-data-model/
- HL7 FHIR: https://www.hl7.org/fhir/
- MIMIC-IV OMOP: Kallfelz, M., et al. (2021). MIMIC-IV demo data in the OMOP Common Data Model (version 0.9). PhysioNet. https://doi.org/10.13026/p1f5-7x35

---

## OMOP PERSON → FHIR Patient Mapping Details

**Note**: This project maps OMOP → FHIR (reverse direction), exposing OMOP data as FHIR via SPARQL.

**Source**: [`input/fhir.obda`](https://github.com/fhircat/FHIROntopOMOP/blob/main/input/fhir.obda)

### OMOP PERSON → FHIR Patient (OBDA Mappings)

| Mapping ID | FHIR Patient Element | OMOP Source | SQL/Logic |
|------------|---------------------|-------------|-----------|
| `Person-person_id` | `Patient` (resource), `Patient.id` | `person.person_id` | `SELECT * FROM "person"` |
| `Person-birthDate1` | `Patient.birthDate` | `person.year_of_birth`, `month_of_birth`, `day_of_birth` | `MAKE_DATE(year_of_birth, month_of_birth, day_of_birth)` |
| `Person-birthDatetime1-5` | `Patient.birthDate.extension[patient-birthTime]` | `person.birth_datetime` | Extension with `valueDatetime` |
| `Person-gender1` | `Patient.gender` (CodeableConcept) | `person.gender_concept_id` | References `CodeableConcept.coding/{concept_id}` |
| `Person-gender2-4` | `Patient.gender` (value) | `person.gender_source_value` | `"male"` if 'M' or 'male'; `"female"` if 'F' or 'female' |

### OBDA Mapping Details

```
# Patient resource and ID
:Patient/{person_id} a :Patient ;
  :Resource.id :Patient/{person_id}/id .
:Patient/{person_id}/id :value {person_id}^^xsd:string .

# Birth date (composed from year/month/day)
:Patient/{person_id} :Patient.birthDate :Patient/{person_id}/birthDate .
:Patient/{person_id}/birthDate :value {MAKE_DATE(...)}^^xsd:date .

# Birth datetime extension
:Patient/{person_id}/birthDate :Element.extension ... .
  :Extension.url "http://hl7.org/fhir/StructureDefinition/patient-birthTime" .
  :Extension.valueDatetime {birth_datetime}^^xsd:dateTime .

# Gender - linked to concept
:Patient/{person_id} :Patient.gender :CodeableConcept.coding/{gender_concept_id} .

# Gender - source value based
:Patient/{person_id}/gender :value "male"^^xsd:string .
  WHERE gender_source_value LIKE 'M' or 'male'
:Patient/{person_id}/gender :value "female"^^xsd:string .
  WHERE gender_source_value LIKE 'F' or 'female'
```

### Gender Value Mapping

| OMOP `gender_source_value` | FHIR `Patient.gender` |
|----------------------------|----------------------|
| `'M'` or `'male'` | `"male"` |
| `'F'` or `'female'` | `"female"` |

### RDF Output Structure

The mapping produces FHIR RDF triples following the FHIR RDF representation:

```turtle
<http://hl7.org/fhir/Patient/12345> a fhir:Patient ;
  fhir:Resource.id <http://hl7.org/fhir/Patient/12345/id> ;
  fhir:Patient.birthDate <http://hl7.org/fhir/Patient/12345/birthDate> ;
  fhir:Patient.gender <http://hl7.org/fhir/Patient/12345/gender> .

<http://hl7.org/fhir/Patient/12345/id> fhir:value "12345"^^xsd:string .
<http://hl7.org/fhir/Patient/12345/birthDate> fhir:value "1990-05-15"^^xsd:date .
<http://hl7.org/fhir/Patient/12345/gender> fhir:value "male"^^xsd:string .
```

### Fields NOT Mapped (in current fhir.obda)

The basic `fhir.obda` mapping is minimal. Fields not currently mapped:
- `race_concept_id` → (no Patient.extension for race)
- `ethnicity_concept_id` → (no Patient.extension for ethnicity)
- `location_id` → `Patient.address`
- `provider_id` → `Patient.generalPractitioner`
- `care_site_id` → `Patient.managingOrganization`
- `person_source_value` → `Patient.identifier`

### Extended Mapping (omop.obda)

The [`input/omop.obda`](https://github.com/fhircat/FHIROntopOMOP/blob/main/input/omop.obda) file contains more comprehensive mappings for all OMOP tables.

### Notes

- This is **OMOP → FHIR** direction (reverse of most ETL projects)
- Virtual mapping via Ontop - no data transformation occurs
- SPARQL queries are translated to SQL at runtime
- Gender mapping uses simple string matching on `gender_source_value`
- Birth date is constructed from separate year/month/day fields using `MAKE_DATE()`
- Birth datetime is exposed via the standard `patient-birthTime` extension

---

## OMOP MEASUREMENT → FHIR Observation Mapping Details

**Note**: This project maps **OMOP → FHIR** (reverse direction), exposing OMOP measurement data as FHIR Observation via SPARQL.

**Source**: [`input/omop.obda`](https://github.com/fhircat/FHIROntopOMOP/blob/main/input/omop.obda) - `mapping12` and `mapping13`

### OMOP MEASUREMENT → FHIR Observation (OBDA Mappings)

| FHIR Observation Element | OMOP MEASUREMENT Source | SQL/Logic |
|-------------------------|-------------------------|-----------|
| `Observation` (resource type) | `measurement` table | `a :Observation` |
| `Observation.id` | `measurement_id` | `{measurement_id}^^xsd:string` |
| `Observation.status` | (hardcoded) | `"final"^^xsd:string` |
| `Observation.code` | `measurement_concept_id` | References `CodeableConcept/{measurement_concept_id}` |
| `Observation.category` | `measurement_type_concept_id` | References `CodeableConcept/{measurement_type_concept_id}` |
| `Observation.subject` | `person_id` | Link to `Patient/{person_id}` |
| `Observation.encounter` | `visit_occurrence_id` | Link to `Encounter/{visit_occurrence_id}` |
| `Observation.effectiveDateTime` | `measurement_datetime` | `{measurement_datetime}^^xsd:dateTime` |
| `Observation.effectivePeriod.start` | `measurement_datetime` | Same as effectiveDateTime |
| `Observation.valueCodeableConcept` | `value_as_concept_id` | References `CodeableConcept/{value_as_concept_id}` |
| `Observation.valueString` | `value_as_number` | `{value_as_number}^^xsd:string` |
| `Observation.valueQuantity.value` | `value_as_number` | `{value_as_number}^^xsd:decimal` |
| `Observation.valueQuantity.unit` | `unit_concept_id` | Joined to `concept.concept_name` |
| `Observation.referenceRange.low` | `range_low` | `{range_low}^^xsd:string` |
| `Observation.referenceRange.high` | `range_high` | `{range_high}^^xsd:string` |
| `Observation.performer` | `provider_id` | Link to `Practitioner/{provider_id}` |

### OBDA Mapping Details

**mapping12** - Basic Observation mapping:
```
SQL: SELECT * FROM measurement

Target RDF:
:Observation/{measurement_id} a :Observation ;
  :Resource.id {measurement_id} ;
  :Observation.status "final" ;
  :Observation.code :CodeableConcept/{measurement_concept_id} ;
  :Observation.category :CodeableConcept/{measurement_type_concept_id} ;
  :Observation.subject -> :Patient/{person_id} ;
  :Observation.encounter -> :Encounter/{visit_occurrence_id} ;
  :Observation.effectiveDateTime {measurement_datetime} ;
  :Observation.valueCodeableConcept :CodeableConcept/{value_as_concept_id} ;
  :Observation.valueString {value_as_number} ;
  :Observation.referenceRange.low {range_low} ;
  :Observation.referenceRange.high {range_high} ;
  :Observation.performer -> :Practitioner/{provider_id} .
```

**mapping13** - Value with unit (Quantity):
```
SQL: SELECT measurement.*, concept_name AS measurement_unit
     FROM measurement, concept
     WHERE measurement.unit_concept_id = concept.concept_id

Target RDF:
:Observation/{measurement_id} :Observation.valueQuantity [
  :Quantity.value {value_as_number}^^xsd:decimal ;
  :Quantity.unit {measurement_unit}
] .
```

### Example SPARQL Query for Observations

```sparql
PREFIX fhir: <http://hl7.org/fhir/>

SELECT ?patient ?code ?value ?unit ?datetime WHERE {
  ?observation a fhir:Observation .
  ?observation fhir:Observation.subject [ fhir:link ?patient ] .
  ?observation fhir:Observation.code ?codeRef .
  ?codeRef fhir:CodeableConcept.coding [
    fhir:Coding.code [ fhir:value ?code ]
  ] .
  ?observation fhir:Observation.effectiveDateTime [ fhir:value ?datetime ] .
  OPTIONAL {
    ?observation fhir:Observation.valueQuantity [
      fhir:Quantity.value [ fhir:value ?value ];
      fhir:Quantity.unit [ fhir:value ?unit ]
    ]
  }
} LIMIT 100
```

### Notes

- This is **OMOP MEASUREMENT → FHIR Observation** direction (reverse of most ETL projects)
- OMOP `observation` table is **NOT** mapped in this project - only `measurement`
- Status is hardcoded to `"final"` for all observations
- Both `valueString` and `valueQuantity` are populated from `value_as_number`
- Unit is obtained by joining to the `concept` table on `unit_concept_id`
- Reference ranges (`range_low`, `range_high`) are mapped as strings
- Virtual mapping via Ontop - no data transformation occurs at rest
- SPARQL queries are translated to SQL at runtime

---

## OMOP VISIT_OCCURRENCE → FHIR Encounter Mapping

**Source**: [`input/omop.obda`](https://github.com/NACHC-CAD/FHIROntopOMOP/blob/main/input/omop.obda) - mapping7

**Direction**: OMOP → FHIR (virtual mapping via Ontop)

### Ontop OBDA Mapping (mapping7)

```
mappingId  mapping7
target     <http://hl7.org/fhir/Encounter/{visit_occurrence_id}>
           rdf:type fhir:Encounter ;
           fhir:Resource.id [ fhir:value "{visit_occurrence_id}" ] ;
           fhir:Encounter.status [ fhir:value "finished" ] ;
           fhir:Encounter.type <http://hl7.org/fhir/CodeableConcept/{visit_concept_id}> ;
           fhir:Encounter.class <http://hl7.org/fhir/CodeableConcept/{visit_type_concept_id}> ;
           fhir:Encounter.subject [ fhir:link <http://hl7.org/fhir/Patient/{person_id}> ] ;
           fhir:Encounter.period [
             fhir:Period.start [ fhir:value "{visit_start_datetime}" ] ;
             fhir:Period.end [ fhir:value "{visit_end_datetime}" ]
           ] ;
           fhir:Encounter.performer [ fhir:link <http://hl7.org/fhir/Practitioner/{provider_id}> ] ;
           fhir:Encounter.partOf [ fhir:link <http://hl7.org/fhir/Encounter/{preceding_visit_occurrence_id}> ] .
source     SELECT * FROM visit_occurrence
```

### Field-Level Mapping

| FHIR Encounter Field | OMOP VISIT_OCCURRENCE Column | RDF Property |
|----------------------|------------------------------|--------------|
| `id` | `visit_occurrence_id` | `fhir:Resource.id` |
| `status` | (hardcoded) | `"finished"` |
| `type` | `visit_concept_id` | `fhir:Encounter.type` |
| `class` | `visit_type_concept_id` | `fhir:Encounter.class` |
| `subject` | `person_id` | `fhir:Encounter.subject` → Patient |
| `period.start` | `visit_start_datetime` | `fhir:Period.start` |
| `period.end` | `visit_end_datetime` | `fhir:Period.end` |
| `performer` | `provider_id` | `fhir:Encounter.performer` → Practitioner |
| `partOf` | `preceding_visit_occurrence_id` | `fhir:Encounter.partOf` → Encounter |

### Notes

- **Direction**: OMOP → FHIR only (no FHIR → OMOP)
- **Virtual mapping**: No data transformation - SQL translated at query time
- **Status hardcoded**: Always "finished"
- **Concept references**: `visit_concept_id` and `visit_type_concept_id` link to CodeableConcept resources
- **Preceding visit**: `partOf` references preceding encounter if available
- **Provider**: Mapped via `performer` (not `participant`)

---

## OMOP CONDITION_OCCURRENCE → FHIR Condition Mapping

**Source**: [`input/fhir.obda`](https://github.com/fhircat/FHIROntopOMOP/blob/main/input/fhir.obda)

**Direction**: OMOP → FHIR (virtual mapping via Ontop)

### OBDA Mapping Details

| FHIR Condition Field | OMOP CONDITION_OCCURRENCE Column | OBDA Mapping |
|----------------------|----------------------------------|--------------|
| `Condition` (resource) | `condition_occurrence` table | `a :Condition` |
| `id` | `condition_occurrence_id` | `{condition_occurrence_id}^^xsd:string` |
| `code` | `condition_concept_id` | References `CodeableConcept/{condition_concept_id}` |
| `category` | `condition_type_concept_id` | References `CodeableConcept/{condition_type_concept_id}` |
| `subject` | `person_id` | Link to `Patient/{person_id}` |
| `onsetDatetime` | `condition_start_datetime` | `{condition_start_datetime}^^xsd:dateTime` |
| `abatementDatetime` | `condition_end_datetime` | `{condition_end_datetime}^^xsd:dateTime` |

### OBDA Mapping Targets

```
target  :Condition/{condition_occurrence_id} a :Condition ;
        :Resource.id :Condition/{condition_occurrence_id}/id .
source  SELECT * FROM condition_occurrence

target  :Condition/{condition_occurrence_id}/id :value {condition_occurrence_id}^^xsd:string .
source  SELECT * FROM condition_occurrence

target  :Condition/{condition_occurrence_id} :Condition.code
        :Condition/{condition_occurrence_id}/{condition_concept_id} .
source  SELECT * FROM condition_occurrence

target  :Condition/{condition_occurrence_id}/{condition_concept_id}
        :CodeableConcept.coding :CodeableConcept.coding/{condition_concept_id} .
source  SELECT * FROM condition_occurrence

target  :Condition/{condition_occurrence_id} :Condition.category
        :Condition/{condition_occurrence_id}/{condition_type_concept_id} .
source  SELECT * FROM condition_occurrence

target  :Condition/{condition_occurrence_id} :Condition.subject :Patient/{person_id} .
source  SELECT * FROM condition_occurrence

target  :Condition/{condition_occurrence_id} :Condition.onsetDatetime
        :Condition/{condition_occurrence_id}/onsetDatetime .
source  SELECT * FROM condition_occurrence

target  :Condition/{condition_occurrence_id}/onsetDatetime
        :value {condition_start_datetime}^^xsd:dateTime .
source  SELECT * FROM condition_occurrence

target  :Condition/{condition_occurrence_id} :Condition.abatementDatetime
        :Condition/{condition_occurrence_id}/abatementDatetime .
source  SELECT * FROM condition_occurrence

target  :Condition/{condition_occurrence_id}/abatementDatetime
        :value {condition_end_datetime}^^xsd:dateTime .
source  SELECT * FROM condition_occurrence
```

### Example SPARQL Query

```sparql
PREFIX fhir: <http://hl7.org/fhir/>

SELECT ?patient ?code ?onset WHERE {
  ?condition a fhir:Condition .
  ?condition fhir:Condition.subject [ fhir:link ?patient ] .
  ?condition fhir:Condition.code ?codeRef .
  ?codeRef fhir:CodeableConcept.coding [
    fhir:Coding.code [ fhir:value ?code ]
  ] .
  ?condition fhir:Condition.onsetDatetime [ fhir:value ?onset ] .
} LIMIT 100
```

### Notes

- **Direction**: OMOP → FHIR only (virtual mapping)
- **Virtual mapping**: No data transformation - SPARQL translated to SQL at runtime
- **Code lookup**: Joins to concept table for code/system information
- **Category**: `condition_type_concept_id` maps to Condition.category
- **Clinical status**: Not mapped (OMOP has no direct equivalent)
- **Verification status**: Not mapped
- **Provider/Encounter**: Not mapped in current OBDA file

---

## OMOP PROCEDURE_OCCURRENCE → FHIR Procedure Mapping

**Source**: [`input/omop.obda`](https://github.com/fhircat/FHIROntopOMOP/blob/main/input/omop.obda) - mapping10

**Direction**: OMOP → FHIR (virtual mapping via Ontop)

### Ontop OBDA Mapping (mapping10)

| FHIR Procedure Field | OMOP PROCEDURE_OCCURRENCE Column | RDF Property |
|----------------------|----------------------------------|--------------|
| `Procedure` (resource type) | `procedure_occurrence` table | `a :Procedure` |
| `id` | `procedure_occurrence_id` | `{procedure_occurrence_id}^^xsd:string` |
| `code` | `procedure_concept_id` | References `CodeableConcept/{procedure_concept_id}` |
| `category` | `procedure_type_concept_id` | References `CodeableConcept/{procedure_type_concept_id}` |
| `subject` | `person_id` | Link to `Patient/{person_id}` |
| `encounter` | `visit_occurrence_id` | Link to `Encounter/{visit_occurrence_id}` |
| `performedDateTime` | `procedure_datetime` | `{procedure_datetime}^^xsd:dateTime` |
| `performer` | `provider_id` | Link to `Practitioner/{provider_id}` |

### OBDA Mapping Target (mapping10)

```
target  <http://hl7.org/fhir/Procedure/{procedure_occurrence_id}>
        rdf:type fhir:Procedure ;
        fhir:Resource.id [ fhir:value "{procedure_occurrence_id}" ] ;
        fhir:Procedure.code <http://hl7.org/fhir/CodeableConcept/{procedure_concept_id}> ;
        fhir:Procedure.category <http://hl7.org/fhir/CodeableConcept/{procedure_type_concept_id}> ;
        fhir:Procedure.subject [ fhir:link <http://hl7.org/fhir/Patient/{person_id}> ] ;
        fhir:Procedure.encounter [ fhir:link <http://hl7.org/fhir/Encounter/{visit_occurrence_id}> ] ;
        fhir:Procedure.performedDateTime [ fhir:value "{procedure_datetime}" ] ;
        fhir:Procedure.performer [ fhir:link <http://hl7.org/fhir/Practitioner/{provider_id}> ] .

source  SELECT * FROM procedure_occurrence
```

### Example SPARQL Query

```sparql
PREFIX fhir: <http://hl7.org/fhir/>

SELECT ?patient ?code ?datetime WHERE {
  ?procedure a fhir:Procedure .
  ?procedure fhir:Procedure.subject [ fhir:link ?patient ] .
  ?procedure fhir:Procedure.code ?codeRef .
  ?codeRef fhir:CodeableConcept.coding [
    fhir:Coding.code [ fhir:value ?code ]
  ] .
  ?procedure fhir:Procedure.performedDateTime [ fhir:value ?datetime ] .
} LIMIT 100
```

### Notes

- **Direction**: OMOP → FHIR only (virtual mapping)
- **Virtual mapping**: No data transformation - SPARQL translated to SQL at runtime
- **Status**: Not mapped (OMOP has no status field)
- **Code lookup**: `procedure_concept_id` joins to concept table for code/system
- **Category**: `procedure_type_concept_id` maps to Procedure.category
- **Modifier**: `modifier_concept_id` not mapped
- **Quantity**: Not mapped

---

## OMOP DRUG_EXPOSURE → FHIR MedicationStatement Mapping

**Source**: [`input/omop.obda`](https://github.com/fhircat/FHIROntopOMOP/blob/main/input/omop.obda) - mapping11

**Direction**: OMOP → FHIR (virtual mapping via Ontop)

### Ontop OBDA Mapping (mapping11)

| FHIR MedicationStatement Field | OMOP DRUG_EXPOSURE Column | RDF Property |
|--------------------------------|--------------------------|--------------|
| `MedicationStatement` (resource type) | `drug_exposure` table | `a :MedicationStatement` |
| `id` | `drug_exposure_id` | `{drug_exposure_id}^^xsd:string` |
| `status` | (hardcoded) | `"completed"^^xsd:string` |
| `statusReason` | `stop_reason` | `{stop_reason}^^xsd:string` |
| `medicationCodeableConcept` | `drug_concept_id` | References `CodeableConcept/{drug_concept_id}` |
| `category` | `drug_type_concept_id` | References `CodeableConcept/{drug_type_concept_id}` |
| `subject` | `person_id` | Link to `Patient/{person_id}` |
| `context` | `visit_occurrence_id` | Link to `Encounter/{visit_occurrence_id}` |
| `effectiveDateTime` | `drug_exposure_start_datetime` | `{drug_exposure_start_datetime}^^xsd:dateTime` |
| `effectivePeriod.start` | `drug_exposure_start_datetime` | Same as effectiveDateTime |
| `effectivePeriod.end` | `drug_exposure_end_datetime` | `{drug_exposure_end_datetime}^^xsd:dateTime` |

### Example SPARQL Query

```sparql
PREFIX fhir: <http://hl7.org/fhir/>

SELECT ?patient ?code ?startDate WHERE {
  ?medStatement a fhir:MedicationStatement .
  ?medStatement fhir:MedicationStatement.subject [ fhir:link ?patient ] .
  ?medStatement fhir:MedicationStatement.medicationCodeableConcept ?codeRef .
  ?codeRef fhir:CodeableConcept.coding [
    fhir:Coding.code [ fhir:value ?code ]
  ] .
  ?medStatement fhir:MedicationStatement.effectiveDateTime [ fhir:value ?startDate ] .
} LIMIT 100
```

### Notes

- **Direction**: OMOP → FHIR only (virtual mapping)
- **Virtual mapping**: No data transformation - SPARQL translated to SQL at runtime
- **Status hardcoded**: Always "completed"
- **StatusReason**: Maps `stop_reason` if present
- **Code lookup**: `drug_concept_id` joins to concept table for code/system
- **Category**: `drug_type_concept_id` maps to MedicationStatement.category

---

## OMOP DRUG_EXPOSURE → FHIR Immunization Mapping

**Note**: FHIROntopOMOP does **NOT** currently implement a specific Immunization OBDA mapping. The `drug_exposure` table is mapped only to `MedicationStatement`.

### Not Implemented

If Immunization mapping were added, it would require:

1. **Additional OBDA mapping** filtering `drug_exposure` by CVX vocabulary:
```sql
SELECT de.*
FROM drug_exposure de
JOIN concept c ON de.drug_concept_id = c.concept_id
WHERE c.vocabulary_id = 'CVX'
```

2. **Mapping to Immunization resource**:
| FHIR Immunization Field | OMOP Source |
|-------------------------|-------------|
| `Immunization.vaccineCode` | `drug_concept_id` (CVX concept) |
| `Immunization.occurrenceDateTime` | `drug_exposure_start_datetime` |
| `Immunization.patient` | `person_id` → Patient reference |
| `Immunization.encounter` | `visit_occurrence_id` → Encounter reference |
| `Immunization.lotNumber` | `lot_number` |
| `Immunization.performer` | `provider_id` → Practitioner reference |

### Current Workaround

CVX-coded drugs can be queried via the existing MedicationStatement mapping and filtered by vocabulary in SPARQL:
```sparql
PREFIX fhir: <http://hl7.org/fhir/>

SELECT ?patient ?code ?display WHERE {
  ?medStatement a fhir:MedicationStatement .
  ?medStatement fhir:MedicationStatement.subject [ fhir:link ?patient ] .
  ?medStatement fhir:MedicationStatement.medicationCodeableConcept ?codeRef .
  ?codeRef fhir:CodeableConcept.coding [
    fhir:Coding.system [ fhir:value "CVX" ];
    fhir:Coding.code [ fhir:value ?code ];
    fhir:Coding.display [ fhir:value ?display ]
  ] .
}
```

---

## OMOP OBSERVATION → FHIR AllergyIntolerance Mapping

**Note**: FHIROntopOMOP does **NOT** currently implement AllergyIntolerance OBDA mapping. Allergy data in OMOP `observation` table is not exposed as a separate FHIR resource type.

### Not Implemented

If AllergyIntolerance mapping were added, it would require:

1. **Additional OBDA mapping** filtering `observation` by allergy concepts:
```sql
SELECT o.*
FROM observation o
JOIN concept c ON o.observation_concept_id = c.concept_id
WHERE c.concept_name LIKE '%Allerg%'
```

2. **Mapping to AllergyIntolerance resource**:
| FHIR AllergyIntolerance Field | OMOP Source |
|-------------------------------|-------------|
| `AllergyIntolerance.code` | `observation_concept_id` |
| `AllergyIntolerance.patient` | `person_id` → Patient reference |
| `AllergyIntolerance.onsetDateTime` | `observation_date` |
| `AllergyIntolerance.reaction.manifestation` | `value_as_concept_id` |
| `AllergyIntolerance.recorder` | `provider_id` → Practitioner reference |

### Current Workaround

Allergy observations can be queried via the existing Observation mapping and filtered by concept name in SPARQL:
```sparql
PREFIX fhir: <http://hl7.org/fhir/>

SELECT ?patient ?code ?display WHERE {
  ?obs a fhir:Observation .
  ?obs fhir:Observation.subject [ fhir:link ?patient ] .
  ?obs fhir:Observation.code ?codeRef .
  ?codeRef fhir:CodeableConcept.coding [
    fhir:Coding.display [ fhir:value ?display ]
  ] .
  FILTER(CONTAINS(LCASE(?display), "allerg"))
}
```

---

## OMOP → FHIR DiagnosticReport Mapping

**Note**: FHIROntopOMOP does **NOT** currently implement DiagnosticReport OBDA mapping.

### Not Implemented

No OBDA mapping template exists for DiagnosticReport. This would be complex as DiagnosticReport is a container resource that references other Observation resources.

If DiagnosticReport mapping were added, it would require:

1. **Identifying diagnostic study results** from measurement/observation tables by LOINC code patterns
2. **Grouping related results** under a DiagnosticReport container
3. **Creating referenced Observation resources** for individual results

### Current Workaround

Diagnostic study data can be queried directly from the existing Observation or Measurement mappings using SPARQL:
```sparql
PREFIX fhir: <http://hl7.org/fhir/>

SELECT ?patient ?code ?display ?value WHERE {
  ?obs a fhir:Observation .
  ?obs fhir:Observation.subject [ fhir:link ?patient ] .
  ?obs fhir:Observation.code ?codeRef .
  ?codeRef fhir:CodeableConcept.coding [
    fhir:Coding.system [ fhir:value "http://loinc.org" ];
    fhir:Coding.code [ fhir:value ?code ];
    fhir:Coding.display [ fhir:value ?display ]
  ] .
}
```
