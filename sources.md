# OMOP / OHDSI Information Sources

## Official Documentation

### OMOP Common Data Model (CDM)
- **CDM Documentation**: https://ohdsi.github.io/CommonDataModel/
  - Specification of all CDM versions, table structures, and conventions
  - Current version: CDM v5.4
- **GitHub Repository**: https://github.com/OHDSI/CommonDataModel
  - DDL definitions for all supported SQL dialects
  - Release downloads and version history
- **Data Standardization Overview**: https://www.ohdsi.org/data-standardization/

### The Book of OHDSI
- **Free Online Version**: https://ohdsi.github.io/TheBookOfOhdsi/ (also at book.ohdsi.org)
  - Comprehensive guide covering the OHDSI community, data standards, and tools
  - Available in English, Korean, and Chinese
  - Available as HTML, EPUB, and PDF
  - Licensed under Creative Commons Zero v1.0
- **GitHub Repository**: https://github.com/OHDSI/TheBookOfOhdsi

## Standardized Vocabularies

### Athena
- **Vocabulary Download & Search**: https://athena.ohdsi.org
  - Download standardized vocabularies (SNOMED-CT, LOINC, RxNorm, etc.)
  - Faceted search for concepts and codes
  - Free access for anyone
- **GitHub Repository**: https://github.com/OHDSI/Athena

### Usagi (Vocabulary Mapping Tool)
- **Official Page**: https://www.ohdsi.org/analytic-tools/usagi/
- **Documentation**: https://ohdsi.github.io/Usagi/
- **GitHub Repository**: https://github.com/OHDSI/Usagi
  - Maps source codes to OMOP vocabulary concepts
  - Uses term similarity for initial matching with manual review

## Software Tools

### ATLAS (Web-Based Analytics)
- **Demo Instance**: https://atlas-demo.ohdsi.org/
- **GitHub Repository**: https://github.com/OHDSI/Atlas
- **Wiki Documentation**: https://github.com/OHDSI/Atlas/wiki
- **Book of OHDSI Chapter**: https://ohdsi.github.io/TheBookOfOhdsi/OhdsiAnalyticsTools.html
  - Web-based tool for cohort definition, analysis design, and execution
  - Requires OHDSI WebAPI

### HADES (R Packages for Analytics)
- **Official Website**: https://ohdsi.github.io/Hades/
- **Package List**: https://ohdsi.github.io/Hades/packages.html
- **GitHub Repository**: https://github.com/OHDSI/Hades
  - Collection of R packages for large-scale analytics
  - Supports population characterization, causal effect estimation, patient-level prediction
  - Works with PostgreSQL, SQL Server, Oracle, Amazon RedShift, Google BigQuery

### Strategus (HADES Coordination)
- **Documentation**: https://ohdsi.github.io/Strategus/
- **GitHub Repository**: https://github.com/OHDSI/Strategus
  - Coordinates and executes analytics using HADES modules

### ETL Tools

#### WhiteRabbit
- **Documentation**: https://ohdsi.github.io/WhiteRabbit/
- **GitHub Repository**: https://github.com/OHDSI/WhiteRabbit
  - Scans source databases to prepare for ETL
  - Generates scan reports with table/field information
  - Supports SQL Server, Oracle, PostgreSQL, MySQL, CSV, etc.

#### Rabbit in a Hat
- **Documentation**: https://ohdsi.github.io/WhiteRabbit/RabbitInAHat.html
  - Included with WhiteRabbit
  - Visual ETL design tool using scan reports
  - Generates ETL documentation (Word, Markdown, HTML)
  - Includes unit test framework generation

### All Software Tools
- **OHDSI Software Tools Page**: https://www.ohdsi.org/software-tools/

## Community & Support

### Forums
- **OHDSI Forums**: https://forums.ohdsi.org/
  - Categories: General, Implementers, Developers, Researchers, CDM Builders, Vocabulary Users
  - Regional chapters (Korea, China, Europe)

### Community Engagement
- **Join the Journey**: https://www.ohdsi.org/join-the-journey/
- **Community Calls**: https://ohdsi.org/community-calls/
  - Weekly calls on Tuesdays at 11 AM ET
- **Workgroups**: https://www.ohdsi.org/workgroups/

### Microsoft Teams
- Main OHDSI team plus workgroup-specific channels
- CDM Working Group for model development

## Education & Training

### EHDEN Academy
- **Course Overview**: https://www.ehden.eu/academy-course-overview/
- **Academy Portal**: academy.ehden.eu
  - Free online courses
  - Foundational courses on OHDSI, CDM, and vocabularies
  - Used in ~70 countries with ~2900 enrollees

### Tutorial Materials
- **OHDSI Tutorials Page**: https://www.ohdsi.org/resources/tutorials/
- **Tutorial Workshops**: https://www.ohdsi.org/tutorial-workshops/
- **CDM Tutorial GitHub**: https://github.com/OHDSI/Tutorial-CDM
- **ETL Tutorial GitHub**: https://github.com/OHDSI/Tutorial-ETL
- **Education Overview**: https://www.ohdsi.org/education/

### Video Resources
- OHDSI YouTube channel (past tutorials, community calls, symposium presentations)

## GitHub Organization

- **OHDSI GitHub**: https://github.com/OHDSI
  - All open-source tools and repositories
  - Issue tracking and community contributions

## Additional Resources

### Sample Data
- CMS SynPUF 1k sample in CDM v5 available from LTS Computing LLC

### Third-Party Tools
- **OMOPHub**: https://omophub.com
  - REST API access to Athena vocabularies without database setup

## FHIR↔OMOP Reference Implementations (git submodules in refs/)

### Standards & Specifications

- **fhir-omop-ig** (HL7) — HL7 Official FHIR↔OMOP Implementation Guide
  - https://github.com/HL7/fhir-omop-ig (15 ★)
  - Bidirectional conversion specification between FHIR and OMOP
- **fhir2omop-cookbook** (CodeX HL7) — FHIR-to-OMOP Cookbook starter guide
  - https://github.com/CodeX-HL7-FHIR-Accelerator/fhir2omop-cookbook (4 ★)
  - Methodology, use cases, and patterns for mapping FHIR→OMOP
- **Vulcan-Fhir-to-OMOP-Mapping-Project** — Prior FHIR-OMOP mapping work
  - https://github.com/OMOP-FHIR-Terminologies-Subgroup/Vulcan-Fhir-to-OMOP-Mapping-Project (1 ★)
- **Vulcan-FHIR-to-OMOP** — FHIR-to-OMOP ETL utilities (Vulcan project)
  - https://github.com/timsbiomed/Vulcan-FHIR-to-OMOP
- **omop-fhir-terminologies-docs** — OMOP+FHIR Terminologies Subgroup documents
  - https://github.com/OMOP-FHIR-Terminologies-Subgroup/Documents (1 ★)
- **OMOPinFHIR** (Firely) — Logical models in FHIR representing the OMOP data model
  - https://github.com/FirelyTeam/OMOPinFHIR
- **ohdsi-fhir.github.io** — OHDSI FHIR Workgroup repository
  - https://github.com/ohdsi-fhir/ohdsi-fhir.github.io (3 ★)
- **fhir-reasoning-omop-ri** (HL7) — Reference implementation for OMOP→FHIR transformations (dQM focus)
  - https://github.com/HL7/fhir-reasoning-omop-ri (2 ★)
- **mcode-omop** — FHIR mCODE to OMOP Oncology CDM analysis
  - https://github.com/mcode/mcode-omop (2 ★)

### FHIR→OMOP Converters & ETL

- **FhirToCdm** (OHDSI) — .NET Core FHIR HL7→OMOP CDM converter
  - https://github.com/OHDSI/FhirToCdm (19 ★)
- **ETL-German-FHIR-Core** (OHDSI) — German MII FHIR→OMOP ETL
  - https://github.com/OHDSI/ETL-German-FHIR-Core (9 ★)
- **HealthcareLakeETL** — FHIR→OMOP using PySpark on AWS Glue
  - https://github.com/spe-uob/2020-HealthcareLakeETL (14 ★)
- **NACHC-fhir-to-omop** — Java FHIR→OMOP tools
  - https://github.com/NACHC-CAD/fhir-to-omop (12 ★)
- **fhir-to-omop-demo** — Demo converting Synthea FHIR data to OMOP
  - https://github.com/barabo/fhir-to-omop-demo (11 ★)
- **omop_etl_public** (Georgia Tech) — Generic OMOP ETL for raw datafile and FHIR ingestion
  - https://github.com/gt-health/omop_etl_public (8 ★)
- **avalon-fhir-omop** (Foxtrot) — FHIR→OMOP translation engine
  - https://github.com/foxtrotcommunications/foxtrotcommunications-avalon-public
- **fhir-x-omop** (Stoa Medical) — Bidirectional, composable FHIR R4↔OMOP CDM 5.3 mapping in code
  - https://github.com/Stoa-Medical/fhir-x-omop
- **coreason-omop-etl-fhir-bridge** — Interoperability layer for mapping FHIR→OMOP
  - https://github.com/CoReason-AI/coreason-omop-etl-fhir-bridge
- **tofhir-mappings** (SRDC) — Executable mapping definitions from OMOP/CDA to HL7 FHIR
  - https://github.com/srdc/tofhir-mappings

### OMOP on FHIR (FHIR servers backed by OMOP)

- **omoponfhir-main** — Main OMOPonFHIR project settings & orchestration
  - https://github.com/omoponfhir/omoponfhir-main (47 ★)
- **omoponfhir-main-r4-sql** — OMOP v5.3 on FHIR R4 with SQLRender
  - https://github.com/omoponfhir/omoponfhir-main-r4-sql (17 ★)
- **omoponfhir-v54-r4** — OMOP v5.4 on FHIR R4 with SQLRender
  - https://github.com/omoponfhir/omoponfhir-main-v54-r4 (11 ★)
- **omoponfhir-omopv5-r4-mapping** — OMOP v5 to FHIR R4 mapping layer
  - https://github.com/omoponfhir/omoponfhir-omopv5-r4-mapping (6 ★)
- **omoponfhir-extractor** (PheMA) — Tool for extracting OMOP data as FHIR resources
  - https://github.com/PheMA/omoponfhir-extractor (1 ★)
- **GT-FHIR** — Georgia Tech FHIR server + OMOP mapping docs (R4)
  - https://github.com/gt-health/GT-FHIR
- **GT-FHIR2** — OMOP on FHIR (Georgia Tech, updated version)
  - https://github.com/myungchoi/GT-FHIR2 (3 ★)

### OMOP→FHIR & Knowledge Graphs

- **FHIROntopOMOP** — OMOP as FHIR Knowledge Graph via Ontop
  - https://github.com/fhircat/FHIROntopOMOP (21 ★)
- **omopfhirmap** — CLI tool for ATLAS cohort↔FHIR bundle mapping
  - https://github.com/dermatologist/omopfhirmap (11 ★)
- **mends-on-fhir** — OMOP→FHIR for chronic disease surveillance
  - https://github.com/mends-on-fhir/mends-on-fhir
- **omop-vocab-on-fhir** — OMOP vocabulary→FHIR CodeSystem converter
  - https://github.com/jhu-bids/omop-vocab-on-fhir (2 ★)
- **n3c-ingest** — Convert N3C OMOP vocab tables to OWL, SemanticSQL, and FHIR
  - https://github.com/timsbiomed/n3c-ingest

### Specialized & Domain-Specific

- **recruit** (MIRACUM) — Cloud-native clinical trial recruitment using FHIR + OMOP CDM
  - https://github.com/miracum/recruit (8 ★)
- **fhirform-ohdsi** — FHIR server transforming QuestionnaireResponses to OHDSI OMOP CDM
  - https://github.com/dermatologist/fhirform-ohdsi
- **REDHotOMOP** — Bridging FHIR and OMOP CDM for observational research + EHR integration
  - https://github.com/salvolpe/REDHotOMOP (1 ★)
- **clarity-export-api** — ClarityNLP module for exporting results to OMOP, FHIR, etc.
  - https://github.com/ClarityNLP/export-api (1 ★)
- **mercurius-mcp-py** — CQL-FHIR-OMOP MCP server (Python)
  - https://github.com/StarLiu1/mercurius-mcp-py
- **kameheads-omop** — Python OMOP package with LLM queries, MCP server, and FHIR import
  - https://github.com/kameheads/omop

### Sample Data

- **omop-fhir-data** (CU-DBMI) — OMOP/FHIR test data
  - https://github.com/CU-DBMI/omop-fhir-data (5 ★)
- **healthcare-europe-sample** — Sample EHR data in FHIR, OMOP and Synthea format for European countries
  - https://github.com/science-automation/healthcare-europe-sample (2 ★)

## Key Publications

- Schuemie M, Reps J, Black A, et al. "Health-Analytics Data to Evidence Suite (HADES): Open-Source Software for Observational Research." Stud Health Technol Inform. 2024 Jan 25;310:966-970. doi: 10.3233/SHTI231108
