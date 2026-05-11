# Coverage → OMOP Mapping

FHIR `Coverage` captures a patient's insurance enrollment -- the payer, plan, coverage period, and subscriber relationship. It maps primarily to OMOP `payer_plan_period`, which records continuous enrollment under a specific health benefit plan from a given payer. Unlike clinical event tables, `payer_plan_period` carries no `_type_concept_id`; it is purely administrative.

Coverage is also closely related to `ExplanationOfBenefit` (EOB), which contains adjudicated claim-level costs. In practice, many ETLs derive `payer_plan_period` from EOB rather than Coverage directly (see avalon-fhir-omop), because claims data often comes from flat files rather than discrete FHIR Coverage resources.

## Target OMOP Tables

| OMOP Table | Purpose | Required? |
|---|---|---|
| `payer_plan_period` | One row per continuous enrollment period per person per payer/plan | Yes |
| `cost` | Claim-level costs (from Claim/ExplanationOfBenefit, not Coverage) | No -- separate mapper |

## Mapping Strategy

The Coverage to payer_plan_period mapping is conceptually simple (it is mostly a period + payer identity) but operationally complex because of vocabulary gaps and the lack of a standard payer taxonomy in FHIR:

1. **Payer identification.** FHIR `Coverage.payor` is a Reference to Organization, Patient, or RelatedPerson. OMOP needs a `payer_concept_id` (an integer from the OMOP Payer vocabulary, domain_id = "Payer") and a `payer_source_value` (free text). There is no normative FHIR-to-OMOP payer concept map. Most implementations store the payor organization name or identifier as `payer_source_value` and set `payer_concept_id = 0`. The mends-on-fhir project maintains a large ConceptMap (~130 entries) mapping OMOP payer concept_ids to FHIR `v3-ActCode` codes, but this is reverse-direction (OMOP to FHIR).

2. **Plan classification.** FHIR uses `Coverage.type` (CodeableConcept bound to `http://terminology.hl7.org/CodeSystem/v3-ActCode` -- values like `HIP`, `MCPOL`, `SUBSUPP`, `pay`) for high-level plan category, and `Coverage.class[]` (a repeating BackboneElement with `type`/`value`/`name` sub-fields) for structured plan details (group, plan, subplan, class, subclass, sequence, rxbin, rxpcn). OMOP has `plan_source_value` (free text) and `plan_concept_id` (integer). Mapping `Coverage.type.coding.code` to `plan_concept_id` requires a local vocabulary lookup. Most implementations concatenate class values into `plan_source_value`.

3. **Coverage period.** `Coverage.period.start` and `Coverage.period.end` map directly to `payer_plan_period_start_date` and `payer_plan_period_end_date`. Both OMOP fields are NOT NULL. When `Coverage.period` is absent or open-ended, a synthetic boundary is needed (e.g., ETL start date, or `9999-12-31` for open-ended coverage).

4. **Sponsor vs. Payer.** OMOP distinguishes between the payer (who reimburses) and the sponsor (who finances the plan -- e.g., an employer for group health). FHIR separates these into `Coverage.payor` (the insurer) and `Coverage.policyHolder` (the entity that holds the policy, often the employer/sponsor). This mapping is rarely implemented.

5. **Family/subscriber linkage.** OMOP `family_source_value` captures the common identifier linking family members under the same policy. FHIR has `Coverage.subscriberId` and `Coverage.dependent` for this purpose. Concatenating `subscriberId` into `family_source_value` is the natural mapping.

6. **Multiple payors per Coverage.** FHIR allows `Coverage.payor` to be 1..*, but OMOP has a single `payer_source_value` per row. When multiple payors exist, pick the first (primary) or create multiple `payer_plan_period` rows.

7. **Coverage vs. ExplanationOfBenefit as source.** Some ETLs (avalon-fhir-omop) derive `payer_plan_period` from ExplanationOfBenefit.billablePeriod + insurer rather than from Coverage resources. This is common when the source system does not emit discrete Coverage resources. The avalon approach aggregates EOB rows by patient+insurer, taking MIN(start) and MAX(end) as the coverage period.

8. **Status filtering.** Only `active` Coverage resources should produce `payer_plan_period` rows. Cancelled, draft, or entered-in-error Coverage should be skipped.

## Reference Implementations

- **fhir-omop-ig** (HL7) -- Logical model at `refs/refs/fhir-omop-ig/input/fsh/PayerPlanPeriod.fsh`. Defines the OMOP payer_plan_period as a FHIR Logical Model with all 17 fields. No FML mapping from Coverage. Status: active ballot.
- **mends-on-fhir** (Whistle, OMOP to FHIR) -- `refs/refs/mends-on-fhir/whistle-mappings/synthea/whistle-functions/PPP_Coverage.wstl` and implementation at `zzPPP_CoverageImpl.wstl`. Reverse direction: converts OMOP `payer_plan_period` to FHIR Coverage. Uses `payer_plan_period_id` as Coverage.id, `person_id` as beneficiary reference, `plan_source_value` as payor display. Includes ConceptMap `PPP.payor-concept-id--Coverage.type.json` mapping ~130 OMOP payer concept_ids to FHIR v3-ActCode codes. Status: maintained.
- **avalon-fhir-omop** (dbt/SQL, FHIR to OMOP) -- `refs/refs/avalon-fhir-omop/omop-views/models/omop_payer_plan_period.sql`. Derives payer_plan_period from ExplanationOfBenefit (not Coverage). Groups by patient+insurer, uses MIN/MAX of billablePeriod for dates. Extracts plan type from contained Coverage resource. All concept_ids set to 0 or NULL. Status: maintained.
- **FhirToCdm** (OHDSI, C#) -- `refs/refs/FhirToCdm/CdmPersonBuilder.cs`. Has `PayerPlanPeriodsRaw` list and `BuildPayerPlanPeriods()` method that collapses overlapping periods with matching payer+plan source values. No explicit Coverage-to-PayerPlanPeriod mapper found -- the framework supports it but the FHIR-specific extraction is minimal.
- **omop-fhir-data** (Synthea JSON) -- `refs/refs/omop-fhir-data/synthea-cohort-010/Payer_Plan_Period_0000000000.json`. Synthea-generated sample data showing typical payer_plan_period rows: all concept_ids = 0, payer_source_value = UUID, plan_source_value = insurer name (e.g., "Cigna Health", "UnitedHealthcare").
- **omoponfhir** -- No Coverage mapper found.
- **ETL-German-FHIR-Core** -- No Coverage/payer_plan_period mapper found (German MII profiles do not include Coverage).
- **NACHC-fhir-to-omop** -- Has `PayerPlanPeriodDvo.java` data object but no FHIR Coverage mapper found.
- **fhir-to-omop-demo** (jq) -- Schema includes payer_plan_period DDL but no Coverage mapper.

## Status in This Project

Not yet implemented.
