// ValueSets for OMOP FHIR profiles

// ============================================================
// Drug terminology ValueSets
// ============================================================

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

// ============================================================
// Condition terminology ValueSets
// ============================================================

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

// ============================================================
// Observation/Measurement terminology ValueSets
// ============================================================

// Observation codes resolvable via OMOP vocabulary tables
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

// ============================================================
// Status ValueSets
// ============================================================

// MedicationStatement statuses representing actual drug exposure
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

// MedicationRequest statuses representing actual prescriptions
ValueSet: OmopMedicationRequestStatus
Id: omop-medication-request-status
Title: "OMOP-Mappable MedicationRequest Status"
Description: """
  Only statuses that represent an actual prescription/drug order.
  Draft, cancelled, entered-in-error, and unknown do not correspond
  to OMOP drug_exposure records.
"""
* http://hl7.org/fhir/CodeSystem/medicationrequest-status#active     "Active"
* http://hl7.org/fhir/CodeSystem/medicationrequest-status#completed  "Completed"

// Encounter statuses representing actual visits
ValueSet: OmopEncounterStatus
Id: omop-encounter-status
Title: "OMOP-Mappable Encounter Status"
Description: """
  Only statuses that represent an actual clinical encounter.
  Planned, cancelled, and entered-in-error encounters do not
  correspond to OMOP visit_occurrence records.
"""
* http://hl7.org/fhir/CodeSystem/encounter-status#finished      "Finished"
* http://hl7.org/fhir/CodeSystem/encounter-status#in-progress   "In Progress"

// Encounter class codes for visit type determination
ValueSet: OmopEncounterClass
Id: omop-encounter-class
Title: "OMOP-Mappable Encounter Class"
Description: """
  ActCode values that map to OMOP visit_concept_id.
  IMP=inpatient (9201), AMB=outpatient (9202), EMER=emergency (9203), etc.
"""
* http://terminology.hl7.org/CodeSystem/v3-ActCode#IMP       "Inpatient"
* http://terminology.hl7.org/CodeSystem/v3-ActCode#ACUTE     "Inpatient Acute"
* http://terminology.hl7.org/CodeSystem/v3-ActCode#AMB       "Ambulatory"
* http://terminology.hl7.org/CodeSystem/v3-ActCode#EMER      "Emergency"
* http://terminology.hl7.org/CodeSystem/v3-ActCode#HH        "Home Health"
* http://terminology.hl7.org/CodeSystem/v3-ActCode#SS        "Short Stay"
* http://terminology.hl7.org/CodeSystem/v3-ActCode#OBSENC    "Observation Encounter"
* http://terminology.hl7.org/CodeSystem/v3-ActCode#FLD       "Field"
* http://terminology.hl7.org/CodeSystem/v3-ActCode#VR        "Virtual"

// Condition clinical status values representing active conditions
ValueSet: OmopConditionClinicalStatus
Id: omop-condition-clinical-status
Title: "OMOP-Mappable Condition Clinical Status"
Description: """
  Only clinical statuses that represent conditions suitable for OMOP mapping.
  Inactive, resolved, and remission conditions are typically not converted
  to condition_occurrence unless historical records are desired.
"""
* http://terminology.hl7.org/CodeSystem/condition-clinical#active      "Active"
* http://terminology.hl7.org/CodeSystem/condition-clinical#recurrence  "Recurrence"
* http://terminology.hl7.org/CodeSystem/condition-clinical#relapse     "Relapse"

// Condition verification status values (excludes entered-in-error)
ValueSet: OmopConditionVerificationStatus
Id: omop-condition-verification-status
Title: "OMOP-Mappable Condition Verification Status"
Description: """
  Verification statuses acceptable for OMOP mapping.
  Resources with entered-in-error or refuted are never converted.
"""
* http://terminology.hl7.org/CodeSystem/condition-ver-status#confirmed     "Confirmed"
* http://terminology.hl7.org/CodeSystem/condition-ver-status#unconfirmed   "Unconfirmed"
* http://terminology.hl7.org/CodeSystem/condition-ver-status#provisional   "Provisional"
* http://terminology.hl7.org/CodeSystem/condition-ver-status#differential  "Differential"

// Observation statuses representing finalized results
ValueSet: OmopObservationStatus
Id: omop-observation-status
Title: "OMOP-Mappable Observation Status"
Description: """
  Only statuses that represent finalized observation results.
  Preliminary, registered, cancelled, entered-in-error, and unknown
  observations are not converted to OMOP records.
"""
* http://hl7.org/fhir/CodeSystem/observation-status#final      "Final"
* http://hl7.org/fhir/CodeSystem/observation-status#amended    "Amended"
* http://hl7.org/fhir/CodeSystem/observation-status#corrected  "Corrected"

// Observation categories for OMOP measurement table routing
ValueSet: OmopMeasurementCategory
Id: omop-measurement-category
Title: "OMOP Measurement Category"
Description: """
  Observation categories that route to the OMOP measurement table.
"""
* http://terminology.hl7.org/CodeSystem/observation-category#laboratory     "Laboratory"
* http://terminology.hl7.org/CodeSystem/observation-category#vital-signs    "Vital Signs"

// Observation categories for OMOP observation table routing
ValueSet: OmopObservationTableCategory
Id: omop-observation-table-category
Title: "OMOP Observation Table Category"
Description: """
  Observation categories that route to the OMOP observation table.
"""
* http://terminology.hl7.org/CodeSystem/observation-category#social-history "Social History"
* http://terminology.hl7.org/CodeSystem/observation-category#survey         "Survey"
* http://terminology.hl7.org/CodeSystem/observation-category#activity       "Activity"

// ============================================================
// AllergyIntolerance ValueSets
// ============================================================

// AllergyIntolerance codes resolvable via OMOP vocabulary tables
ValueSet: OmopAllergyIntoleranceCodes
Id: omop-allergy-intolerance-codes
Title: "OMOP-Resolvable AllergyIntolerance Codes"
Description: """
  Substance/allergen terminology systems that have standard concept
  mappings in the OMOP vocabulary tables.
"""
* codes from system http://snomed.info/sct                         // SNOMED CT — preferred for allergens
* codes from system http://www.nlm.nih.gov/research/umls/rxnorm   // RxNorm — for medication allergies
* codes from system http://hl7.org/fhir/sid/ndc                   // NDC

// AllergyIntolerance clinical status — only active
ValueSet: OmopAllergyIntoleranceClinicalStatus
Id: omop-allergy-intolerance-clinical-status
Title: "OMOP-Mappable AllergyIntolerance Clinical Status"
Description: """
  Only active allergies are converted to OMOP observation records.
  Inactive, resolved, and other statuses are not mapped.
"""
* http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical#active "Active"

// AllergyIntolerance verification status (excludes entered-in-error and refuted)
ValueSet: OmopAllergyIntoleranceVerificationStatus
Id: omop-allergy-intolerance-verification-status
Title: "OMOP-Mappable AllergyIntolerance Verification Status"
Description: """
  Verification statuses acceptable for OMOP mapping.
  Resources with entered-in-error or refuted are never converted.
"""
* http://terminology.hl7.org/CodeSystem/allergyintolerance-verification#confirmed   "Confirmed"
* http://terminology.hl7.org/CodeSystem/allergyintolerance-verification#unconfirmed "Unconfirmed"
* http://terminology.hl7.org/CodeSystem/allergyintolerance-verification#presumed    "Presumed"
