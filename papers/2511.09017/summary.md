# OMOP ETL Framework for Semi-Structured Health Data

- arXiv ID: `2511.09017`
- URL: https://arxiv.org/abs/2511.09017v1
- Authors: Jacob Desmond, Ryan Wartmann, Chng Wei Lau, Steven Thomas, Paul M. Middleton, Jeewani Anupama Ginige
- Published: 2025-11-12T06:12:54Z
- Updated: 2025-11-12T06:12:54Z
- Categories: q-bio.QM

## Abstract

Healthcare data are generated in many different formats, which makes it difficult to integrate and reuse across institutions and studies. Standardisation is required to enable consistent large-scale analysis. The OMOP-CDM, developed by the OHDSI community, provides one widely adopted standard. Our framework achieves schema-agnostic transformation by extending upon existing literature in using human-readable YAML specification to support both relational (Microsoft SQL Server (MSSQL)) and document-based (MongoDB) data sources. It also incorporates critical production readiness features: provenance-aware mapping and support for incremental updates. We validated the pipeline using 2.7 million patient records and 27 million encounters across six hospitals spanning two decades of records. The resulting OMOP-CDM dataset demonstrated an acceptable level of data quality with a 97% overall passing rate based on the OHDSI Data Quality Dashboard check. Our work provides a reusable blueprint for large-scale data harmonisation, directly supporting real-world medical data research.
