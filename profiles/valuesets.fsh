// ValueSets for OMOP FHIR profiles

// Drug codes resolvable via OMOP vocabulary tables
ValueSet: OmopDrugCodes
Id: omop-drug-codes
Title: "OMOP-Resolvable Drug Codes"
Description: """
  Drug terminology systems that have standard concept mappings
  in the OMOP vocabulary tables. Codes from these systems can
  be resolved to drug_concept_id via the CONCEPT table.
"""
* codes from system http://www.nlm.nih.gov/research/umls/rxnorm   // RxNorm — preferred for drugs
* codes from system http://hl7.org/fhir/sid/ndc                   // NDC (National Drug Code)
* codes from system http://snomed.info/sct                         // SNOMED CT (clinical terms incl. drugs)
* codes from system http://www.whocc.no/atc                        // ATC (WHO Anatomical Therapeutic Chemical)
* codes from system http://hl7.org/fhir/sid/cvx                   // CVX (vaccine codes)

// Statuses representing actual drug exposure (not intentions or errors)
ValueSet: OmopMedicationStatementStatus
Id: omop-medication-statement-status
Title: "OMOP-Mappable MedicationStatement Status"
Description: """
  Only statuses that represent an actual drug exposure event.
  Resources with other statuses (intended, stopped, on-hold,
  entered-in-error, not-taken, unknown) do not correspond to
  OMOP drug_exposure records and should not be converted.
"""
* http://hl7.org/fhir/CodeSystem/medication-statement-status#active     "Active"
* http://hl7.org/fhir/CodeSystem/medication-statement-status#completed  "Completed"

// Condition codes resolvable via OMOP vocabulary tables
ValueSet: OmopConditionCodes
Id: omop-condition-codes
Title: "OMOP-Resolvable Condition Codes"
Description: """
  Condition/diagnosis terminology systems that have standard concept
  mappings in the OMOP vocabulary tables.
"""
* codes from system http://snomed.info/sct                         // SNOMED CT — preferred
* codes from system http://hl7.org/fhir/sid/icd-10-cm              // ICD-10-CM
* codes from system http://hl7.org/fhir/sid/icd-10                 // ICD-10
* codes from system http://www.ama-assn.org/go/cpt                 // CPT-4

// Observation/measurement codes resolvable via OMOP vocabulary tables
ValueSet: OmopObservationCodes
Id: omop-observation-codes
Title: "OMOP-Resolvable Observation Codes"
Description: """
  Observation/measurement terminology systems that have standard concept
  mappings in the OMOP vocabulary tables.
"""
* codes from system http://loinc.org                               // LOINC — preferred for labs/vitals
* codes from system http://snomed.info/sct                         // SNOMED CT
* codes from system http://www.ama-assn.org/go/cpt                 // CPT-4
