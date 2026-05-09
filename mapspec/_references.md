# External References — FHIR ↔ OMOP

Articles, papers, blog posts, and official resources relevant to FHIR-to-OMOP mapping.

## Official Specifications & Implementation Guides

- [HL7 FHIR to OMOP Implementation Guide (v1.0.0-ballot)](https://build.fhir.org/ig/HL7/fhir-omop-ig/) — Normative IG with FML maps, profiles, and mapping principles.
- [Coded Field Mapping Principles](https://build.fhir.org/ig/HL7/fhir-omop-ig/codemappings.html) — How to map coded FHIR fields to OMOP concept IDs.
- [Common Challenges When Transforming FHIR to OMOP](https://build.fhir.org/ig/HL7/fhir-omop-ig/F2OGeneralIssues.html) — Official IG page on identifier management, temporal precision, vocabulary alignment, and de-identification.
- [MedicationStatement → DrugExposure StructureMap](https://build.fhir.org/ig/HL7/fhir-omop-ig/en/StructureMap-MedicationMap.html) — HL7 IG FML for medication mapping.
- [Drug Exposure OMOP Table (FHIR IG)](https://build.fhir.org/ig/HL7/fhir-omop-ig/en/StructureDefinition-DrugExposure.html) — FHIR logical model for OMOP drug_exposure.
- [OMOP CDM v5.4 Documentation](https://ohdsi.github.io/CommonDataModel/cdm54.html) — Official OMOP CDM table and field specs.
- [Athena OHDSI Vocabulary Browser](https://athena.ohdsi.org/) — Look up OMOP standard concept IDs.

## FHIR to OMOP Cookbook

- [FHIR to OMOP Cookbook v04 (PDF)](https://confluence.hl7.org/download/attachments/81018297/FHIR%20to%20OMOP%20Cookbook_v04.pdf) — HL7/OHDSI mapping guide with per-resource mapping decisions.
- [FHIR to OMOP Cookbook — Mapping mCODE FHIR Resources for Observational Research (OHDSI 2024 Symposium)](https://www.ohdsi.org/wp-content/uploads/2024/10/16-Terry-May_FHIR-to-OMOP-Cookbook-Mapping-mCODE-FHIR-Resources-for-Observational-Research_2024symposium-May-Terry.pdf) — mCODE STU3 mapping patterns for oncology data.
- [OHDSI 2024 Showcase — FHIR to OMOP Cookbook](https://www.ohdsi.org/2024showcase-16/) — Showcase page with session details.

## Peer-Reviewed Papers

- [Toward bidirectional FHIR–OMOP CDM transformations using TermX (Frontiers in Medicine, 2026)](https://www.frontiersin.org/journals/medicine/articles/10.3389/fmed.2026.1736785/full) — Rule-based bidirectional mapping methodology emphasizing reusability, executability, and validation. Covers Observation→Measurement, Patient→Person, Encounter→Visit Occurrence.
- [An ETL-process design for data harmonization with German real-world data based on FHIR and OMOP CDM (Int J Med Inform, 2022)](https://www.sciencedirect.com/science/article/pii/S1386505622002398) — Tested with 392,022 FHIR resources at 10 German university hospitals, 99% OMOP CDM conformance, ETL in ~1 minute. [PubMed](https://pubmed.ncbi.nlm.nih.gov/36395615/)
- [MENDS-on-FHIR: leveraging OMOP CDM and FHIR for chronic disease surveillance (JAMIA Open, 2024)](https://academic.oup.com/jamiaopen/article/7/2/ooae045/7685048) — OMOP→FHIR pipeline for CDC surveillance. Both OMOP observations and measurements represented as FHIR Observation resources. [PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC11137321/)
- [FHIR-Ontop-OMOP: Building clinical knowledge graphs (J Biomed Inform, 2022)](https://pubmed.ncbi.nlm.nih.gov/36089199/) — 100+ data elements from Person, Condition_occurrence, Drug_exposure, Procedure_occurrence, Measurement. [PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC9561043/)
- [A Consensus-based Approach for Harmonizing OHDSI CDM with HL7 FHIR (AMIA, 2018)](https://pmc.ncbi.nlm.nih.gov/articles/PMC5939955/) — FHIR W5 classification for harmonization. Foundational paper.
- [Building Interoperable FHIR-based Vocabulary Mapping Services (AMIA, 2018)](https://pmc.ncbi.nlm.nih.gov/articles/PMC5939959/) — OHDSI vocabulary exposed as FHIR ConceptMap and ValueSet resources.
- [Towards Representation of Genomic Data in HL7 FHIR and OMOP CDM (Stud Health Technol Inform, 2021)](https://pubmed.ncbi.nlm.nih.gov/34545823/) — Genomics mapping (MolecularSequence → measurement).
- [OMOP-on-FHIR: Integrating Clinical Data Through FHIR Bundle to OMOP CDM (2025)](https://pubmed.ncbi.nlm.nih.gov/40380541/) — Recent paper on bundle-level integration.
- [Bridging FHIR and OMOP: Data Lineage for Observational Data Conversion (OHDSI 2025 Symposium)](https://www.ohdsi.org/wp-content/uploads/2025/10/110_berk_benjamin_fhir-omop-data-lineage_2025symposium_REPORT-Benjamin-Berk.pdf) — Data provenance tracking in FHIR→OMOP ETL.

## Blog Posts & Tutorials

- [OMOP Odyssey — FHIR to OMOP ETL (InterSystems)](https://community.intersystems.com/post/omop-odyssey-fhir%C2%AE-omop-etl-calypso%E2%80%99s-island) — Practical walkthrough using Bulk FHIR Export with ndjson.
- [FHIR and OMOP: Reflections on the FHIR Connectathon (The Hyve)](https://www.thehyve.nl/articles/omop-fhir-connectathon-reflections) — Lessons from HL7 connectathon exercises.
- [Where does OMOP-OHDSI fit in the open source health informatics environment? (The Hyve)](https://www.thehyve.nl/articles/omop-ohdsi-openehr-fhir) — Positioning OMOP alongside openEHR and FHIR.
- [Automating Research-to-Care Data Integration via OMOP and FHIR (Medium/Sciforce)](https://medium.com/sciforce/automating-research-to-care-data-integration-via-omop-and-fhir-63e0249245f5) — Python-based ETL with resumable FHIR loading.
- [OMOP vs FHIR: Healthcare Data Standardization Explained (Kodjin)](https://kodjin.com/blog/omop-and-fhir-data-standardization/) — Overview of differences and complementary use.
- [The Great Debate: OMOP, FHIR, and Your Data Strategy (Lifebit)](https://lifebit.ai/blog/the-great-debate-omop-fhir-and-your-data-strategy/) — FHIR as "ingestion engine" + OMOP as "analytical engine".
- [An Open Approach for Translating FHIR to OMOP — Carl Anderson (YouTube)](https://www.youtube.com/watch?v=WouS6lrRoV8) — Conference talk on open-source FHIR→OMOP translation.

## Commercial / SaaS

- [CareEvolution Orchestrate — FHIR (R4) to OMOP](https://orchestrate.docs.careevolution.com/convert/fhir_to_omop.html) — Cloud API for FHIR→OMOP conversion.

## Organizations & Working Groups

- [HL7 International and OHDSI Collaboration Announcement](https://www.ohdsi.org/ohdsi-hl7-collaboration/) — Joint effort to create a single common data model.
- [OHDSI FHIR Working Group](https://www.ohdsi.org/web/wiki/doku.php?id=projects:workgroups:fhir-wg) — Community working group on FHIR integration.

## OMOP CDM Reference Mapping Docs

- [GT-FHIR OMOP Mapping Documentation](http://gt-health.github.io/GT-FHIR/fhir_omop_mapping.html) — Georgia Tech's per-resource mapping table.
- [GT-FHIR Mapping (GitHub)](https://github.com/gt-health/GT-FHIR/blob/master/docs/fhir_omop_mapping.md) — Same as above in markdown.
- [The Usage of OHDSI OMOP — A Scoping Review (ResearchGate)](https://www.researchgate.net/publication/354748967_The_Usage_of_OHDSI_OMOP_-_A_Scoping_Review) — Survey of OMOP usage patterns across institutions.
