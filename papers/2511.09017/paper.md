# OMOP ETL Framework for Semi-Structured Health Data

- arXiv: [2511.09017v1](https://arxiv.org/abs/2511.09017v1)
- Published: 2025-11-12
- Source: `https://arxiv.org/html/2511.09017v1`

---
# OMOP ETL Framework for Semi-Structured Health Data

Jacob Desmond [](https://orcid.org/0009-0006-9755-1133 "ORCID 0009-0006-9755-1133")     Ryan Wartmann    Chng Wei Lau [](https://orcid.org/0000-0002-9652-134X "ORCID 0000-0002-9652-134X")     Steven Thomas [](https://orcid.org/0000-0002-2416-0020 "ORCID 0000-0002-2416-0020")     Paul M. Middleton [](https://orcid.org/0000-0003-0760-1098 "ORCID 0000-0003-0760-1098")     Jeewani Anupama Ginige[](https://orcid.org/0000-0002-6695-6983 "ORCID 0000-0002-6695-6983") Jacob Desmond, Chng Wei Lau and Jeewani Anupama Ginige are with School of Computer, Data and Mathematical Sciences, Western Sydney University, Penrith, NSW 2751 Australia (email: J.Desmond@westernsydney.edu.au; c.lau@westernsydney.edu.au; j.Ginige@westernsydney.edu.au). Ryan Wartmann is an independent research (e-mail: ryanwartmann1998@gmail.com). Steven Thomas and and Paul M. Middleton are with South Western Emergency Research Institute, Ingham Institute of Applied MedicalResearch, 1 Campbell St, Liverpool, 2170, NSW, Australia. (e-mail: Steven.Thomas@health.nsw.gov.au; Paul.Middleton@health.nsw.gov.au).

###### Abstract

Healthcare data are generated in many different formats, which makes it difficult to integrate and reuse across institutions and studies. Standardisation is required to enable consistent large-scale analysis. The OMOP-CDM, developed by the OHDSI community, provides one widely adopted standard.  
Our framework achieves schema-agnostic transformation by extending upon existing literature in using human-readable YAML specification to support both relational (Microsoft SQL Server (MSSQL)) and document-based (MongoDB) data sources. It also incorporates critical production readiness features: provenance-aware mapping and support for incremental updates.  
We validated the pipeline using 2.7 million patient records and 27 million encounters across six hospitals spanning two decades of records. The resulting OMOP-CDM dataset demonstrated an acceptable level of data quality with a 97% overall passing rate based on the OHDSI Data Quality Dashboard check. Our work provides a reusable blueprint for large-scale data harmonisation, directly supporting real-world medical data research.

{IEEEkeywords}

OMOP-CDM, Data Standardisation, Healthcare Data, ETL, Schema Agnostic Transformation

## 1 Introduction

\\IEEEPARstart

The Observational Medical Outcomes Partnership (OMOP) Common Data Model (OMOP-CDM) standardises healthcare data to enable consistent analysis across institutions \[OHDSIwebsite, OHDSI\_Athena, OHDSI\_DataStandardization\]. Maintained by OHDSI, it comprises  40 clinical and vocabulary tables supporting interoperability in research.

The South Western Emergency Research Institute (SWERI) is adopting OMOP-CDM to improve access to clinical data. Its two-stage project first consolidates disparate systems into the CEDRIC repository \[SWSLHD\_Fujitsu\_CEDRIC\], then maps CEDRIC to OMOP-CDM.

This paper outlines transforming CEDRIC data, covering 2.7M patients and 27M episodes from six hospitals over 20 years, into OMOP-CDM. The resulting internal NSW Health database serves as a precursor to a fully anonymised public dataset. We review related work, describe CEDRIC and OMOP structures, and present the ETL approach used to preserve source fidelity under OMOP conventions, developed without direct access to the target database. We report outcomes and lessons for similar projects.

Finally, we frame research questions on configurability, automation and scalability of OMOP-CDM conformance, and handling semi-structured document-store data while preserving hierarchy.

This paper aims to address the following research questions:

1.  1.
    
    What is the feasibility of a configurable ETL pipeline for transforming arbitrary healthcare data into the OMOP-CDM?
    
2.  2.
    
    How can such a pipeline facilitate end-to-end automation and incremental updates while supporting scalability to large datasets and balancing source data fidelity with adherence to OMOP-CDM standards?
    
3.  3.
    
    What approaches can enable an ETL pipeline to transform healthcare data from heterogeneous repositories, ranging from structured relational databases (e.g., Microsoft SQL Server (MSSQL)) to semi-structured document stores (e.g., MongoDB), into the OMOP-CDM while preserving hierarchical information and ensuring semantic and structural consistency with the relational OMOP-CDM schemas?
    

The code and accompanying documentation for this work are publicly available in our GitHub repository \[self\_repo\].

## 2 Literature Review/Background/Similar Work

### 2.1 What is OMOP?

The OMOP-CDM is a standardised schema enabling harmonisation and secondary use of heterogeneous healthcare data (e.g., EHRs, claims, registries) for large-scale, federated research \[OHDSIwebsite\]. By converting local data into a unified tabular structure with standard vocabularies (e.g., SNOMED CT, RxNorm, LOINC), it supports reproducible analyses for real-world evidence generation, including comparative effectiveness and pharmaco­vigilance studies.

OMOP-CDM comprises interrelated tables for core clinical entities: PERSON (demographics), CONDITION\_OCCURRENCE (diagnoses), DRUG\_EXPOSURE (medications), MEASUREMENT (labs), and VISIT\_OCCURRENCE (encounters), all linked via standard concept IDs. Additional tables capture procedures, observations, devices, and episode context; OBSERVATION\_PERIOD and METADATA record provenance and timing; SOURCE\_TO\_CONCEPT\_MAP supports traceability; and NOTE/NOTE\_NLP enable use of unstructured clinical text. This modular design supports scalable integration and analytic consistency across distributed research networks \[Unimelb\_HaBIC\_OMOP\_CDM\].

### 2.2 What is CEDRIC?

CEDRIC (Comprehensive Emergency Dataset for Research, Innovation and Collaboration) is a consolidated repository integrating data from NSW operational systems (Fig. [1](https://arxiv.org/html/2511.09017v1#S2.F1 "Figure 1 ‣ 2.3 Background and Similar Work ‣ 2 Literature Review/Background/Similar Work ‣ OMOP ETL Framework for Semi-Structured Health Data")). Feeds from Cerner EMR (FirstNet, admitted patients, pathology, SurgiNet), StaffLink, GE-PACS (radiology), financial/insurance systems, iPharmacy, IIMS+, SARA, and EDWARD converge into harmonised research domains such as demographics, pathology, medications, diagnoses, and clinical documents. CEDRIC stores structured data in MSSQL and document content in MongoDB, hosted within the secure health network.

### 2.3 Background and Similar Work

OMOP-CDM has become the leading standard for harmonising heterogeneous healthcare data. Numerous projects have transformed primary care, hospital EMRs, ICU, rare disease registries, and population cohorts into OMOP-CDM, enabling scalable cross-site analytics \[info:doi/10.2196/49542, info:doi/10.2196/30970, biedermann2021standardizing, 10.1093/jamiaopen/ooab001, 10.1093/jamia/ocac203, Tan2022OMOPBenefitRisk\].

Existing literature covers a large range of transformation effort:

1.  1.
    
    National-level EHR mapping - German, Norway, Estonia, and UK Biobank \[10.1093/jamiaopen/ooab001, 10.1093/jamia/ocac203, 10.1371/journal.pone.0311511, TRINH2024105602\].
    
2.  2.
    
    Rare disease registries - Rare disesase and pulmonary hypertension \[biedermann2021standardizing, 10.1093/jamiaopen/ooab001, 10.1093/jamia/ocac203, Tan2022OMOPBenefitRisk, wang2025scoping, kim2021transforming, YU2022104002, PENG2023104925, 10.1371/journal.pone.0311511, TRINH2024105602, 10.3389/fdata.2024.1435510\].
    
3.  3.
    
    Semi-structured / FHIR/ Novel data types - German FHIR data, YAML based ETL and PSG (waveform) + EHR \[kim2021transforming, PENG2023104925, UNSW\_ETL\].
    
4.  4.
    
    COVID-19 focused - 8 countries COVID-19 data, and US PCORnet \[YU2022104002\].
    
5.  5.
    
    Other domain - Primary care, Benefit Risk assessment, MIMIC IIi ICU, informatic research , oncology and mental health \[info:doi/10.2196/49542, info:doi/10.2196/30970, Tan2022OMOPBenefitRisk, wang2025scoping, 10.3389/fdata.2024.1435510, ESPINOZA2023100119\].
    

Most OMOP-CDM transformations use bespoke or semi-automated ETL pipelines, commonly leveraging OHDSI tools \[ohdsi\_tools\] alongside custom code in SQL, Python, R, Java, or ETL platforms \[info:doi/10.2196/49542, biedermann2021standardizing, 10.1093/jamiaopen/ooab001, 10.1093/jamia/ocac203, wang2025scoping, kim2021transforming, YU2022104002, PENG2023104925, 10.1371/journal.pone.0311511, TRINH2024105602, 10.3389/fdata.2024.1435510\]. However, strict standard conformance can risk data loss when source structures or vocabularies misalign; mitigation usually involves custom concepts or minor schema adaptations while preserving interoperability \[biedermann2021standardizing, 10.1093/jamia/ocac203\].

Recent work explores more reusable, declarative approaches, e.g. configuration-driven frameworks using YAML to generate SQL for clearer and maintainable mappings \[Tan2022OMOPBenefitRisk, UNSW\_ETL\]. Remaining challenges include limited mapping automation, fidelity trade-offs, infrastructure-specific pipelines, and evolving schemas.

These gaps motivate our approach, addressed through RQ[1](https://arxiv.org/html/2511.09017v1#S1.I1.i1 "item 1 ‣ 1 Introduction ‣ OMOP ETL Framework for Semi-Structured Health Data"), RQ[2](https://arxiv.org/html/2511.09017v1#S1.I1.i2 "item 2 ‣ 1 Introduction ‣ OMOP ETL Framework for Semi-Structured Health Data"), and RQ[3](https://arxiv.org/html/2511.09017v1#S1.I1.i3 "item 3 ‣ 1 Introduction ‣ OMOP ETL Framework for Semi-Structured Health Data").

![Refer to caption](figures/cedric1.png)

Figure 1: Overview of CEDRIC

## 3 Methods, Techniques and Tools

### 3.1 Overall Approach

This project was a collaboration between the South Western E-Health Research Institute (SWERI) and the School of Computer, Data and Mathematical Sciences (CDMS) at Western Sydney University, aiming to provide researchers with clinically relevant data for data-driven research.

CDMS developed a semi-automated framework to transform CEDRIC data (section [2.2](https://arxiv.org/html/2511.09017v1#S2.SS2 "2.2 What is CEDRIC? ‣ 2 Literature Review/Background/Similar Work ‣ OMOP ETL Framework for Semi-Structured Health Data")) into OMOP-CDM (section [2.1](https://arxiv.org/html/2511.09017v1#S2.SS1 "2.1 What is OMOP? ‣ 2 Literature Review/Background/Similar Work ‣ OMOP ETL Framework for Semi-Structured Health Data")), despite not having direct access to the clinical dataset. Work proceeded using CEDRIC schema information and public OMOP-CDM documentation \[OHDSI\_DataStandardization\]. Closely informed by \[UNSW\_ETL\], CDMS created YAML mappings (section [3.2.2](https://arxiv.org/html/2511.09017v1#S3.SS2.SSS2 "3.2.2 YAML Mapping files ‣ 3.2 Mapping from CEDRIC to OMOP ‣ 3 Methods, Techniques and Tools ‣ OMOP ETL Framework for Semi-Structured Health Data")) and a Python ETL framework to populate OMOP-CDM, released publicly \[self\_repo\].

The SWERI data custodians executed the transformation within the secure health network. Errors identified during the process (Fig. [2](https://arxiv.org/html/2511.09017v1#S3.F2 "Figure 2 ‣ 3.1 Overall Approach ‣ 3 Methods, Techniques and Tools ‣ OMOP ETL Framework for Semi-Structured Health Data")) were relayed back to CDMS for updates. This iterative workflow ensured data security and integrity while enabling accurate alignment with OMOP-CDM.

![Refer to caption](figures/overallProcess1.png)

Figure 2: Overall Process

### 3.2 Mapping from CEDRIC to OMOP

#### 3.2.1 Python ETL Framework

The ETL framework is implemented in Python using SQLAlchemy \[sqlalchemy\] for dynamic query generation and transaction handling. All transformations load data into MS SQL as compiled SQL statements, while MongoDB sources are accessed via aggregation pipelines.

Each ETL job is configured in a YAML file, typically one per OMOP table, following \[UNSW\_ETL\]. We extend this format to support MongoDB and structured YAML transformations. The YAML specifies source and destination tables, primary key handling, and column-level logic (section [3.2.2](https://arxiv.org/html/2511.09017v1#S3.SS2.SSS2 "3.2.2 YAML Mapping files ‣ 3.2 Mapping from CEDRIC to OMOP ‣ 3 Methods, Techniques and Tools ‣ OMOP ETL Framework for Semi-Structured Health Data")).

A central mapping table, adapted from \[UNSW\_ETL\], maintains relationships between source and OMOP primary keys for traceability (section [3.2.2](https://arxiv.org/html/2511.09017v1#S3.SS2.SSS2 "3.2.2 YAML Mapping files ‣ 3.2 Mapping from CEDRIC to OMOP ‣ 3 Methods, Techniques and Tools ‣ OMOP ETL Framework for Semi-Structured Health Data")).

For MS SQL sources, the framework compiles queries, validates table references, prepares the mapping table, inserts unmapped rows, and sequentially applies column updates. For MongoDB, data are first flattened via aggregation pipelines, staged into MS SQL, and then processed through the same mapping and insertion workflow (section [3.2.3](https://arxiv.org/html/2511.09017v1#S3.SS2.SSS3 "3.2.3 MongoDB ‣ 3.2 Mapping from CEDRIC to OMOP ‣ 3 Methods, Techniques and Tools ‣ OMOP ETL Framework for Semi-Structured Health Data")).

![Refer to caption](figures/Python_ETL_diagram.png)

Figure 3: High-level flowchart outlining key steps of the ETL process.

#### 3.2.2 YAML Mapping files

Each YAML file corresponds to a single OMOP-CDM destination table and defines the destination table name, source primary keys, and column-level mappings. These mappings are expressed as ordered transformation steps instead of raw SQL. We support five step types—Column, Constant, StaticMapping, LookupMapping, and Func—allowing minimal, composable logic (Table [1](https://arxiv.org/html/2511.09017v1#S3.T1 "Table 1 ‣ 3.2.3 MongoDB ‣ 3.2 Mapping from CEDRIC to OMOP ‣ 3 Methods, Techniques and Tools ‣ OMOP ETL Framework for Semi-Structured Health Data")). Following \[UNSW\_ETL\], a per-table mapping table preserves links between source and generated OMOP primary keys, enabling incremental ETL.

We extend the mapping table with insert/update timestamps and a processed flag to support continuous updates, change tracking, and efficient reprocessing without duplication.

Where required, source references are replaced with aliased subqueries to avoid column conflicts, support joins (including self-joins), and enable multi-row generation (e.g., unpivoting attributes into multiple observations).

Most CEDRIC data are relational, but measurement data exist as nested MongoDB documents. To handle this, the YAML specification includes a mongodb section defining projection into a flat structure for staging before ETL execution (see section [3.2.3](https://arxiv.org/html/2511.09017v1#S3.SS2.SSS3 "3.2.3 MongoDB ‣ 3.2 Mapping from CEDRIC to OMOP ‣ 3 Methods, Techniques and Tools ‣ OMOP ETL Framework for Semi-Structured Health Data")).

#### 3.2.3 MongoDB

To support ETL of the OMOP-CDM MEASUREMENT table, we developed a MongoDB extraction strategy that flattens nested documents into a relational format before loading. The flattening rules are fully defined in YAML and executed as a MongoDB aggregation pipeline, with output staged into an SQL table. Once staged, the existing ETL workflow proceeds unchanged.

Processing is performed in batches to avoid excessive in-memory buffering during document retrieval and staging. Batch control leverages the mapping table’s processed flag: only unprocessed source rows are extracted, and after each batch completes, a simple UPDATE marks those entries as processed. This allows scalable loading without modifying transformation logic, at the cost of one additional update per batch.

Flattening is configured using a YAML fields list, where each item defines:

-   •
    
    the document field path to extract (using dot notation or list index syntax)
    
-   •
    
    the staging column name
    
-   •
    
    the SQL data type
    

Nested lists are handled by recursively defining additional fields blocks, allowing a single document to yield multiple rows. From this specification, the framework generates an aggregation pipeline that:

-   •
    
    uses $unwind to expand arrays
    
-   •
    
    applies $unionWith to merge heterogeneous list paths
    
-   •
    
    uses $project to enforce a consistent tabular schema
    

Missing attributes are represented as explicit nulls, enabling unified interpretation downstream. The mongodb YAML object is further described in Appendix [8](https://arxiv.org/html/2511.09017v1#S8 "8 YAML Object Definitions ‣ OMOP ETL Framework for Semi-Structured Health Data") Table LABEL:tab:mongo\_yaml. An example of the flattening process can be seen in Figures [4](https://arxiv.org/html/2511.09017v1#S3.F4 "Figure 4 ‣ 3.2.3 MongoDB ‣ 3.2 Mapping from CEDRIC to OMOP ‣ 3 Methods, Techniques and Tools ‣ OMOP ETL Framework for Semi-Structured Health Data"), [5](https://arxiv.org/html/2511.09017v1#S3.F5 "Figure 5 ‣ 3.2.3 MongoDB ‣ 3.2 Mapping from CEDRIC to OMOP ‣ 3 Methods, Techniques and Tools ‣ OMOP ETL Framework for Semi-Structured Health Data") and [6](https://arxiv.org/html/2511.09017v1#S9.F6 "Figure 6 ‣ 9 MongoDB Aggregation Pipeline ‣ OMOP ETL Framework for Semi-Structured Health Data"), and Table [2](https://arxiv.org/html/2511.09017v1#S3.T2 "Table 2 ‣ 3.2.3 MongoDB ‣ 3.2 Mapping from CEDRIC to OMOP ‣ 3 Methods, Techniques and Tools ‣ OMOP ETL Framework for Semi-Structured Health Data").

Document and row-level filters can also be expressed directly in YAML as embedded MQL $match objects, enabling pre and post-flattening restriction of measurement data. This ensures selective extraction of clinically relevant observations while maintaining a declarative, configuration-driven ETL process.

Table 1: Types of simple transformation steps used in YAML mappings

Type

T-SQL Equivalent

Example Definition

Column

SELECT col FROM table

[⬇](data:text/plain;base64,LSB0eXBlOiBDb2x1bW4KICB0YWJsZV9uYW1lOiB8CiAgICBkYi5kYm8uUGF0aWVudAogIGNvbHVtbl9uYW1lOiBHZW5kZXI=) \- type: Column table\_name: | db.dbo.Patient column\_name: Gender

Constant

A constant literal.

[⬇](data:text/plain;base64,LSB0eXBlOiBDb25zdGFudAogIHZhbHVlOiAwCiAgdHlwZV9zdHI6IElOVA==) \- type: Constant value: 0 type\_str: INT

StaticMapping

CASE

[⬇](data:text/plain;base64,LSB0eXBlOiBTdGF0aWNNYXBwaW5nCiAgbWFwOgogICAgTWFsZTogTUFMRQogICAgRmVtYWxlOiBGRU1BTEUKICAgIEluZGV0ZXJtaW5hdGU6IHwKICAgICAgQU1CSUdVT1VTCiAgZWxzZTogVU5LTk9XTg==) \- type: StaticMapping map: Male: MALE Female: FEMALE Indeterminate: | AMBIGUOUS else: UNKNOWN

LookupMapping

INNER JOIN

[⬇](data:text/plain;base64,LSB0eXBlOiBMb29rdXBNYXBwaW5nCiAgdGFibGVfbmFtZTogfAogICAgT01PUC5kYm8uQ09OQ0VQVAogIG1hcHRvOiBjb25jZXB0X2NvZGUKICByZXRuOiBjb25jZXB0X2lkCiAgd2hlcmU6IHwKICAgIE9NT1AuZGJvLkNPTkNFUFQKICAgICAgLmRvbWFpbl9pZAogICAgICAgID0gJ0dlbmRlcic=) \- type: LookupMapping table\_name: | OMOP.dbo.CONCEPT mapto: concept\_code retn: concept\_id where: | OMOP.dbo.CONCEPT .domain\_id \= ’Gender’

Func

SQL Function execution.

[⬇](data:text/plain;base64,LSB0eXBlOiBGdW5jCiAgbmFtZTogZXh0cmFjdAogIGFyZ3M6CiAgICAtIHllYXIKICAgIC0gXHZhbHVlXA==) \- type: Func name: extract args: \- year \- \\value\\

[⬇](data:text/plain;base64,WwogIHsKICAgICJ2aXNpdF9pZCI6IDEyMzQ1NiwKICAgICJtZWFzdXJlcyI6IFsKICAgICAgeyAibmFtZSI6ICJzeXN0b2xpY19icCIgfSwKICAgICAgeyAibmFtZSI6ICJkaWFzdG9saWNfYnAiIH0KICAgIF0sCiAgICAicGFuZWxzIjogWwogICAgICB7CiAgICAgICAgIm5hbWUiOiAiZmx1aWRfaW50YWtlIiwKICAgICAgICAibWVhc3VyZXMiOiBbCiAgICAgICAgICB7ICJuYW1lIjogIjI0aHIiIH0sCiAgICAgICAgICB7ICJuYW1lIjogIjI0aHJfb3JhbCIgfQogICAgICAgIF0KICAgICAgfSwKICAgICAgewogICAgICAgICJuYW1lIjogImFzdGhtYV90cmFja2luZyIsCiAgICAgICAgIm1lYXN1cmVzIjogWwogICAgICAgICAgeyAibmFtZSI6ICJzcGVsbHNfcGVyX3dlZWsiIH0sCiAgICAgICAgICB7ICJuYW1lIjogIm1heF9leHBpcl9mbG93IiB9CiAgICAgICAgXQogICAgICB9CiAgICBdCiAgfSwKCiAgewogICAgInZpc2l0X2lkIjogNjU0MzIxLAogICAgIm1lYXN1cmVzIjogWwogICAgICB7ICJuYW1lIjogInN5c3RvbGljX2JwIiB9LAogICAgICB7ICJuYW1lIjogImRpYXN0b2xpY19icCIgfQogICAgXSwKICAgICJwYW5lbHMiOiBbCiAgICAgIHsKICAgICAgICAibmFtZSI6ICJmbHVpZF9pbnRha2UiLAogICAgICAgICJtZWFzdXJlcyI6IFsKICAgICAgICAgIHsgIm5hbWUiOiAiMjRociIgfSwKICAgICAgICAgIHsgIm5hbWUiOiAiMjRocl9vcmFsIiB9CiAgICAgICAgXQogICAgICB9CiAgICBdCiAgfQpd)

\[

{

"visit\_id": 123456,

"measures": \[

{ "name": "systolic\_bp" },

{ "name": "diastolic\_bp" }

\],

"panels": \[

{

"name": "fluid\_intake",

"measures": \[

{ "name": "24hr" },

{ "name": "24hr\_oral" }

\]

},

{

"name": "asthma\_tracking",

"measures": \[

{ "name": "spells\_per\_week" },

{ "name": "max\_expir\_flow" }

\]

}

\]

},

{

"visit\_id": 654321,

"measures": \[

{ "name": "systolic\_bp" },

{ "name": "diastolic\_bp" }

\],

"panels": \[

{

"name": "fluid\_intake",

"measures": \[

{ "name": "24hr" },

{ "name": "24hr\_oral" }

\]

}

\]

}

\]

Figure 4: An example of MongoDB documents which contain nested data to be flattened.

[⬇](data:text/plain;base64,bW9uZ29kYjoKICBzb3VyY2U6CiAgICBkYXRhYmFzZTogcmVjb3JkcwogICAgY29sbGVjdGlvbjogbWVhc3VyZXMKICBzdGFnaW5nX3RhYmxlOiBPTU9QLlNUQUdJTkcuTUVBU1VSRVMKICBmaWVsZHM6CiAgICAtIGRvY19rZXlfcGF0aDogdmlzaXRfaWQKICAgICAgc3RhZ2luZ19jb2x1bW46IHZpc2l0X2lkCiAgICAgIGRhdGF0eXBlOiBCSUdJTlQKCiAgICAtIGRvY19rZXlfcGF0aDogbWVhc3VyZXMKICAgICAgZmllbGRzOgogICAgICAgIC0gZG9jX2tleV9wYXRoOiBuYW1lCiAgICAgICAgICBzdGFnaW5nX2NvbHVtbjogbWVhc3VyZV9uYW1lCiAgICAgICAgICBkYXRhdHlwZTogVkFSQ0hBUgoKICAgIC0gZG9jX2tleV9wYXRoOiBwYW5lbHMKICAgICAgZmllbGRzOgogICAgICAgIC0gZG9jX2tleV9wYXRoOiBuYW1lCiAgICAgICAgICBzdGFnaW5nX2NvbHVtbjogcGFuZWxfbmFtZQogICAgICAgICAgZGF0YXR5cGU6IFZBUkNIQVIKCiAgICAgICAgLSBkb2Nfa2V5X3BhdGg6IG1lYXN1cmVzCiAgICAgICAgICBmaWVsZHM6CiAgICAgICAgICAgIC0gZG9jX2tleV9wYXRoOiBuYW1lCiAgICAgICAgICAgICAgc3RhZ2luZ19jb2x1bW46IHBhbmVsX21lYXN1cmVfbmFtZQogICAgICAgICAgICAgIGRhdGF0eXBlOiBWQVJDSEFS)

mongodb:

source:

database: records

collection: measures

staging\_table: OMOP.STAGING.MEASURES

fields:

\- doc\_key\_path: visit\_id

staging\_column: visit\_id

datatype: BIGINT

\- doc\_key\_path: measures

fields:

\- doc\_key\_path: name

staging\_column: measure\_name

datatype: VARCHAR

\- doc\_key\_path: panels

fields:

\- doc\_key\_path: name

staging\_column: panel\_name

datatype: VARCHAR

\- doc\_key\_path: measures

fields:

\- doc\_key\_path: name

staging\_column: panel\_measure\_name

datatype: VARCHAR

Figure 5: An example of the mongodb YAML object, specifying nested fields to be flattened in the example data shown in Fig. [4](https://arxiv.org/html/2511.09017v1#S3.F4 "Figure 4 ‣ 3.2.3 MongoDB ‣ 3.2 Mapping from CEDRIC to OMOP ‣ 3 Methods, Techniques and Tools ‣ OMOP ETL Framework for Semi-Structured Health Data")

Table 2: Example Aggregation Pipeline Results

visit\_id

measure\_name

panel\_name

panel\_measure\_name

123456

systolic\_bp

NULL

NULL

123456

diastolic\_bp

NULL

NULL

654321

systolic\_bp

NULL

NULL

654321

diastolic\_bp

NULL

NULL

123456

NULL

fluid\_intake

24hr

123456

NULL

fluid\_intake

24hr\_oral

123456

NULL

asthma\_tracking

spells\_per\_week

123456

NULL

asthma\_tracking

max\_expir\_flow

654321

NULL

fluid\_intake

24hr

654321

NULL

fluid\_intake

24hr\_oral

This table shows the flattened, row-like results given by running the example aggregation pipeline shown in Fig. [6](https://arxiv.org/html/2511.09017v1#S9.F6 "Figure 6 ‣ 9 MongoDB Aggregation Pipeline ‣ OMOP ETL Framework for Semi-Structured Health Data") on the example data shown in Fig. [4](https://arxiv.org/html/2511.09017v1#S3.F4 "Figure 4 ‣ 3.2.3 MongoDB ‣ 3.2 Mapping from CEDRIC to OMOP ‣ 3 Methods, Techniques and Tools ‣ OMOP ETL Framework for Semi-Structured Health Data").

#### 3.2.4 Adhering to OMOP-CDM standards

We prioritised data fidelity when aligning CEDRIC with OMOP-CDM, while conforming to standards wherever feasible. CEDRIC includes Australian-specific vocabularies, ACHI, ICD10-AM, and SNOMED CT-AU, which are not yet part of the standard OMOP-CDM concept set. National efforts are underway to integrate ACHI and ICD10-AM into OMOP vocabularies, after which full harmonisation of this dataset will be possible. In the interim, we incorporated these codes as custom concepts by loading CSV extracts into the CONCEPT table, assigning concept\_ids above two billion to avoid conflicts with standardised vocabularies \[carlson2024whowantstobea2billionaire\].

Differences in nullability rules also required design decisions. OMOP-CDM enforces many NOT NULL fields, whereas CEDRIC permits missing values broadly. We considered a YAML-based approach using a non\_nullable\_cols list to insert default values during loading, but ultimately modified the OMOP-CDM DDL to allow nulls in any non–primary key column. This ensured all source information could be retained—even where attributes were incomplete—reflecting our overall design goal of prioritising data completeness and source fidelity as part of an exploratory step towards a future anonymised and fully standardised dataset.

Table [3](https://arxiv.org/html/2511.09017v1#S3.T3 "Table 3 ‣ 3.2.4 Adhering to OMOP-CDM standards ‣ 3.2 Mapping from CEDRIC to OMOP ‣ 3 Methods, Techniques and Tools ‣ OMOP ETL Framework for Semi-Structured Health Data") summarises the major OMOP-CDM domains used and the corresponding CEDRIC vocabularies, ranging from nationally standardised terminologies to locally defined value sets.

Table 3: Source Vocabularies for OMOP-CDM Concept Domains

OMOP Domain

Vocabulary

Visit

Local concept sets

Condition

ICD10AM

Procedure

ACHI

Observation

Local concept sets

Measurement

Local concept sets

Note

Local concept sets

## 4 Results

### 4.1 Data Quality Assessment Using Data Quality Dashboard

To verify data integrity and examine OMOP-CDM conformance, we ran the OHDSI Data Quality Dashboard (DQD) on the transformed dataset. Table [4](https://arxiv.org/html/2511.09017v1#S4.T4 "Table 4 ‣ 4.1 Data Quality Assessment Using Data Quality Dashboard ‣ 4 Results ‣ OMOP ETL Framework for Semi-Structured Health Data") shows an overall 97% pass rate. Remaining failures reflect known characteristics and design choices:

-   •
    
    Plausibility: Historical records predating 1950 trigger expected failures.
    
-   •
    
    Conformance: Limited relaxations of NOT NULL constraints were applied to preserve source nullability, supporting our goal of prioritising data completeness.
    
-   •
    
    Completeness: Some source values could not yet be mapped to standard OMOP concepts, consistent with an exploratory step toward a future anonymised and fully standardised dataset.
    

Table 4: Data Quality Dashboard Results Overview

Verification

Validation

Total

Pass

Fail

Pass

Pass

Fail

Pass

Pass

Fail

Pass

Plausibility

475

47

91%

291

0

100%

766

47

94%

Conformance

898

1

100%

128

13

91%

1026

14

99%

Completeness

434

18

96%

16

1

94%

450

19

96%

Total

1807

66

96%

435

14

97%

2242

80

97%

### 4.2 Volume and Performance Metrics

The ETL process successfully loaded a substantial portion of CEDRIC into OMOP-CDM. To evaluate pipeline efficiency, we collected metrics including:

-   •
    
    Rows inserted per table: Core tables (e.g., person, observation, condition\_occurrence) were populated according to the original CEDRIC distributions.
    
-   •
    
    Mapping table construction time: Includes building internal lookup tables and applying YAML-defined concept mappings.
    
-   •
    
    Data insertion time: Time to transform and load source records into OMOP-CDM tables.
    
-   •
    
    Total processing time per table: Aggregated per-table ETL duration to inform potential optimisations.
    

Table [5](https://arxiv.org/html/2511.09017v1#S4.T5 "Table 5 ‣ 4.2 Volume and Performance Metrics ‣ 4 Results ‣ OMOP ETL Framework for Semi-Structured Health Data") summarises row counts and timing metrics across primary OMOP-CDM tables. Results indicate that the ETL framework efficiently handles datasets of varying size and complexity without modification to the core engine.

Table 5: ETL Performance Metrics for OMOP-CDM Tables

OMOP-CDM Table

Num Rows

Num Update Cols

Mapping Insert Time (ms)

Total Time (ms)

CARE\_SITE

8,030

2

32

254

PROVIDER

288

1

14

126

LOCATION

2,759,586

8

35,875

274,299 (4.6 min)

PERSON

2,782,378

11

15,304

564,560 (9.4 min)

VISIT\_OCCURRENCE

27,250,260

12

79,286 (1.3 min)

4,682,856 (1.3 hrs)

VISIT\_DETAIL

65,550,939

11 (22)\*

732,529 (12.2 min)

18,743,517 (5.2 hrs)

CONDITION\_OCCURRENCE

20,819,579

11

63,056 (1.1 min)

2,523,176 (42 min)

PROCEDURE\_OCCURRENCE

6,821,962

9

15,400

659,267 (11 min)

NOTE

96,796,791

11

2,078,671 (34.6 min)

41,215,966 (11.4 hrs)

OBSERVATION

8,110,299

8

303,528 (5.1 min)

1,415,341 (23.6 min)

MEASUREM-ENT

54,508,593

8

∼\\mathtt{\\sim}3×108 (3.5 days)

\*The VISIT\_DETAIL ETL consisted of loads from two separate tables, both applying updates to the same 11 columns

## 5 Findings

We developed an end-to-end ETL pipeline to transform heterogeneous health data into OMOP-CDM. Starting with the PERSON table, nine destination columns were mapped from a CEDRIC patient view, and the ETL was validated iteratively on subsets from 100 to 25 million rows to assess scalability. Duplicate patients were resolved via a de-duplicated SELECT DISTINCT view. The mapping table captured CEDRIC-to-OMOP primary key relationships and was reused to maintain consistent foreign keys in VISIT\_OCCURRENCE, enforcing table execution order.

For the MEASUREMENT table, MongoDB sources were flattened into a staging table using YAML-defined rules and MongoDB aggregation pipelines. Batched processing leveraged the mapping table’s boolean processed flag, avoiding memory-intensive transformations in Python. Subsequent ETL steps proceeded on the staged data without modifying the YAML or ETL code.

Other tables—including VISIT\_OCCURRENCE, PROCEDURE\_OCCURRENCE, CONDITION\_OCCURRENCE, MEASUREMENT, LOCATION, PROVIDER, CARE\_SITE, and NOTE—were processed sequentially. PROVIDER records were simplified to role/specialty-based entries. After populating CARE\_SITE and PROVIDER, prior tables were updated with foreign keys (care\_site\_id, provider\_id) by re-running the ETL with processed = 0. NOTE entries store HTTPS links to the SWSLHD document system rather than text, offloading storage and access control to existing infrastructure.

## 6 Discussion and Limitations

### 6.1 Discussion

This study evaluated the feasibility and effectiveness of a configurable ETL framework for transforming healthcare datasets into OMOP-CDM, addressing three key research questions on feasibility, automation and scalability, and development constraints without direct data access. Our results show that these challenges can be met using a flexible, schema-driven ETL process.

#### 6.1.1 Feasibility of a configurable ETL pipeline (RQ1)

We confirmed feasibility by successfully transforming the CEDRIC dataset using a Python-based, configurable ETL framework. All source-specific logic is externalized in human-readable YAML files, which define schema mappings, value transformations, and OMOP-target logic. This approach allows the same ETL engine to be applied to diverse healthcare datasets with minimal changes, demonstrating portability, reuse, and the ability to abstract transformations away from hardcoded scripts.

#### 6.1.2 End-to-end automation, incremental updates, and scalability (RQ2)

Our ETL framework provides a semi-automated pipeline to transform source T-SQL and MongoDB data into a compliant OMOP-CDM instance. While we modified the OMOP-CDM DDL for specific source requirements, the framework also supports standard OMOP-CDM setups. It allows re-execution without resetting the target database, enabling incremental updates and continuous integration, which is crucial for evolving healthcare datasets. YAML-based configuration ensures fine-grained control over mappings and transformations, balancing source data fidelity with OMOP-CDM standardisation.

#### 6.1.3 Semi-structured data integration from MongoDB (RQ3)

We addressed the challenge of converting hierarchical, document-based data into the relational OMOP-CDM by extending the ETL to flatten nested MongoDB documents. YAML-defined rules guided the unwinding of nested structures into SQL staging tables, temporarily storing rows while preserving keys linking sub-documents to parent records. This approach maintained hierarchical traceability within the relational schema.

### 6.2 Limitations

While the ETL approach met its primary goals, several limitations suggest opportunities for improvement.

First, requiring source and destination databases on the same server simplifies orchestration with SQLAlchemy ORM but limits portability. Future work could explore cross-instance deployments.

Second, mapping local codes to standard vocabularies remains manual, especially for pathology and document types with limited coverage. Semi-automated mapping, community-shared vocabularies, and expanded standards could reduce reliance on non-standard concepts and enhance semantic interoperability.

Third, large MongoDB collections created throughput bottlenecks. Batching and staging mitigated this, but further gains could come from query optimization, indexing, selective extraction, and incremental loading.

Finally, YAML-based configuration supports transparency and reuse, but complex transformations sometimes required embedded SQL via aliased subqueries, highlighting a trade-off between declarative simplicity and SQL expressiveness.

These constraints outline a roadmap for improvement: enhanced connectivity, vocabulary harmonization, and optimized document-store processing can further improve scalability, interoperability, and maintainability.

## 7 Conclusion

We present a validated, configurable, and scalable ETL framework for transforming heterogeneous health data into OMOP-CDM. By extending YAML-based schema mapping to support MongoDB document stores, the pipeline balances source data fidelity with OMOP-CDM conformance.

The framework offers three main contributions: (1) a schema-agnostic design separating mapping logic from code to enhance reusability; (2) an end-to-end semi-automated pipeline supporting incremental updates in dynamic clinical environments; and (3) a strategy for flattening semi-structured data into relational tables while preserving hierarchical information. Together, these address key barriers to scaling OMOP-CDM adoption.

This work provides a blueprint for large-scale OMOP-CDM implementation, with future efforts focused on automating concept alignment and optimizing performance for massive document collections in distributed infrastructures.

\\appendices

## 8 YAML Object Definitions

Table 6: The mongodb YAML object

Type

Description

MQL Equivalent

Example Definition

Fields comprising the mongodb YAML object

source

The MongoDB collection.

N/A

[⬇](data:text/plain;base64,c291cmNlOgpkYXRhYmFzZTogY2VkcmljCmNvbGxlY3Rpb246IHwKICBvYnNlcnZhdGlvbnM=) source: database: cedric collection: | observations

staging\_table

The fully qualified name of the staging table.

N/A

[⬇](data:text/plain;base64,c3RhZ2luZ190YWJsZTogfAogIE9NT1AuZGJvLk9CU0VSVkFUSU9OX0RPQ1VNRU5U) staging\_table: | OMOP.dbo.OBSERVATION\_DOCUMENT

document\_match

An MQL predicate object, structured as a YAML object to be applied as a filter before flattening.

$match

[⬇](data:text/plain;base64,ZG9jdW1lbnRfbWF0Y2g6CiAgLSBkb2N1bWVudF9zdGF0dXMuZm9ybV9kYXRlX3RpbWU6CiAgICAgICRndGU6IDIwMjQtMDEtMDFUMDA6MDA6MDBaCiAgLSBmb3JtX25hbWU6CiAgICAgICRpbjoKICAgICAgICAtICJWaXRhbCBTaWducyAmIE9ic2VydmF0aW9ucyIKICAgICAgICAtICJGdWxsIEJsb29kIENvdW50Ig==) document\_match: \- document\_status.form\_date\_time: $gte: 2024-01-01T00:00:00Z \- form\_name: $in: \- "Vital Signs & Observations" \- "Full Blood Count"

row\_match

An MQL predicate object, structured as a YAML object to be applied as a filter after flattening.

$match

[⬇](data:text/plain;base64,cm93X21hdGNoOgogIGV2ZW50X25hbWU6CiAgICAkaW46CiAgICAgIC0gIlB1bHNlIFJhdGUiCiAgICAgIC0gIk94eWdlbiBEZWxpdmVyeSIKICAgICAgLSAiU3lzdG9saWMgQlAi) row\_match: event\_name: $in: \- "Pulse Rate" \- "Oxygen Delivery" \- "Systolic BP"

fields

A list of document fields to be included as columns in the staging table. The contents can be specified with arbitrarily nested self-similar fields objects, to be unwound into the flattened rows.

$unwind, $unionWith, $project

[⬇](data:text/plain;base64,ZmllbGRzOgogIC0gZG9jX2tleV9wYXRoOiBlbmNvdW50ZXJfaWQKICAgIHN0YWdpbmdfY29sdW1uOiBlbmNvdW50ZXJfaWQKICAgIGRhdGF0eXBlOiBJTlRFR0VSCgogIC0gZG9jX2tleV9wYXRoOiBvYnMKICAgIGZpZWxkczoKICAgICAgLSBkb2Nfa2V5X3BhdGg6IGV2ZW50X25hbWUKICAgICAgICBzdGFnaW5nX2NvbHVtbjogZXZlbnRfbmFtZQogICAgICAgIGRhdGF0eXBlOiBWQVJDSEFS) fields: \- doc\_key\_path: encounter\_id staging\_column: encounter\_id datatype: INTEGER \- doc\_key\_path: obs fields: \- doc\_key\_path: event\_name staging\_column: event\_name datatype: VARCHAR

Fields comprising the fields object within the mongodb YAML object

doc\_key\_path

The key within the MongoDB document, using a combination of dot notation for fields and index notation for array elements.

A field key, $getField, $arrayElemAt

[⬇](data:text/plain;base64,ZG9jX2tleV9wYXRoOiB8CiAgdXBkYXRlX2hpc3RvcnlbMF0uYWN0aXZpdHlfZGF0ZV90aW1l) doc\_key\_path: | update\_history\[0\].activity\_date\_time

staging\_column

The name of the corresponding column in the staging table.

N/A

[⬇](data:text/plain;base64,c3RhZ2luZ19jb2x1bW46IGFjdGl2aXR5X2RhdGVfdGltZQ==) staging\_column: activity\_date\_time

datatype

The SQL datatype of the corresponding staging column.

N/A

[⬇](data:text/plain;base64,ZGF0YXR5cGU6IElOVEVHRVI=) datatype: INTEGER

fields

A self-similar fields object capable of arbitrary nesting.

N/A

[⬇](data:text/plain;base64,ZmllbGRzOgogIC0gZG9jX2tleV9wYXRoOiBjbGluaWNhbF9ldmVudF9pZAogICAgc3RhZ2luZ19jb2x1bW46IGV2ZW50X2lkCiAgICBkYXRhdHlwZTogSU5URUdFUgoKICAtIGRvY19rZXlfcGF0aDogbWVhc3VyZW1lbnRzCiAgICBmaWVsZHM6CiAgICAgIC0gZG9jX2tleV9wYXRoOiBjbGluaWNhbF9ldmVudF9pZAogICAgICAgIHN0YWdpbmdfY29sdW1uOiBldmVudF9pZAogICAgICAgIGRhdGF0eXBlOiBJTlRFR0VS) fields: \- doc\_key\_path: clinical\_event\_id staging\_column: event\_id datatype: INTEGER \- doc\_key\_path: measurements fields: \- doc\_key\_path: clinical\_event\_id staging\_column: event\_id datatype: INTEGER

## 9 MongoDB Aggregation Pipeline

[⬇](data:text/plain;base64,WwogICAgeyR1bndpbmQ6IHtwYXRoOiAiJG1lYXN1cmVzIn19LAogICAgewogICAgICAgICRwcm9qZWN0OiB7CiAgICAgICAgICAgIG1lYXN1cmVfbmFtZTogeyRpZk51bGw6IFsiJG1lYXN1cmVzLm5hbWUiLCBudWxsXX0KICAgICAgICB9CiAgICB9LAogICAgewogICAgICAgICR1bmlvbldpdGg6IHsKICAgICAgICAgICAgY29sbDogIm1lYXN1cmVzIiwKICAgICAgICAgICAgcGlwZWxpbmU6IFsKICAgICAgICAgICAgICAgIHskdW53aW5kOiB7cGF0aDogIiRwYW5lbHMifX0sCiAgICAgICAgICAgICAgICB7JHVud2luZDoge3BhdGg6ICIkcGFuZWxzLm1lYXN1cmVzIn19LAogICAgICAgICAgICAgICAgewogICAgICAgICAgICAgICAgICAgICRwcm9qZWN0OiB7CiAgICAgICAgICAgICAgICAgICAgICAgIHBhbmVsX21lYXN1cmVfbmFtZTogewogICAgICAgICAgICAgICAgICAgICAgICAgICAgJGlmTnVsbDogWwogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICIkcGFuZWxzLm1lYXN1cmVzLm5hbWUiLAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG51bGwsCiAgICAgICAgICAgICAgICAgICAgICAgICAgICBdCiAgICAgICAgICAgICAgICAgICAgICAgIH0sCiAgICAgICAgICAgICAgICAgICAgICAgIHBhbmVsX25hbWU6IHsKICAgICAgICAgICAgICAgICAgICAgICAgICAgICRpZk51bGw6IFsiJHBhbmVscy5uYW1lIiwgbnVsbF0KICAgICAgICAgICAgICAgICAgICAgICAgfSwKICAgICAgICAgICAgICAgICAgICB9CiAgICAgICAgICAgICAgICB9LAogICAgICAgICAgICBdLAogICAgICAgIH0KICAgIH0sCiAgICB7CiAgICAgICAgJGxvb2t1cDogewogICAgICAgICAgICBmcm9tOiAibWVhc3VyZXMiLAogICAgICAgICAgICBsb2NhbEZpZWxkOiAiX2lkIiwKICAgICAgICAgICAgZm9yZWlnbkZpZWxkOiAiX2lkIiwKICAgICAgICAgICAgYXM6ICJyb290IiwKICAgICAgICB9CiAgICB9LAogICAgewogICAgICAgICRwcm9qZWN0OiB7CiAgICAgICAgICAgIHBhbmVsX25hbWU6IHskaWZOdWxsOiBbIiRwYW5lbF9uYW1lIiwgbnVsbF19LAogICAgICAgICAgICBwYW5lbF9tZWFzdXJlX25hbWU6IHsKICAgICAgICAgICAgICAgICRpZk51bGw6IFsiJHBhbmVsX21lYXN1cmVfbmFtZSIsIG51bGxdCiAgICAgICAgICAgIH0sCiAgICAgICAgICAgIHZpc2l0X2lkOiB7CiAgICAgICAgICAgICAgICAkaWZOdWxsOiBbCiAgICAgICAgICAgICAgICAgICAgewogICAgICAgICAgICAgICAgICAgICAgICAkZ2V0RmllbGQ6IHsKICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZpZWxkOiAidmlzaXRfaWQiLAogICAgICAgICAgICAgICAgICAgICAgICAgICAgaW5wdXQ6IHskYXJyYXlFbGVtQXQ6IFsiJHJvb3QiLCAwXX0sCiAgICAgICAgICAgICAgICAgICAgICAgIH0KICAgICAgICAgICAgICAgICAgICB9LAogICAgICAgICAgICAgICAgICAgIG51bGwsCiAgICAgICAgICAgICAgICBdCiAgICAgICAgICAgIH0sCiAgICAgICAgICAgIG1lYXN1cmVfbmFtZTogeyRpZk51bGw6IFsiJG1lYXN1cmVfbmFtZSIsIG51bGxdfSwKICAgICAgICB9CiAgICB9LApd)

\[

{$unwind: {path: "$measures"}},

{

$project: {

measure\_name: {$ifNull: \["$measures.name", null\]}

}

},

{

$unionWith: {

coll: "measures",

pipeline: \[

{$unwind: {path: "$panels"}},

{$unwind: {path: "$panels.measures"}},

{

$project: {

panel\_measure\_name: {

$ifNull: \[

"$panels.measures.name",

null,

\]

},

panel\_name: {

$ifNull: \["$panels.name", null\]

},

}

},

\],

}

},

{

$lookup: {

from: "measures",

localField: "\_id",

foreignField: "\_id",

as: "root",

}

},

{

$project: {

panel\_name: {$ifNull: \["$panel\_name", null\]},

panel\_measure\_name: {

$ifNull: \["$panel\_measure\_name", null\]

},

visit\_id: {

$ifNull: \[

{

$getField: {

field: "visit\_id",

input: {$arrayElemAt: \["$root", 0\]},

}

},

null,

\]

},

measure\_name: {$ifNull: \["$measure\_name", null\]},

}

},

\]

Figure 6: MQL Aggregation Pipeline generated from the example YAML in Fig. [5](https://arxiv.org/html/2511.09017v1#S3.F5 "Figure 5 ‣ 3.2.3 MongoDB ‣ 3.2 Mapping from CEDRIC to OMOP ‣ 3 Methods, Techniques and Tools ‣ OMOP ETL Framework for Semi-Structured Health Data")

## Acknowledgment

The authors acknowledge that generative AI tools were used to assist in editing of the manuscript. All substantive technical decisions and writing were made by the authors.

## References
