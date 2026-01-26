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

## Key Publications

- Schuemie M, Reps J, Black A, et al. "Health-Analytics Data to Evidence Suite (HADES): Open-Source Software for Observational Research." Stud Health Technol Inform. 2024 Jan 25;310:966-970. doi: 10.3233/SHTI231108
