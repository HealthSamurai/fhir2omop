# The CRITICAL Records Integrated Standardization Pipeline (CRISP): End-to-End Processing of Large-scale Multi-institutional OMOP CDM Data

- arXiv: [2509.08247v1](https://arxiv.org/abs/2509.08247v2)
- Published: 2025-09-10
- Source: `https://arxiv.org/html/2509.08247v1`

---
# The CRITICAL Records Integrated Standardization Pipeline (CRISP): End-to-End Processing of Large-scale Multi-institutional OMOP CDM Data

\\NameXiaolong Luo \\Emailxiaolongluo@fas.harvard.edu  
\\addrSchool of Engineering and Applied Sciences    Harvard University    Cambridge    MA 02138    USA    \\NameMichael Lingzhi Li \\Emailmili@hbs.edu  
\\addrHarvard Business School    Harvard University    Boston    MA 02163    USA

###### Abstract

While existing critical care EHR datasets such as MIMIC and eICU have enabled significant advances in clinical AI research, the CRITICAL dataset opens new frontiers by providing extensive scale and diversity—containing 1.95 billion records from 371,365 patients across four geographically diverse CTSA institutions. CRITICAL’s unique strength lies in capturing full-spectrum patient journeys, including pre-ICU, ICU, and post-ICU encounters across both inpatient and outpatient settings. This multi-institutional, longitudinal perspective creates transformative opportunities for developing generalizable predictive models and advancing health equity research. However, the richness of this multi-site resource introduces substantial complexity in data harmonization, with heterogeneous collection practices and diverse vocabulary usage patterns requiring sophisticated preprocessing approaches.

We present CRISP (CRITICAL Records Integrated Standardization Pipeline) to unlock the full potential of this valuable resource. CRISP systematically transforms raw Observational Medical Outcomes Partnership Common Data Model data into ML-ready datasets through: (1) transparent data quality management with comprehensive audit trails, (2) cross-vocabulary mapping of heterogeneous medical terminologies to unified SNOMED-CT standards, with deduplication and unit standardization, (3) modular architecture with parallel optimization enabling complete dataset processing in <<1 day even on standard computing hardware, and (4) comprehensive baseline model benchmarks spanning multiple clinical prediction tasks to establish reproducible performance standards. By providing processing pipeline, baseline implementations, and detailed transformation documentation, CRISP saves researchers months of preprocessing effort and democratizes access to large-scale multi-institutional critical care data, enabling them to focus on advancing clinical AI. The complete source code, baseline models, and documentation are publicly available.

###### keywords:

Electronic Health Records, CRITICAL Dataset, Intensive Care Unit, Multi-institutional Data, Critical Care, Data Processing Pipeline, Healthcare AI, Real-world Data

#### Data and Code Availability

The CRITICAL dataset is available under a data use agreement at [https://critical.fsm.northwestern.edu](https://critical.fsm.northwestern.edu). CRISP source code, documentation, and processing scripts are publicly available at [https://github.com/AaronLuo00/CRISP-Pipeline](https://github.com/AaronLuo00/CRISP-Pipeline).

#### Institutional Review Board (IRB)

This research has been designed by Harvard IRB as Not Human Subject Research. IRB Protocol information will be provided if the paper is accepted.

## 1 Introduction

The rapid advancement of artificial intelligence (AI) has revolutionized healthcare through its integration with electronic health records (EHRs), enabling unprecedented capabilities in clinical prediction, diagnosis, and decision support. Recent breakthroughs have demonstrated the ability to accurately predict multiple medical events from EHR data (Rajkomar et al., [2018](https://arxiv.org/html/2509.08247v1#bib.bib24); Jiang et al., [2023](https://arxiv.org/html/2509.08247v1#bib.bib11); Grout et al., [2024](https://arxiv.org/html/2509.08247v1#bib.bib5); Hegselmann et al., [2025](https://arxiv.org/html/2509.08247v1#bib.bib9)), with models achieving performance comparable to clinical experts in various domains including mortality prediction, disease diagnosis, and treatment recommendation. These successes have increased interest in developing AI systems that can assist clinicians in real-time decision-making (Tomasev et al., [2019](https://arxiv.org/html/2509.08247v1#bib.bib30)), predict patient deterioration hours before clinical manifestation (Lauritsen et al., [2020](https://arxiv.org/html/2509.08247v1#bib.bib17)), and optimize resource allocation in increasingly strained critical care settings where timely intervention can significantly impact patient outcomes (Komorowski et al., [2018](https://arxiv.org/html/2509.08247v1#bib.bib16); Gutierrez, [2020](https://arxiv.org/html/2509.08247v1#bib.bib7)).

However, the promise of AI in healthcare critically depends on access to large-scale, diverse, and well-structured clinical data, a fundamental challenge that limit the development of truly generalizable AI models (Futoma et al., [2020](https://arxiv.org/html/2509.08247v1#bib.bib3); Kelly et al., [2019](https://arxiv.org/html/2509.08247v1#bib.bib15)). Most existing models are trained on single-institution datasets, raising concerns about their transferability across different healthcare systems, patient populations, and clinical practice patterns (Zech et al., [2018](https://arxiv.org/html/2509.08247v1#bib.bib33); Nestor et al., [2019](https://arxiv.org/html/2509.08247v1#bib.bib20)). Furthermore, the heterogeneity in data collection practices, vocabulary usage, and documentation standards across institutions creates a substantial barrier to developing robust, multi-institutional AI systems that can benefit diverse patient populations (Gianfrancesco et al., [2018](https://arxiv.org/html/2509.08247v1#bib.bib4); Obermeyer et al., [2019](https://arxiv.org/html/2509.08247v1#bib.bib21)). This challenge is particularly acute in critical care settings, where the complexity of patient conditions, the diversity of monitoring equipment, and the urgency of clinical decisions demand models that can generalize across varying institutional protocols and patient demographics (Sendak et al., [2020](https://arxiv.org/html/2509.08247v1#bib.bib27); Shah et al., [2019](https://arxiv.org/html/2509.08247v1#bib.bib28)).

### 1.1 The Data Challenge in Healthcare AI

Pioneering datasets like MIMIC-III and MIMIC-IV have established the foundation for critical care AI research, with MIMIC-IV comprising over 65,000 intensive care unit (ICU) patients and more than 200,000 emergency department (ED) patients, enabling groundbreaking advances in mortality prediction, treatment optimization, and clinical decision support (Johnson et al., [2016](https://arxiv.org/html/2509.08247v1#bib.bib13), [2023](https://arxiv.org/html/2509.08247v1#bib.bib12)). The eICU Collaborative Research Database further expanded the field by demonstrating the value of multi-center data (∼\\sim200,000 ICU admissions across 208 hospitals), pioneering cross-institutional research approaches (Pollard et al., [2018](https://arxiv.org/html/2509.08247v1#bib.bib22)). These foundational resources have trained a generation of researchers and established methodological standards that continue to guide the field.

Building upon these essential contributions, the CRITICAL dataset extends the research landscape by providing 1.95 billion records from 371,365 patients across four Clinical and Translational Science Awards (CTSA) sites, offering complementary strengths including full-spectrum patient journeys (pre-ICU, ICU, and post-ICU), extended longitudinal tracking, and diverse geographic representation (The CRITICAL Consortium, [2025](https://arxiv.org/html/2509.08247v1#bib.bib29)). While this scale and diversity enable more generalizable modeling, they also introduce cross-site semantic heterogeneity—differences in vocabulary usage, coding practices, units, and temporal granularity—demanding transparent, reproducible data preprocessing for cleaning, standardization, and harmonization. CRISP addresses these challenges by providing a modular, reusable pipeline that not only accelerates research but also ensures consistency with the methodological standards established by the MIMIC and eICU communities.

### 1.2 Our Contributions

To address these critical needs for standardization and unified data formats, we present CRISP (CRITICAL Records Integrated Standardization Pipeline), a comprehensive solution that transforms CRITICAL’s 1.95 billion raw records into ML-ready formats. Our contributions include:

(1) Five-stage preprocessing pipeline that systematically transforms raw Observational Medical Outcomes Partnership Common Data Model (OMOP CDM) data through exploratory analysis, data cleaning, vocabulary mapping, standardization, and ICU cohort extraction with comprehensive audit trails ensuring reproducibility.

(2) Scalable parallel architecture that processes the entire 278.97 GB dataset in under 24 hours using 12 CPU cores and 64GB RAM through optimized chunked processing and parallel optimization, making large-scale multi-institutional data processing accessible to resource-constrained research teams.

(3) Comprehensive benchmarks across four critical prediction tasks using multiple model architectures, establishing reproducible baselines for the research community.

(4) Open-source implementation with complete code, documentation, and processed datasets, saving researchers months of preprocessing effort.

## 2 Related Work

### 2.1 Clinical Data Processing Pipelines

As clinical datasets grow in scale and complexity, the need for standardized, reusable pipelines becomes increasingly critical. In particular, there has been many processing pipelines designed for MIMIC-III, MIMIC-IV, eICU and other EHR datasets. Notable contributions include MIMIC-Extract (Wang et al., [2020](https://arxiv.org/html/2509.08247v1#bib.bib32)) for cohort extraction, multitask benchmarks (Harutyunyan et al., [2019](https://arxiv.org/html/2509.08247v1#bib.bib8)) establishing standard prediction tasks, COP-E-CAT (Mandyam et al., [2021](https://arxiv.org/html/2509.08247v1#bib.bib19)) for modular preprocessing, an extensive MIMIC-IV pipeline (Gupta et al., [2022](https://arxiv.org/html/2509.08247v1#bib.bib6)), METRE (Liao and Voldman, [2023](https://arxiv.org/html/2509.08247v1#bib.bib18)) for cross-database validation, and reproducibility MIMIC benchmark (Purushotham et al., [2018](https://arxiv.org/html/2509.08247v1#bib.bib23)).

These pipelines have established a solid foundation for processing single-institution EHR datasets and have achieved remarkable success within their respective domains. However, extending them to multi-institutional environments poses several challenges. Existing pipelines are typically optimized for dataset-specific schemas (e.g., MIMIC’s custom structure or eICU’s format). Additionally, they often assume a single-vocabulary system, whereas multi-institutional environments incorporate multiple overlapping vocabularies requiring sophisticated cross-vocabulary harmonization. Finally, many of these pipelines utilize single-threaded architectures that are sufficient for moderate-scale datasets, but inadequate for multi-site, billion-row CDM tables.

CRISP builds upon these prior efforts by introducing a parallelized pipeline tailored specifically for a multi-institutional setting. It incorporates systematic data cleaning, schema standardization, and multi-vocabulary harmonization to enable large-scale, multi-institutional processing. Our implementation achieves a 4–6×\\times speedup compared to serial execution and completes full-dataset processing in approximately 20 hours on commodity hardware. We also release reproducible benchmarks covering both traditional machine learning models and deep learning architectures.

### 2.2 Broader Context and Challenges

Multi-institutional Harmonization and Standardization: The heterogeneity of medical vocabularies across institutions creates fundamental challenges for multi-site data integration. Henke et al. ([2024](https://arxiv.org/html/2509.08247v1#bib.bib10)) proposed systematic harmonization approaches to address schema heterogeneity across OMOP implementations, identifying multiple sources of incompatibility requiring comprehensive harmonization processes. Wang et al. ([2025](https://arxiv.org/html/2509.08247v1#bib.bib31)) examined OMOP CDM adoption challenges in specialized domains like oncology, revealing significant gaps in cancer-specific concept coverage. This vocabulary heterogeneity leads to severe feature matrix sparsity: when identical clinical concepts are encoded differently across sites, each feature is populated only by a subset of institutions. The resulting matrices are dominated by missing values, introducing noise and degrading model performance (Che et al., [2018](https://arxiv.org/html/2509.08247v1#bib.bib1)). As demonstrated in Figure [2](https://arxiv.org/html/2509.08247v1#S4.F2 "Figure 2 ‣ 4.2 Five-Stage Processing Pipeline ‣ 4 Data Pipeline Overview ‣ The CRITICAL Records Integrated Standardization Pipeline (CRISP): End-to-End Processing of Large-scale Multi-institutional OMOP CDM Data"), this vocabulary heterogeneity is particularly pronounced in multi-institutional datasets. CRISP addresses this challenge by systematically analyzing vocabulary distributions in the CRITICAL dataset, constructing cross-vocabulary mappings to unified Systematized Nomenclature of Medicine Clinical Terms (SNOMED-CT) 111hereafter refer as SNOMED standards, and standardizing different units to Unified Code for Units of Measure (UCUM) specifications (Schadow and McDonald, [2009](https://arxiv.org/html/2509.08247v1#bib.bib26)), thereby consolidating fragmented features into dense, semantically consistent representations essential for robust multi-institutional EHR model training.

Clinical Benchmarks: Foundational work established standard prediction tasks (e.g., mortality, length-of-stay) and demonstrated that preprocessing strongly affects performance (Johnson et al., [2017](https://arxiv.org/html/2509.08247v1#bib.bib14); Rocheteau et al., [2021](https://arxiv.org/html/2509.08247v1#bib.bib25)). Building on this, we release reproducible benchmarks over CRITICAL using CRISP\-processed OMOP data, enabling fair comparisons across models.

![Refer to caption](x1.png)

Figure 1: CRISP Pipeline Architecture: Five-stage data processing pipeline for the CRITICAL dataset.

## 3 The CRITICAL Dataset

The CRITICAL dataset represents the first cross-CTSA initiative to create a multi-site, multi-modal, de-identified clinical dataset combining both deep longitudinal coverage and broad institutional diversity. Developed collaboratively across four CTSA sites (Northwestern, Tufts, Washington University in St. Louis, and University of Alabama at Birmingham), CRITICAL encompasses 1.95 billion records from 371,365 patients (The CRITICAL Consortium, [2025](https://arxiv.org/html/2509.08247v1#bib.bib29)), establishing it as the largest publicly shared, disease-independent benchmarking dataset for critical care research. Built on OMOP CDM v5.3, the repository spans 17 tables totaling 278.97 GB (Table [3](https://arxiv.org/html/2509.08247v1#A1.T3 "Table 3 ‣ Appendix A Dataset Demographics and Volume Statistics ‣ The CRITICAL Records Integrated Standardization Pipeline (CRISP): End-to-End Processing of Large-scale Multi-institutional OMOP CDM Data")), with MEASUREMENT alone containing 1.4 billion rows. The dataset includes 38 million visits and 28 million unit-level records, averaging 5,242 rows per patient across all tables.

CRITICAL provides comprehensive patient care journeys with a median observation period of 3.11 years and maximum spanning 31.8 years (Table [4](https://arxiv.org/html/2509.08247v1#A1.T4 "Table 4 ‣ Appendix A Dataset Demographics and Volume Statistics ‣ The CRITICAL Records Integrated Standardization Pipeline (CRISP): End-to-End Processing of Large-scale Multi-institutional OMOP CDM Data")). This extensive temporal coverage captures pre-ICU, ICU, and post-ICU encounters across both inpatient and outpatient settings, with patients averaging 102.3 visits throughout their observation periods. This multi-institutional, longitudinal perspective introduces substantial vocabulary heterogeneity—150,671 unique source concepts across 30 vocabularies222After deduplication across related tables, the dataset contains over 110,000 unique clinical concepts., with SNOMED alone accounting for 58.0% (87,453 concepts). Figure [2](https://arxiv.org/html/2509.08247v1#S4.F2 "Figure 2 ‣ 4.2 Five-Stage Processing Pipeline ‣ 4 Data Pipeline Overview ‣ The CRITICAL Records Integrated Standardization Pipeline (CRISP): End-to-End Processing of Large-scale Multi-institutional OMOP CDM Data") illustrates this vocabulary heterogeneity across major tables within the dataset (see Appendix [B](https://arxiv.org/html/2509.08247v1#A2 "Appendix B Vocabulary Distribution Analysis ‣ The CRITICAL Records Integrated Standardization Pipeline (CRISP): End-to-End Processing of Large-scale Multi-institutional OMOP CDM Data") for detailed distribution analysis), requiring systematic harmonization to unified standards.

This combination of extensive scale, institutional diversity, and longitudinal depth improves access to large-scale clinical data for AI research.

## 4 Data Pipeline Overview

### 4.1 Pipeline Architecture

To harness the CRITICAL dataset’s scale and multi-institutional diversity described in Section 3, CRISP employs a five-stage processing framework that transforms the raw OMOP CDM tables into ML-ready dataset. The pipeline architecture consists of two primary components: (1) a core data processing module executing sequential stages of exploratory analysis, data cleaning, cross-vocabulary mapping, standardization, and patient data extraction with label generation; and (2) an optional predictive modeling module offering baseline implementations and evaluation benchmarks. This modular design allows researchers to utilize individual stages independently, customize processing parameters, or extend the pipeline with task-specific modification. (Figure [1](https://arxiv.org/html/2509.08247v1#S2.F1 "Figure 1 ‣ 2.2 Broader Context and Challenges ‣ 2 Related Work ‣ The CRITICAL Records Integrated Standardization Pipeline (CRISP): End-to-End Processing of Large-scale Multi-institutional OMOP CDM Data")).

The implementation leverages parallel processing strategies across all computationally intensive operations. Through chunked data loading and concurrent table processing, the pipeline handles billion-row tables within memory constraints while maintaining processing efficiency. Every transformation generates detailed audit trails—tracking removed records, vocabulary mappings, unit conversions, and outlier statistics—enabling complete reproducibility. This architecture processes the entire 278.97 GB CRITICAL dataset in under 24 hours using standard computational resources (12 CPU cores, 64GB RAM).

### 4.2 Five-Stage Processing Pipeline

Stage 1: Exploratory Data Analysis. This stage generates comprehensive dataset statistics that guide subsequent processing modules and provide researchers with detailed data understanding. The pipeline analyzes all 17 OMOP tables, producing: (1) column-level missingness analysis, automatically flagging columns with \>\>95% missing values for removal to simplify downstream processing; (2) table-level summaries including row counts (1.95 billion total), unique patient counts , memory usage, and temporal coverage (date ranges for each table); and (3) population-level statistics such as ICU admission rates, mortality rates , gender distributions, and age ranges. All statistics are exported as structured JSON files that subsequent modules consume to parameterize their operations.

Stage 2: Data Cleaning and Preprocessing. Building on Stage 1’s column analysis, this stage systematically cleans 14 tables333The three tables not processed are LOCATION, CARE\_SITE, and PROVIDER, as they either lack meaningful information or are independent of patient-level data. by addressing data quality issues. The pipeline performs three parallel cleaning operations: (1) invalid concept removal filters out records where the primary concept ID field (e.g., measurement\_concept\_id, procedure\_concept\_id) is null, empty, or zero—these represent unmapped or invalid clinical codes that cannot be interpreted, eliminating approximately 2-5% of records; (2) duplicate elimination identifies and removes redundant records using composite keys (person\_id + concept\_id + datetime), preventing the same clinical event from being counted multiple times; and (3) temporal validation ensures chronological consistency by verifying start times precede end times, removing records with future dates or impossible sequences. All removed records are archived in structured directories with detailed logs, enabling quality assessment and potential recovery.

![Refer to caption](x2.png)

Figure 2: Vocabulary distribution across major OMOP tables demonstrates.

Stage 3: Cross-Vocabulary Concept Mapping. This stage addresses the fundamental challenge of vocabulary heterogeneity in multi-institutional datasets, where different sites may use entirely different coding systems for the same clinical concepts. SNOMED was selected as the target vocabulary because it already represents the majority of concepts both globally (58.0% of all concepts) and within most individual tables (Figure [2](https://arxiv.org/html/2509.08247v1#S4.F2 "Figure 2 ‣ 4.2 Five-Stage Processing Pipeline ‣ 4 Data Pipeline Overview ‣ The CRITICAL Records Integrated Standardization Pipeline (CRISP): End-to-End Processing of Large-scale Multi-institutional OMOP CDM Data")), minimizing the required mapping effort while maximizing coverage. The pipeline targets four key tables444MEASUREMENT, OBSERVATION, PROCEDURE\_OCCURRENCE, DEVICE\_EXPOSURE that exhibit the most complex vocabulary heterogeneity—for instance, PROCEDURE\_OCCURRENCE contains concepts from ICD10PCS (57.8%), CPT4 (19.8%), and SNOMED (15.4%) as shown in Figure [2](https://arxiv.org/html/2509.08247v1#S4.F2 "Figure 2 ‣ 4.2 Five-Stage Processing Pipeline ‣ 4 Data Pipeline Overview ‣ The CRITICAL Records Integrated Standardization Pipeline (CRISP): End-to-End Processing of Large-scale Multi-institutional OMOP CDM Data"). These tables are critical for clinical prediction yet suffer from severe fragmentation without harmonization. The pipeline applies pre-computed crosswalks to map diverse source vocabularies (including ICD9CM, ICD10CM, ICD10PCS, CPT4, LOINC, HCPCS, RxNorm, and others shown in Figure [3](https://arxiv.org/html/2509.08247v1#S4.F3 "Figure 3 ‣ 4.2 Five-Stage Processing Pipeline ‣ 4 Data Pipeline Overview ‣ The CRITICAL Records Integrated Standardization Pipeline (CRISP): End-to-End Processing of Large-scale Multi-institutional OMOP CDM Data")) to unified SNOMED codes, harmonizing over 25,000 unique source concepts. Post-mapping deduplication removes redundancies from many-to-one mappings using composite keys (person\_id + SNOMED\_id + datetime), consolidating multiple source representations of the same clinical concept.

![Refer to caption](images/vocabulary_mapping.png)

Figure 3: Vocabulary harmonization: mapping diverse medical terminologies to unified SNOMED standards.

Stage 4: Data Standardization and Unit Harmonization. This stage ensures measurement consistency and temporal coherence across the harmonized dataset. Processing tables from Stage 3’s output, the pipeline performs four key standardization operations. First, outlier removal applies T-Digest algorithms (Dunning and Ertl, [2019](https://arxiv.org/html/2509.08247v1#bib.bib2)) specifically to MEASUREMENT tables, computing memory-efficient percentiles across 1.4 billion records and filtering out outliers beyond the 1st and 99th percentiles555Configurable parameters, following the approach of Gupta et al. ([2022](https://arxiv.org/html/2509.08247v1#bib.bib6)).. Second, unit standardization converts heterogeneous measurement units to UCUM standards—for example, temperature from Fahrenheit to Celsius, weight from pounds to kilograms, and height from inches to centimeters—while removing physiologically implausible values (illustrated in Figure [4](https://arxiv.org/html/2509.08247v1#S4.F4 "Figure 4 ‣ 4.2 Five-Stage Processing Pipeline ‣ 4 Data Pipeline Overview ‣ The CRITICAL Records Integrated Standardization Pipeline (CRISP): End-to-End Processing of Large-scale Multi-institutional OMOP CDM Data")). Third, visit consolidation merges fragmented VISIT\_DETAIL and VISIT\_OCCURRENCE records within 2-hour windows, reconstructing continuous care episodes from 66 million visit records. Fourth, data type standardization ensures consistent representation—NaN for missing values, integers for IDs, floats for measurements, and ISO format for datetimes. After Stage 4 completion, all critical tables have unified concepts, with missing, erroneous, and implausible values removed, and data formats standardized for machine learning readiness.

![Refer to caption](x3.png)

Figure 4: Unit standardization pipeline: converting diverse measurement units to UCUM standards with outlier filtering.

Stage 5: Patient Data Extraction and Label Generation. This final stage transforms table-centric OMOP data into patient-centric structures required for machine learning. This stage performs three key operations. First, patient-level aggregation reorganizes 1.95 billion records into 371,365 individual patient directories, consolidating each patient’s complete medical history. Second, ICU cohort identification scans VISIT\_DETAIL tables for ICU-specific concept IDs666(Using concept ID: 581379 for ICU stays, 32037 for critical care), and generating temporal marks for different patient stages (pre-ICU, during-ICU, post-ICU). The extraction employs parallel chunked processing to efficiently handle billion-scale data while maintaining patient-level integrity.

The resulting patient-indexed structure is organized using a hybrid directory system (Figure [5](https://arxiv.org/html/2509.08247v1#S4.F5 "Figure 5 ‣ 4.2 Five-Stage Processing Pipeline ‣ 4 Data Pipeline Overview ‣ The CRITICAL Records Integrated Standardization Pipeline (CRISP): End-to-End Processing of Large-scale Multi-institutional OMOP CDM Data")) that adapts to the uneven distribution of 371,365 patient IDs. Low-density prefixes (<<30,000 patients) use direct folder organization, while high-density prefixes like 600000071 (\>\>30,000 patients) employ sub-directory layering (e.g., 002000-002999) to prevent file system degradation. This adaptive structure ensures efficient I/O performance while enabling direct patient queries for diverse ML tasks.

![Refer to caption](images/folder_structure.png)

Figure 5: Hybrid directory structure adapting to patient ID density for optimal file system performance.

### 4.3 Computational Performance Analysis

CRISP leverages parallel processing across all five pipeline stages to handle large-scale clinical data efficiently. Each stage employs configurable worker pools (default 8 workers) for concurrent processing. This comprehensive parallelization achieves 4-6×\\times speedup compared to sequential processing, reducing total pipeline execution time from approximately 4 days to ∼\\sim20 hours on standard hardware (12-core CPU, 64GB RAM). The substantial acceleration, combined with memory-efficient strategies like T-Digest for percentile computation, chunked I/O operations, and the hybrid directory structure design, makes large-scale multi-institutional data processing feasible for resource-constrained research teams.

## 5 Benchmark Tasks and Models

To validate CRISP’s effectiveness and establish reproducible baselines, we conduct comprehensive benchmark experiments on the harmonized CRITICAL dataset. Our evaluation framework tests both traditional and deep learning models across multiple clinical prediction tasks, revealing current performance limitations and opportunities for methodological advancement.

### 5.1 Experimental Setup and Methodology

Following MIMIC-Extract (Wang et al., [2020](https://arxiv.org/html/2509.08247v1#bib.bib32)), we select the 800 most frequent clinical concepts from the harmonized dataset, extracting features from five key tables (MEASUREMENT, OBSERVATION, DRUG\_EXPOSURE, CONDITION\_OCCURRENCE, PROCEDURE\_OCCURRENCE). The observation window spans the first 24 hours of ICU admission, discretized into 4-hour bins to capture temporal dynamics. We evaluate seven model architectures spanning traditional ML (Logistic Regression, Random Forest, Gradient Boosting, XGBoost) and deep learning approaches (Multi-Layer Perceptron (MLP), Long Short-Term Memory networks (LSTM), Temporal Convolutional Networks (TCN)). All models employ 5-fold cross-validation, with the final results reported using 80% of data for training and 20% for testing. Detailed LSTM and TCN model architectures are provided in Appendix [C](https://arxiv.org/html/2509.08247v1#A3 "Appendix C Deep Learning Model Architectures ‣ The CRITICAL Records Integrated Standardization Pipeline (CRISP): End-to-End Processing of Large-scale Multi-institutional OMOP CDM Data").

### 5.2 Clinical Prediction Tasks

Inspired by Gupta et al. ([2022](https://arxiv.org/html/2509.08247v1#bib.bib6)), we define four binary classification tasks following standard ICU prediction benchmarks with varying time horizons:

Mortality Prediction: 7-day and 30-day in-hospital mortality using the first 48 hours of ICU data. This task addresses critical care triage and resource allocation decisions.

Length of Stay: Predicting ICU stays exceeding 3 and 7 days using the first 24 hours, essential for capacity planning and early intervention strategies.

Readmission Risk: 7-day, 30-day, and 90-day readmission prediction using the last 48 hours before discharge, crucial for discharge planning and follow-up care coordination.

Sepsis Onset: Detecting sepsis development after ICU admission, within 48 hours, and within 7 days, enabling timely antibiotic therapy and aggressive treatment protocols.

All tasks maintain 48-hour gaps between observation and prediction windows to prevent label leakage. We select 800 high-frequency features: 400 from MEASUREMENT, 200 from OBSERVATION, 100 from DRUG\_EXPOSURE, and 50 each from CONDITION\_OCCURRENCE and PROCEDURE\_OCCURRENCE, balancing computational efficiency with clinical coverage.

Table 1: Clinical Prediction Performance (AUROC)

Task Category

Prediction Target

LR

RF

GB

XGB

MLP

LSTM

TCN

Mortality

7-day

0.684

0.676

0.763

0.781

0.814

0.697

0.705

30-day

0.708

0.732

0.802

0.804

0.835

0.764

0.778

Length of Stay

LOS \>\> 3 days

0.651

0.702

0.732

0.735

0.756

0.689

0.711

LOS \>\> 7 days

0.666

0.702

0.746

0.748

0.767

0.687

0.719

Readmission

7-day

0.641

0.703

0.739

0.755

0.748

0.663

0.681

30-day

0.619

0.699

0.726

0.735

0.743

0.652

0.698

90-day

0.635

0.695

0.741

0.746

0.737

0.663

0.702

In ICU Sepsis

After ICU

0.879

0.895

0.897

0.898

0.883

0.884

0.871

Within 48h

0.836

0.870

0.883

0.882

0.912

0.799

0.845

Within 7 days

0.904

0.899

0.904

0.908

0.902

0.852

0.876

The comprehensive results on the full CRITICAL dataset (Table [1](https://arxiv.org/html/2509.08247v1#S5.T1 "Table 1 ‣ 5.2 Clinical Prediction Tasks ‣ 5 Benchmark Tasks and Models ‣ The CRITICAL Records Integrated Standardization Pipeline (CRISP): End-to-End Processing of Large-scale Multi-institutional OMOP CDM Data")) reveal significant room for improvement in multi-institutional clinical prediction. Even with CRISP’s harmonization and sparsity reduction, the best models achieve only 0.619-0.755 AUROC for readmission tasks, highlighting the inherent complexity of predicting patient trajectories across heterogeneous institutions. This performance gap motivates further research into advanced feature selection and utilization strategies, novel model architectures, as well as leveraging the extensive pre-ICU information uniquely available in CRITICAL.

## 6 Discussion and Conclusion

Core Contribution. CRISP is the first end-to-end processing pipeline specifically designed for the large-scale multi-institutional CRITICAL dataset. The pipeline systematically addresses the CRITICAL dataset’s complexity—150,671 unique concepts across 30 vocabularies and 1.95 billion records—through five integrated stages: (1) systematic exploratory data analysis (2) comprehensive cleaning that removes invalid concepts, duplicates, and temporal inconsistencies across 14 tables; (3) cross-vocabulary mapping that harmonizes four key tables to unified SNOMED standards; (4) data standardization with outlier removal, unit conversion, and visit merging; and (5) patient-centric extraction that generates ML-ready features. Through optimized parallel processing and chunking strategies, CRISP achieves 4-6× speedup over sequential approaches, processing the entire 278.97 GB dataset in approximately 20 hours on standard hardware. The pipeline also provides comprehensive ML benchmarks across seven model architectures and four clinical prediction tasks, establishing reproducible baselines for future research.

Broader Impact. By making the groundbreaking CRITICAL dataset immediately accessible, CRISP democratizes multi-institutional healthcare AI research. The pipeline transforms months of manual data curation into a ready-to-deploy solution, lowering the barrier from requiring specialized data engineering expertise to simply executing pre-configured scripts. This accessibility significantly lowers the barrier to entry, enabling researchers to focus on developing and testing innovative models rather than wrestling with data preprocessing challenges. CRISP’s comprehensive infrastructure enables the research community to quickly leverage CRITICAL’s unprecedented scale and diversity, accelerating progress toward robust, generalizable clinical AI systems. The combination of systematic data processing, concept harmonization, and reproducible benchmarks establishes a foundation for collaborative advancement in cross-institutional healthcare ML.

Limitations and Future Work. While current vocabulary mapping prioritizes four critical tables that exhibit the most complex heterogeneity and are essential for clinical prediction, future releases will progressively extend mapping coverage to all tables requiring harmonization. The pipeline currently employs empirically-derived parameters—such as 99th percentile outlier thresholds and 2-hour visit merging windows—that provide robust general-purpose processing but may not be optimal for specific clinical tasks. Future work may develop task-adaptive parameter selection, leverage CRITICAL’s unique longitudinal coverage spanning pre-ICU, ICU, and post-ICU periods to explore novel prediction tasks with high clinical value, and investigate advanced feature utilization strategies for the dataset’s extensive concepts.

## References

-   Che et al. (2018) Zhengping Che, Sanjay Purushotham, Kyunghyun Cho, David Sontag, and Yan Liu. Recurrent neural networks for multivariate time series with missing values. _Scientific reports_, 8(1):6085, 2018.
-   Dunning and Ertl (2019) Ted Dunning and Otmar Ertl. Computing extremely accurate quantiles using t-digests. _arXiv preprint arXiv:1902.04023_, 2019.
-   Futoma et al. (2020) Joseph Futoma, Morgan Simons, Trishan Panch, Finale Doshi-Velez, and Leo Anthony Celi. The myth of generalisability in clinical research and machine learning in health care. _The Lancet Digital Health_, 2(9):e489–e492, 2020. [10.1016/S2589-7500(20)30186-2](https:/doi.org/10.1016/S2589-7500\(20\)30186-2).
-   Gianfrancesco et al. (2018) Milena A Gianfrancesco, Suzanne Tamang, Jinoos Yazdany, and Gabriela Schmajuk. Potential biases in machine learning algorithms using electronic health record data. _JAMA Internal Medicine_, 178(11):1544–1547, 2018. [10.1001/jamainternmed.2018.3763](https:/doi.org/10.1001/jamainternmed.2018.3763).
-   Grout et al. (2024) Robert Grout, Rishab Gupta, Ruby Bryant, Mawada A Elmahgoub, Yijie Li, Khushbakht Irfanullah, Rahul F Patel, Jake Fawkes, and Catherine Inness. Predicting disease onset from electronic health records for population health management: a scalable and explainable deep learning approach. _Frontiers in Artificial Intelligence_, 6:1287541, 2024.
-   Gupta et al. (2022) Mehak Gupta, Brennan Gallamoza, Nicolas Cutrona, Pranjal Dhakal, Raphael Poulain, and Rahmatollah Beheshti. An extensive data processing pipeline for mimic-iv. In _Machine learning for health_, pages 311–325. PMLR, 2022.
-   Gutierrez (2020) Gabriel Gutierrez. Artificial intelligence in the intensive care unit. _Critical Care_, 24(1):101, 2020. [10.1186/s13054-020-2785-y](https:/doi.org/10.1186/s13054-020-2785-y).
-   Harutyunyan et al. (2019) Hrayr Harutyunyan, Hrant Khachatrian, David C Kale, Greg Ver Steeg, and Aram Galstyan. Multitask learning and benchmarking with clinical time series data. _Scientific data_, 6(1):96, 2019.
-   Hegselmann et al. (2025) Stefan Hegselmann, Georg von Arnim, Tillmann Rheude, Noel Kronenberg, David Sontag, Gerhard Hindricks, Roland Eils, and Benjamin Wild. Large language models are powerful electronic health record encoders. _arXiv preprint arXiv:2502.17403_, 2025.
-   Henke et al. (2024) E Henke, M Zoch, Y Peng, et al. Conceptual design of a generic data harmonization process for omop common data model. _BMC Medical Informatics and Decision Making_, 24:58, 2024. [10.1186/s12911-024-02458-7](https:/doi.org/10.1186/s12911-024-02458-7).
-   Jiang et al. (2023) Lavender Y Jiang, Shengyi Liu, Dan Chen, Will Ning, David Zhang, Joyce Kim, Roxana Daneshjou, Junyang Duan, Peyton Chen, Dmitriy Lituiev, et al. Health system-scale language models are all-purpose prediction engines. _Nature_, 619(7969):357–362, 2023.
-   Johnson et al. (2023) Alistair E. W. Johnson, Lucas Bulgarelli, Lu Shen, Alvin Gayles, Ayad Shammout, Steven Horng, Tom J. Pollard, Sicheng Hao, Benjamin Moody, Brian Gow, Li-wei H. Lehman, Leo A. Celi, and Roger G. Mark. Mimic-iv, a freely accessible electronic health record dataset. _Scientific Data_, 10(1):1, 2023. [10.1038/s41597-022-01899-x](https:/doi.org/10.1038/s41597-022-01899-x).
-   Johnson et al. (2016) Alistair EW Johnson, Tom J Pollard, Lu Shen, Li-wei H Lehman, Mengling Feng, Mohammad Ghassemi, Benjamin Moody, Peter Szolovits, Leo Anthony Celi, and Roger G Mark. Mimic-iii, a freely accessible critical care database. _Scientific data_, 3(1):1–9, 2016.
-   Johnson et al. (2017) Alistair EW Johnson, Tom J Pollard, and Roger G Mark. Reproducibility in critical care: a mortality prediction case study. In _Machine Learning for Healthcare Conference_, pages 361–376. PMLR, 2017.
-   Kelly et al. (2019) Christopher J Kelly, Alan Karthikesalingam, Mustafa Suleyman, Greg Corrado, and Dominic King. Key challenges for delivering clinical impact with artificial intelligence. _BMC Medicine_, 17(1):195, 2019. [10.1186/s12916-019-1426-2](https:/doi.org/10.1186/s12916-019-1426-2).
-   Komorowski et al. (2018) Matthieu Komorowski, Leo A Celi, Omar Badawi, Anthony C Gordon, and A Aldo Faisal. The artificial intelligence clinician learns optimal treatment strategies for sepsis in intensive care. _Nature Medicine_, 24(11):1716–1720, 2018. [10.1038/s41591-018-0213-5](https:/doi.org/10.1038/s41591-018-0213-5).
-   Lauritsen et al. (2020) Simon Meyer Lauritsen, Mads Kristensen, Mathias Vassard Olsen, Mads Stenhuus Larsen, Katrine Meyer Lauritsen, Marianne Johansson Jørgensen, Jeppe Lange, and Bo Thiesson. Explainable artificial intelligence model to predict acute critical illness from electronic health records. _Nature Communications_, 11(1):3852, 2020. [10.1038/s41467-020-17431-x](https:/doi.org/10.1038/s41467-020-17431-x).
-   Liao and Voldman (2023) Wei Liao and Joel Voldman. A multidatabase extraction pipeline (metre) for facile cross validation in critical care research. _Journal of Biomedical Informatics_, 141:104356, 2023.
-   Mandyam et al. (2021) Aishwarya Mandyam, Elizabeth C Yoo, Jeff Soules, Krzysztof Laudanski, and Barbara E Engelhardt. Cop-e-cat: cleaning and organization pipeline for ehr computational and analytic tasks. In _Proceedings of the 12th ACM International Conference on Bioinformatics, Computational Biology, and Health Informatics_, pages 1–9, 2021.
-   Nestor et al. (2019) Bret Nestor, Matthew BA McDermott, Willie Boag, Gabriela Berner, Tristan Naumann, Michael C Hughes, Anna Goldenberg, and Marzyeh Ghassemi. Feature robustness in non-stationary health records: caveats to deployable model performance in common clinical machine learning tasks. In _Machine Learning for Healthcare Conference_, pages 381–405. PMLR, 2019.
-   Obermeyer et al. (2019) Ziad Obermeyer, Brian Powers, Christine Vogeli, and Sendhil Mullainathan. Dissecting racial bias in an algorithm used to manage the health of populations. _Science_, 366(6464):447–453, 2019. [10.1126/science.aax2342](https:/doi.org/10.1126/science.aax2342).
-   Pollard et al. (2018) Tom J Pollard, Alistair EW Johnson, Jesse D Raffa, Leo A Celi, Roger G Mark, and Omar Badawi. The eicu collaborative research database, a freely available multi-center database for critical care research. _Scientific data_, 5(1):1–13, 2018.
-   Purushotham et al. (2018) Sanjay Purushotham, Chuizheng Meng, Zhengping Che, and Yan Liu. Benchmarking deep learning models on large healthcare datasets. _Journal of biomedical informatics_, 83:112–134, 2018.
-   Rajkomar et al. (2018) Alvin Rajkomar, Eyal Oren, Kai Chen, Andrew M Dai, Nissan Hajaj, Michaela Hardt, Peter J Liu, Xiaobing Liu, Jake Marcus, Mimi Sun, et al. Scalable and accurate deep learning with electronic health records. _NPJ Digital Medicine_, 1(1):18, 2018.
-   Rocheteau et al. (2021) Emma Rocheteau, Pietro Liò, and Stephanie Hyland. Temporal pointwise convolutional networks for length of stay prediction in the intensive care unit. In _Proceedings of the Conference on Health, Inference, and Learning_, pages 58–68. PMLR, 2021.
-   Schadow and McDonald (2009) Gunther Schadow and Clement J McDonald. The unified code for units of measure. _Regenstrief Institute and UCUM Organization: Indianapolis, IN, USA_, page 99, 2009.
-   Sendak et al. (2020) Mark P Sendak, Michael Gao, Nathan Brajer, and Suresh Balu. A path for translation of machine learning products into healthcare delivery. _EMJ Innovations_, 10:19–00172, 2020.
-   Shah et al. (2019) Pratik Shah, Francis Kendall, Sean Khozin, Ryan Goosen, Jianying Hu, Jason Laramie, Michael Ringel, and Nicholas Schork. Artificial intelligence and machine learning in clinical development: a translational perspective. _NPJ Digital Medicine_, 2(1):69, 2019. [10.1038/s41746-019-0148-3](https:/doi.org/10.1038/s41746-019-0148-3).
-   The CRITICAL Consortium (2025) The CRITICAL Consortium. CRITICAL dataset: A large-scale, multi-site dataset for critical care research. [https://critical.fsm.northwestern.edu](https://critical.fsm.northwestern.edu), 2025. Accessed: 2025-08-28. Additional information available at [https://amia.org/webinar-library/critical-consortium-and-dataset](https://amia.org/webinar-library/critical-consortium-and-dataset).
-   Tomasev et al. (2019) Nenad Tomasev, Xavier Glorot, Jack W Rae, Michal Zielinski, Harry Askham, Andre Saraiva, Anne Mottram, Clemens Meyer, Suman Ravuri, Ivan Protsyuk, et al. A clinically applicable approach to continuous prediction of future acute kidney injury. _Nature_, 572(7767):116–119, 2019. [10.1038/s41586-019-1390-1](https:/doi.org/10.1038/s41586-019-1390-1).
-   Wang et al. (2025) L Wang, A Wen, S Fu, et al. A scoping review of omop cdm adoption for cancer research using real world data. _npj Digital Medicine_, 8:189, 2025. [10.1038/s41746-025-01581-7](https:/doi.org/10.1038/s41746-025-01581-7).
-   Wang et al. (2020) Shirly Wang, Matthew BA McDermott, Geeticka Chauhan, Marzyeh Ghassemi, Michael C Hughes, and Tristan Naumann. Mimic-extract: a data extraction, preprocessing, and representation pipeline for mimic-iii. _Proceedings of the ACM Conference on Health, Inference, and Learning_, pages 222–235, 2020.
-   Zech et al. (2018) John R Zech, Marcus A Badgeley, Manway Liu, Anthony B Costa, Joseph J Titano, and Eric Karl Oermann. Variable generalization performance of a deep learning model to detect pneumonia in chest radiographs: a cross-sectional study. _PLoS Medicine_, 15(11):e1002683, 2018. [10.1371/journal.pmed.1002683](https:/doi.org/10.1371/journal.pmed.1002683).

## Appendix A Dataset Demographics and Volume Statistics

This appendix provides detailed demographic and volume statistics that demonstrate the multi-institutional heterogeneity CRISP was designed to address. Table [2](https://arxiv.org/html/2509.08247v1#A1.T2 "Table 2 ‣ Appendix A Dataset Demographics and Volume Statistics ‣ The CRITICAL Records Integrated Standardization Pipeline (CRISP): End-to-End Processing of Large-scale Multi-institutional OMOP CDM Data") presents the comprehensive demographic breakdown of 371,365 patients across four CTSA sites, showcasing the substantial diversity that validates CRISP’s generalizability across different patient populations. The demographic representation across race, ethnicity, and age groups exemplifies the health equity research opportunities enabled by CRISP’s systematic vocabulary harmonization, which ensures consistent feature representation across diverse institutional practices and coding standards.

Table [3](https://arxiv.org/html/2509.08247v1#A1.T3 "Table 3 ‣ Appendix A Dataset Demographics and Volume Statistics ‣ The CRITICAL Records Integrated Standardization Pipeline (CRISP): End-to-End Processing of Large-scale Multi-institutional OMOP CDM Data") illustrates the scale of vocabulary harmonization challenges addressed by CRISP—processing 1.95 billion records across 17 OMOP CDM tables with systematic standardization. The MEASUREMENT table alone contains 1.4 billion records, representing the largest single source of clinical data and exemplifying the computational challenges that CRISP efficiently handles through parallel processing and intelligent chunking. These volumes, combined with the extensive temporal coverage shown in Table [4](https://arxiv.org/html/2509.08247v1#A1.T4 "Table 4 ‣ Appendix A Dataset Demographics and Volume Statistics ‣ The CRITICAL Records Integrated Standardization Pipeline (CRISP): End-to-End Processing of Large-scale Multi-institutional OMOP CDM Data") (median observation period of 3.11 years, with 65.6% of patients having multi-year longitudinal data), demonstrate CRISP’s ability to transform massive, heterogeneous multi-institutional data into ML-ready datasets within approximately 20 hours on standard hardware, democratizing access to large-scale critical care data for the broader research community.

Table 2: Demographic characteristics of 371,365 patients in the CRITICAL dataset across four CTSA sites, demonstrating the multi-institutional diversity in race, ethnicity, gender, and age distributions

Variable

Gender

Total

Female

Male

N

%

Race

Asiana

6,750 (55.17%)

5,483 (44.83%)

12,233

3.29%

Black/African American

39,142 (52.62%)

35,237 (47.38%)

74,382

20.03%

Native American

338 (55.23%)

274 (44.77%)

612

0.16%

Pacific Islanderb

426 (54.27%)

359 (45.73%)

785

0.21%

White

141,993 (56.72%)

108,327 (43.28%)

250,328

67.41%

Multiple Race

1,612 (59.01%)

1,120 (41.00%)

2,732

0.74%

Unknown

9,217 (56.43%)

7,116 (43.57%)

16,337

4.40%

Other/Refused

8,121 (58.19%)

5,830 (41.81%)

13,956

3.76%

Ethnicity

Hispanic/Latino

12,065 (56.76%)

9,195 (43.24%)

21,260

5.72%

Not Hispanic/Latino

185,417 (55.78%)

146,949 (44.22%)

332,376

89.50%

Unknown

10,117 (57.07%)

7,602 (42.93%)

17,729

4.77%

Age at First Visitc

<<18

40,591 (55.34%)

32,753 (44.66%)

73,352

19.75%

18-30

13,775 (53.60%)

11,926 (46.40%)

25,703

6.92%

31-50

39,876 (56.62%)

30,545 (43.38%)

70,421

18.96%

51-70

79,063 (58.41%)

56,306 (41.59%)

135,372

36.45%

\>\>70

34,294 (51.56%)

32,216 (48.44%)

66,517

17.91%

Visit Typed

Outpatient

7,542,966 (51.50%)

7,105,372 (48.50%)

14,648,554

52.37%

Inpatient (non-ICU)

3,335,192 (53.02%)

2,954,536 (46.98%)

6,289,940

22.49%

ICU

506,178 (57.08%)

380,685 (42.92%)

886,896

3.17%

Emergency

385,437 (51.04%)

369,800 (48.96%)

755,243

2.70%

Other

2,868,848 (53.21%)

2,522,983 (46.79%)

5,391,831

19.28%

Mortalitye

Alive

162,062 (56.02%)

127,243 (43.98%)

289,321

77.91%

Deceased

45,537 (55.50%)

36,503 (44.50%)

82,044

22.09%

Totalf

207,599 (55.91%)

163,746 (44.09%)

371,365

100.00%

Notes:  
a Asian includes: Asian (11,227), Asian Indian (506), Korean (206), Chinese (100), Japanese (83), Vietnamese (49), Filipino (25), Thai (24), Cambodian (13)  
b Pacific Islander includes: Native Hawaiian (557), Native Hawaiian or Other Pacific Islander (228)  
c Age calculated as (Earliest Visit Date - Birth Date) / 365.25  
d Visit Type based on 27,972,464 visit details from VISIT\_DETAIL table. ICU identified by concept IDs 32037, 581379  
e Mortality status reflects patient vital status at last recorded encounter in the dataset  
f Total includes 20 additional patients with unknown or missing gender concept IDs

Table 3: Data volume distribution across 17 OMOP CDM tables in the CRITICAL dataset, totaling 1.95 billion records, with average records per patient demonstrating the comprehensive clinical coverage

Table Name

Row Count

Size (GB)

% of Total

Per Patient

MEASUREMENT

1,403,627,644

194.00

72.08%

3,779.1

OBSERVATION

174,355,400

21.06

8.95%

469.4

DRUG\_EXPOSURE

160,361,417

27.18

8.24%

431.7

CONDITION\_OCCURRENCE

138,749,128

17.63

7.13%

373.6

VISIT\_OCCURRENCE

38,000,960

5.29

1.95%

102.3

CONDITION\_ERA

35,921,008

2.73

1.85%

96.7

PROCEDURE\_OCCURRENCE

31,905,907

3.71

1.64%

85.9

VISIT\_DETAIL

27,972,464

4.44

1.44%

75.3

DRUG\_ERA

24,322,578

1.88

1.25%

65.5

DEVICE\_EXPOSURE

5,212,843

0.66

0.27%

14.0

LOCATION

4,875,096

0.10

0.25%

13.1

SPECIMEN

2,123,886

0.17

0.11%

5.7

PROVIDER

623,239

0.02

0.03%

1.7

PERSON

371,365

0.04

0.02%

1.0

OBSERVATION\_PERIOD

244,350

0.01

0.01%

0.7

DEATH

82,064

0.004

0.004%

0.2

CARE\_SITE

5,966

0.0002

0.0003%

/

TOTAL

1,947,180,421

278.97

100.00%

5,242.2

Table 4: Temporal characteristics of the CRITICAL dataset showing extensive longitudinal coverage with median observation period of 3.11 years and 65.6% of patients having multi-year data

Temporal Characteristic

Value

Time Span Statistics

Mean observation period

1,983.6 days (5.43 years)

Median observation period

1,137.0 days (3.11 years)

Standard deviation

2,168.9 days (5.94 years)

Minimum time span

0 days

Maximum time span

11,631 days (31.8 years)

25th percentile

94.0 days (0.26 years)

75th percentile

3,463.0 days (9.49 years)

Visit Frequency

Mean visits per patient

102.3

Median visits per patient

24

Patient Records Time Span Distributiona

Single visit (0 days)

2,823 (0.8%)

Under 1 year

127,692 (34.4%)

1-5 years

100,125 (27.0%)

5-10 years

56,139 (15.1%)

10-15 years

46,182 (12.4%)

15-20 years

40,356 (10.9%)

Over 20 years

871 (0.2%)

Total Patients

371,365 (100.0%)

Notes:

a Time span calculated as the difference between the last and first visit times in the VISIT\_OCCURRENCE table for each patient.

## Appendix B Vocabulary Distribution Analysis

This section visualizes the vocabulary heterogeneity challenges that necessitate CRISP’s cross-vocabulary mapping (Stage 3). The fragmentation of clinical concepts across multiple vocabularies creates sparse feature matrices that impede effective machine learning, making systematic harmonization to unified SNOMED standards essential.

Figure [6](https://arxiv.org/html/2509.08247v1#A2.F6 "Figure 6 ‣ Appendix B Vocabulary Distribution Analysis ‣ The CRITICAL Records Integrated Standardization Pipeline (CRISP): End-to-End Processing of Large-scale Multi-institutional OMOP CDM Data") shows the distribution of unique concepts across vocabularies, with SNOMED representing the majority while substantial portions use RxNorm, ICD10PCS, and other specialized terminologies. Figure [7](https://arxiv.org/html/2509.08247v1#A2.F7 "Figure 7 ‣ Appendix B Vocabulary Distribution Analysis ‣ The CRITICAL Records Integrated Standardization Pipeline (CRISP): End-to-End Processing of Large-scale Multi-institutional OMOP CDM Data") reveals the absolute concept counts within major OMOP tables, demonstrating how vocabulary usage varies significantly across clinical domains—from CONDITION\_OCCURRENCE’s 39,544 concepts to DRUG\_ERA’s focused 2,534 concepts. These visualizations underscore the complexity of harmonizing diverse medical terminologies across multi-institutional datasets.

![Refer to caption](x4.png)

Figure 6: Overall vocabulary distribution across 150,671 unique concepts in the CRITICAL dataset. SNOMED represents 58.0% (87,453 concepts), followed by RxNorm (15.7%), ICD10PCS (12.9%), illustrating the heterogeneity challenge addressed by CRISP’s mapping stage.

![Refer to caption](x5.png)

Figure 7: Absolute concept count distribution across major OMOP tables. CONDITION\_OCCURRENCE exhibits the highest vocabulary diversity (39,544 unique concepts), followed by PROCEDURE\_OCCURRENCE (33,149 concepts), while specialized tables like DRUG\_ERA show focused vocabularies (2,534 concepts), demonstrating domain-specific vocabulary patterns.

## Appendix C Deep Learning Model Architectures

This section presents the detailed architectures of two deep learning models used in our benchmark experiments. Both the LSTM and TCN models employ a hybrid architecture that integrates static patient features with temporal clinical measurements, enabling comprehensive representation learning from the multi-modal CRITICAL dataset.

![Refer to caption](images/lstm_hybrid_architecture.png)

Figure 8: LSTM hybrid architecture with bidirectional LSTM layers for temporal features and separate encoding for static patient features.

![Refer to caption](images/tcn_hybrid_architecture.png)

Figure 9: TCN hybrid architecture with dilated causal convolutions (dilation factors: 1, 2, 4) for temporal features and parallel processing for static features. The temporal features composition is identical to the LSTM architecture.
