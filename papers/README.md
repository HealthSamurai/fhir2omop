# FHIR & OMOP arXiv Papers — Index

Generated: 2026-05-09 • Source query: `all:OMOP` (33 papers).

Papers explicitly mentioning **both FHIR and OMOP** (strict `all:FHIR AND all:OMOP` query) are marked **[FHIR+OMOP]**.

Layout: `papers/<arxiv-id>/pdf/<arxiv-id>.pdf`. Structured metadata in [`index.json`](index.json).

---

## By date (newest first)

### 2026-04-27 · [2604.24572](2604.24572/pdf/2604.24572.pdf)
**FastOMOP: A Foundational Architecture for Reliable Agentic Real-World Evidence Generation on OMOP CDM data**

*Niko Moeller-Grell, Shihao Shenzhang, Zhangshu Joshua Jiang, et al.* · [arXiv](https://arxiv.org/abs/2604.24572v1)

> The Observational Medical Outcomes Partnership Common Data Model (OMOP CDM), maintained by the Observational Health Data Sciences and Informatics (OHDSI) collaboration, enabled the harmonisation of electronic health records data of nearly one billion patients in 83 countries. Yet generating real-world evidence (RWE) from these repositories remains a manual process requiring clinical, epidemiological and technical expertise. LLMs and multi-agent systems have shown promise for clinical tasks, but RWE automation exposes a fundamental challenge: agentic systems introduce emergent behaviours, coord…

### 2026-02-11 · [2602.11223](2602.11223/pdf/2602.11223.pdf) **[FHIR+OMOP]**
**Patient Digital Twins for Chronic Care: Technical Hurdles, Lessons Learned, and the Road Ahead**

*Micheal P. Papazoglou, Bernd J. Krämer, Mira Raheem, et al.* · [arXiv](https://arxiv.org/abs/2602.11223v1)

> Chronic diseases constitute the principal burden of morbidity, mortality, and healthcare costs worldwide, yet current health systems remain fragmented and predominantly reactive. Patient Medical Digital Twins (PMDTs) offer a paradigm shift: holistic, continuously updated digital counterparts of patients that integrate clinical, genomic, lifestyle, and quality-of-life data. We report early implementations of PMDTs via ontology-driven modeling and federated analytics pilots. Insights from the QUALITOP oncology study and a distributed AI platform confirm both feasibility and challenges: aligning …

### 2025-12-01 · [2512.03098](2512.03098/pdf/2512.03098.pdf) **[FHIR+OMOP]**
**An AI Implementation Science Study to Improve Trustworthy Data in a Large Healthcare System**

*Benoit L. Marteau, Andrew Hornback, Shaun Q. Tan, et al.* · [arXiv](https://arxiv.org/abs/2512.03098v2)

> The rapid growth of Artificial Intelligence (AI) in healthcare has sparked interest in Trustworthy AI and AI Implementation Science, both of which are essential for accelerating clinical adoption. However, strict regulations, gaps between research and clinical settings, and challenges in evaluating AI systems continue to hinder real-world implementation. This study presents an AI implementation case study within Shriners Childrens (SC), a large multisite pediatric system, showcasing the modernization of SCs Research Data Warehouse (RDW) to OMOP CDM v5.4 within a secure Microsoft Fabric environ…

### 2025-11-25 · [2511.20285](2511.20285/pdf/2511.20285.pdf)
**Schema Matching on Graph: Iterative Graph Exploration for Efficient and Explainable Data Integration**

*Mingyu Jeon, Jaeyoung Suh, Suwan Cho* · [arXiv](https://arxiv.org/abs/2511.20285v2)

> Schema matching is a critical task in data integration, particularly in the medical domain where disparate Electronic Health Record (EHR) systems must be aligned to standard models like OMOP CDM. While Large Language Models (LLMs) have shown promise in schema matching, they suffer from hallucination and lack of up-to-date domain knowledge. Knowledge Graphs (KGs) offer a solution by providing structured, verifiable knowledge. However, existing KG-augmented LLM approaches often rely on inefficient complex multi-hop queries or storage-intensive vector-based retrieval methods. This paper introduce…

### 2025-11-20 · [2511.21724](2511.21724/pdf/2511.21724.pdf)
**AD-CDO: A Lightweight Ontology for Representing Eligibility Criteria in Alzheimer's Disease Clinical Trials**

*Zenan Sun, Rashmie Abeysinghe, Xiaojin Li, et al.* · [arXiv](https://arxiv.org/abs/2511.21724v1)

> Objective This study introduces the Alzheimer's Disease Common Data Element Ontology for Clinical Trials (AD-CDO), a lightweight, semantically enriched ontology designed to represent and standardize key eligibility criteria concepts in Alzheimer's disease (AD) clinical trials. Materials and Methods We extracted high-frequency concepts from more than 1,500 AD clinical trials on ClinicalTrials.gov and organized them into seven semantic categories: Disease, Medication, Diagnostic Test, Procedure, Social Determinants of Health, Rating Criteria, and Fertility. Each concept was annotated with standa…

### 2025-11-12 · [2511.09017](2511.09017/pdf/2511.09017.pdf)
**OMOP ETL Framework for Semi-Structured Health Data**

*Jacob Desmond, Ryan Wartmann, Chng Wei Lau, et al.* · [arXiv](https://arxiv.org/abs/2511.09017v1)

> Healthcare data are generated in many different formats, which makes it difficult to integrate and reuse across institutions and studies. Standardisation is required to enable consistent large-scale analysis. The OMOP-CDM, developed by the OHDSI community, provides one widely adopted standard. Our framework achieves schema-agnostic transformation by extending upon existing literature in using human-readable YAML specification to support both relational (Microsoft SQL Server (MSSQL)) and document-based (MongoDB) data sources. It also incorporates critical production readiness features: provenan…

### 2025-11-12 · [2511.09337](2511.09337/pdf/2511.09337.pdf)
**TempoQL: A Readable, Precise, and Portable Query System for Electronic Health Record Data**

*Ziyong Ma, Richard D. Boyce, Adam Perer, et al.* · [arXiv](https://arxiv.org/abs/2511.09337v1)

> Electronic health record (EHR) data is an essential data source for machine learning for health, but researchers and clinicians face steep barriers in extracting and validating EHR data for modeling. Existing tools incur trade-offs between expressivity and usability and are typically specialized to a single data standard, making it difficult to write temporal queries that are ready for modern model-building pipelines and adaptable to new datasets. This paper introduces TempoQL, a Python-based toolkit designed to lower these barriers. TempoQL provides a simple, human-readable language for tempo…

### 2025-11-04 · [2511.02340](2511.02340/pdf/2511.02340.pdf)
**Chronic Kidney Disease Prognosis Prediction Using Transformer**

*Yohan Lee, DongGyun Kang, SeHoon Park, et al.* · [arXiv](https://arxiv.org/abs/2511.02340v2)

> Chronic Kidney Disease (CKD) affects nearly 10\% of the global population and often progresses to end-stage renal failure. Accurate prognosis prediction is vital for timely interventions and resource optimization. We present a transformer-based framework for predicting CKD progression using multi-modal electronic health records (EHR) from the Seoul National University Hospital OMOP Common Data Model. Our approach (\textbf{ProQ-BERT}) integrates demographic, clinical, and laboratory data, employing quantization-based tokenization for continuous lab values and attention mechanisms for interpreta…

### 2025-09-10 · [2509.08247](2509.08247/pdf/2509.08247.pdf)
**The CRITICAL Records Integrated Standardization Pipeline (CRISP): End-to-End Processing of Large-scale Multi-institutional OMOP CDM Data**

*Xiaolong Luo, Michael Lingzhi Li* · [arXiv](https://arxiv.org/abs/2509.08247v2)

> While existing critical care EHR datasets such as MIMIC and eICU have enabled significant advances in clinical AI research, the CRITICAL dataset opens new frontiers by providing extensive scale and diversity -- containing 1.95 billion records from 371,365 patients across four geographically diverse CTSA institutions. CRITICAL's unique strength lies in capturing full-spectrum patient journeys, including pre-ICU, ICU, and post-ICU encounters across both inpatient and outpatient settings. This multi-institutional, longitudinal perspective creates transformative opportunities for developing genera…

### 2025-09-04 · [2509.03828](2509.03828/pdf/2509.03828.pdf)
**An Agentic Model Context Protocol Framework for Medical Concept Standardization**

*Jaerong Ahn, Andrew Wen, Nan Wang, et al.* · [arXiv](https://arxiv.org/abs/2509.03828v1)

> The Observational Medical Outcomes Partnership (OMOP) common data model (CDM) provides a standardized representation of heterogeneous health data to support large-scale, multi-institutional research. One critical step in data standardization using OMOP CDM is the mapping of source medical terms to OMOP standard concepts, a procedure that is resource-intensive and error-prone. While large language models (LLMs) have the potential to facilitate this process, their tendency toward hallucination makes them unsuitable for clinical deployment without training and expert validation. Here, we develope…

### 2025-07-18 · [2507.14376](2507.14376/pdf/2507.14376.pdf)
**Schemora: schema matching via multi-stage recommendation and metadata enrichment using off-the-shelf llms**

*Osman Erman Gungor, Derak Paulsen, William Kang* · [arXiv](https://arxiv.org/abs/2507.14376v1)

> Schema matching is essential for integrating heterogeneous data sources and enhancing dataset discovery, yet it remains a complex and resource-intensive problem. We introduce SCHEMORA, a schema matching framework that combines large language models with hybrid retrieval techniques in a prompt-based approach, enabling efficient identification of candidate matches without relying on labeled training data or exhaustive pairwise comparisons. By enriching schema metadata and leveraging both vector-based and lexical retrieval, SCHEMORA improves matching accuracy and scalability. Evaluated on the MIM…

### 2025-07-03 · [2507.03067](2507.03067/pdf/2507.03067.pdf) **[FHIR+OMOP]**
**Large Language Models for Automating Clinical Data Standardization: HL7 FHIR Use Case**

*Alvaro Riquelme, Pedro Costa, Catalina Martinez* · [arXiv](https://arxiv.org/abs/2507.03067v1)

> For years, semantic interoperability standards have sought to streamline the exchange of clinical data, yet their deployment remains time-consuming, resource-intensive, and technically challenging. To address this, we introduce a semi-automated approach that leverages large language models specifically GPT-4o and Llama 3.2 405b to convert structured clinical datasets into HL7 FHIR format while assessing accuracy, reliability, and security. Applying our method to the MIMIC-IV database, we combined embedding techniques, clustering algorithms, and semantic retrieval to craft prompts that guide th…

### 2025-05-14 · [2505.09794](2505.09794/pdf/2505.09794.pdf)
**Automated Detection of Clinical Entities in Lung and Breast Cancer Reports Using NLP Techniques**

*J. Moreno-Casanova, J. M. Auñón, A. Mártinez-Pérez, et al.* · [arXiv](https://arxiv.org/abs/2505.09794v1)

> Research projects, including those focused on cancer, rely on the manual extraction of information from clinical reports. This process is time-consuming and prone to errors, limiting the efficiency of data-driven approaches in healthcare. To address these challenges, Natural Language Processing (NLP) offers an alternative for automating the extraction of relevant data from electronic health records (EHRs). In this study, we focus on lung and breast cancer due to their high incidence and the significant impact they have on public health. Early detection and effective data management in both typ…

### 2025-05-07 · [2505.04728](2505.04728/pdf/2505.04728.pdf)
**Data Standards in Audiology: A Mixed-Methods Exploration of Community Perspectives and Implementation Considerations**

*Charlotte Vercammen, Antje Heinrich, Christophe Lesimple, et al.* · [arXiv](https://arxiv.org/abs/2505.04728v4)

> Objective: This study addresses conceptual issues around data standardisation in audiology, and outlines steps toward achieving it. It reports a survey of the computational audiology community on their current understanding, needs, and preferences concerning data standards. Based on survey findings and a panel discussion, recommendations are made concerning moving forward with standardisation in audiology. Design: Mixed-methods: 1) review of existing standardisation efforts; 2) a survey of the computational audiology community; 3) expert panel discussion in a dedicated session at the 2024 Virt…

### 2025-04-11 · [2504.08329](2504.08329/pdf/2504.08329.pdf)
**MedRep: Medical Concept Representation for General Electronic Health Record Foundation Models**

*Junmo Kim, Namkyeong Lee, Jiwon Kim, et al.* · [arXiv](https://arxiv.org/abs/2504.08329v3)

> Electronic health record (EHR) foundation models have been an area ripe for exploration with their improved performance in various medical tasks. Despite the rapid advances, there exists a fundamental limitation: Processing unseen medical codes out of vocabulary. This problem limits the generalizability of EHR foundation models and the integration of models trained with different vocabularies. To alleviate this problem, we propose a set of novel medical concept representations (MedRep) for EHR foundation models based on the observational medical outcome partnership (OMOP) common data model (CD…

### 2024-10-07 · [2410.05046](2410.05046/pdf/2410.05046.pdf)
**Named Clinical Entity Recognition Benchmark**

*Wadood M Abdul, Marco AF Pimentel, Muhammad Umar Salman, et al.* · [arXiv](https://arxiv.org/abs/2410.05046v1)

> This technical report introduces a Named Clinical Entity Recognition Benchmark for evaluating language models in healthcare, addressing the crucial natural language processing (NLP) task of extracting structured information from clinical narratives to support applications like automated coding, clinical trial cohort identification, and clinical decision support. The leaderboard provides a standardized platform for assessing diverse language models, including encoder and decoder architectures, on their ability to identify and classify clinical entities across multiple medical domains. A curated…

### 2024-10-04 · [2410.09076](2410.09076/pdf/2410.09076.pdf)
**Llettuce: An Open Source Natural Language Processing Tool for the Translation of Medical Terms into Uniform Clinical Encoding**

*James Mitchell-White, Reza Omdivar, Benjamin Partridge, et al.* · [arXiv](https://arxiv.org/abs/2410.09076v2)

> This paper introduces Llettuce, an open-source tool designed to address the complexities of converting medical terms into OMOP standard concepts. Unlike existing solutions such as the Athena database search and Usagi, which struggle with semantic nuances and require substantial manual input, Llettuce leverages advanced natural language processing, including large language models and fuzzy matching, to automate and enhance the mapping process. Developed with a focus on GDPR compliance, Llettuce can be deployed locally, ensuring data protection while maintaining high performance in converting in…

### 2024-08-03 · [2408.01869](2408.01869/pdf/2408.01869.pdf)
**MALADE: Orchestration of LLM-powered Agents with Retrieval Augmented Generation for Pharmacovigilance**

*Jihye Choi, Nils Palumbo, Prasad Chalasani, et al.* · [arXiv](https://arxiv.org/abs/2408.01869v1)

> In the era of Large Language Models (LLMs), given their remarkable text understanding and generation abilities, there is an unprecedented opportunity to develop new, LLM-based methods for trustworthy medical knowledge synthesis, extraction and summarization. This paper focuses on the problem of Pharmacovigilance (PhV), where the significance and challenges lie in identifying Adverse Drug Events (ADEs) from diverse text sources, such as medical literature, clinical notes, and drug labels. Unfortunately, this task is hindered by factors including variations in the terminologies of drugs and outc…

### 2024-06-24 · [2406.16341](2406.16341/pdf/2406.16341.pdf)
**EHRCon: Dataset for Checking Consistency between Unstructured Notes and Structured Tables in Electronic Health Records**

*Yeonsu Kwon, Jiho Kim, Gyubok Lee, et al.* · [arXiv](https://arxiv.org/abs/2406.16341v2)

> Electronic Health Records (EHRs) are integral for storing comprehensive patient medical records, combining structured data (e.g., medications) with detailed clinical notes (e.g., physician notes). These elements are essential for straightforward data retrieval and provide deep, contextual insights into patient care. However, they often suffer from discrepancies due to unintuitive EHR system designs and human errors, posing serious risks to patient safety. To address this, we developed EHRCon, a new dataset and task specifically designed to ensure data consistency between structured tables and …

### 2024-02-06 · [2402.04400](2402.04400/pdf/2402.04400.pdf)
**CEHR-GPT: Generating Electronic Health Records with Chronological Patient Timelines**

*Chao Pang, Xinzhuo Jiang, Nishanth Parameshwar Pavinkurve, et al.* · [arXiv](https://arxiv.org/abs/2402.04400v2)

> Synthetic Electronic Health Records (EHR) have emerged as a pivotal tool in advancing healthcare applications and machine learning models, particularly for researchers without direct access to healthcare data. Although existing methods, like rule-based approaches and generative adversarial networks (GANs), generate synthetic data that resembles real-world EHR data, these methods often use a tabular format, disregarding temporal dependencies in patient histories and limiting data replication. Recently, there has been a growing interest in leveraging Generative Pre-trained Transformers (GPT) for…

### 2023-09-22 · [2309.13175](2309.13175/pdf/2309.13175.pdf)
**American Family Cohort, a data resource description**

*Deepa Balraj, Ayin Vala, Shiying Hao, et al.* · [arXiv](https://arxiv.org/abs/2309.13175v1)

> This manuscript is a research resource description and presents a large and novel Electronic Health Records (EHR) data resource, American Family Cohort (AFC). The AFC data is derived from Centers for Medicare and Medicaid Services (CMS) certified American Board of Family Medicine (ABFM) PRIME registry. The PRIME registry is the largest national Qualified Clinical Data Registry (QCDR) for Primary Care. The data is converted to a popular common data model, the Observational Health Data Sciences and Informatics (OHDSI) Observational Medical Outcomes Partnership (OMOP) Common Data Model (CDM). The…

### 2023-04-12 · [2304.05929](2304.05929/pdf/2304.05929.pdf)
**ReDWINE: A Clinical Datamart with Text Analytical Capabilities to Facilitate Rehabilitation Research**

*David Oniani, Bambang Parmanto, Andi Saptono, et al.* · [arXiv](https://arxiv.org/abs/2304.05929v1)

> Rehabilitation research focuses on determining the components of a treatment intervention, the mechanism of how these components lead to recovery and rehabilitation, and ultimately the optimal intervention strategies to maximize patients' physical, psychologic, and social functioning. Traditional randomized clinical trials that study and establish new interventions face several challenges, such as high cost and time commitment. Observational studies that use existing clinical data to observe the effect of an intervention have shown several advantages over RCTs. Electronic Health Records (EHRs)…

### 2022-09-10 · [2209.04732](2209.04732/pdf/2209.04732.pdf)
**Ontologizing Health Systems Data at Scale: Making Translational Discovery a Reality**

*Tiffany J. Callahan, Adrianne L. Stefanski, Jordan M. Wyrwa, et al.* · [arXiv](https://arxiv.org/abs/2209.04732v2)

> Background: Common data models solve many challenges of standardizing electronic health record (EHR) data, but are unable to semantically integrate all the resources needed for deep phenotyping. Open Biological and Biomedical Ontology (OBO) Foundry ontologies provide computable representations of biological knowledge and enable the integration of heterogeneous data. However, mapping EHR data to OBO ontologies requires significant manual curation and domain expertise. Objective: We introduce OMOP2OBO, an algorithm for mapping Observational Medical Outcomes Partnership (OMOP) vocabularies to OBO…

### 2022-05-01 · [2205.02933](2205.02933/pdf/2205.02933.pdf)
**Temporal Events Detector for Pregnancy Care (TED-PC): A Rule-based Algorithm to Infer Gestational Age and Delivery Date from Electronic Health Records of Pregnant Women with and without COVID-19**

*Tianchu Lyu, Chen Liang, Jihong Liu, et al.* · [arXiv](https://arxiv.org/abs/2205.02933v1)

> Objective: To develop a rule-based algorithm that detects temporal information of clinical events during pregnancy for women with COVID-19 by inferring gestational weeks and delivery dates from Electronic Health Records (EHR) from the National COVID Cohort Collaborate (N3C). Materials and Methods: The EHR are normalized by the Observational Medical Outcomes Partnership (OMOP) Clinical Data Model (CDM). EHR phenotyping resulted in 270,897 pregnant women (2018-06-01 to 2021-05-31). We developed a rule-based algorithm and performed a multi-level evaluation to test content validity and clinical va…

### 2022-03-19 · [2204.09599](2204.09599/pdf/2204.09599.pdf)
**Radiology Text Analysis System (RadText): Architecture and Evaluation**

*Song Wang, Mingquan Lin, Ying Ding, et al.* · [arXiv](https://arxiv.org/abs/2204.09599v1)

> Analyzing radiology reports is a time-consuming and error-prone task, which raises the need for an efficient automated radiology report analysis system to alleviate the workloads of radiologists and encourage precise diagnosis. In this work, we present RadText, an open-source radiology text analysis system developed by Python. RadText offers an easy-to-use text analysis pipeline, including de-identification, section segmentation, sentence split and word tokenization, named entity recognition, parsing, and negation detection. RadText features a flexible modular design, provides a hybrid text pr…

### 2021-09-16 · [2109.08235](2109.08235/pdf/2109.08235.pdf)
**Integrating Flowsheet Data in OMOP Common Data Model for Clinical Research**

*Tina Seto, Lillian Sung, Jose Posada, et al.* · [arXiv](https://arxiv.org/abs/2109.08235v1)

> Flowsheet data presents unique challenges and opportunities for integration into standardized Common Data Models (CDMs) such as the Observational Medical Outcomes Partnership (OMOP) CDM from the Observational Health Data Sciences and Informatics (OHDSI) program. These data are a potentially rich source of detailed curated health outcomes data such as pain scores, vital signs, lines drains and airways (LDA) and other measurements that can be invaluable in building a robust model of patient health journey during an inpatient stay. We present two approaches to integration of flowsheet measures in…

### 2021-06-24 · [2106.13265](2106.13265/pdf/2106.13265.pdf)
**Disease Progression Modeling Workbench 360**

*Parthasarathy Suryanarayanan, Prithwish Chakraborty, Piyush Madan, et al.* · [arXiv](https://arxiv.org/abs/2106.13265v1)

> In this work we introduce Disease Progression Modeling workbench 360 (DPM360) opensource clinical informatics framework for collaborative research and delivery of healthcare AI. DPM360, when fully developed, will manage the entire modeling life cycle, from data analysis (e.g., cohort identification) to machine learning algorithm development and prototyping. DPM360 augments the advantages of data model standardization and tooling (OMOP-CDM, Athena, ATLAS) provided by the widely-adopted OHDSI initiative with a powerful machine learning training framework, and a mechanism for rapid prototyping th…

### 2020-07-13 · [2007.10286](2007.10286/pdf/2007.10286.pdf)
**COVID-19 SignSym: a fast adaptation of a general clinical NLP tool to identify and normalize COVID-19 signs and symptoms to OMOP common data model**

*Jingqi Wang, Noor Abu-el-rub, Josh Gray, et al.* · [arXiv](https://arxiv.org/abs/2007.10286v4)

> The COVID-19 pandemic swept across the world rapidly, infecting millions of people. An efficient tool that can accurately recognize important clinical concepts of COVID-19 from free text in electronic health records (EHRs) will be valuable to accelerate COVID-19 clinical research. To this end, this study aims at adapting the existing CLAMP natural language processing tool to quickly build COVID-19 SignSym, which can extract COVID-19 signs/symptoms and their 8 attributes (body location, severity, temporal expression, subject, condition, uncertainty, negation, and course) from clinical text. The…

### 2020-07-10 · [2007.05611](2007.05611/pdf/2007.05611.pdf)
**Deep Contextual Clinical Prediction with Reverse Distillation**

*Rohan S. Kodialam, Rebecca Boiarsky, Justin Lim, et al.* · [arXiv](https://arxiv.org/abs/2007.05611v2)

> Healthcare providers are increasingly using machine learning to predict patient outcomes to make meaningful interventions. However, despite innovations in this area, deep learning models often struggle to match performance of shallow linear models in predicting these outcomes, making it difficult to leverage such techniques in practice. In this work, motivated by the task of clinical prediction from insurance claims, we present a new technique called Reverse Distillation which pretrains deep models by using high-performing linear models for initialization. We make use of the longitudinal struc…

### 2019-01-22 · [1901.07601](1901.07601/pdf/1901.07601.pdf)
**CREATE: Cohort Retrieval Enhanced by Analysis of Text from Electronic Health Records using OMOP Common Data Model**

*Sijia Liu, Yanshan Wang, Andrew Wen, et al.* · [arXiv](https://arxiv.org/abs/1901.07601v1)

> Background: Widespread adoption of electronic health records (EHRs) has enabled secondary use of EHR data for clinical research and healthcare delivery. Natural language processing (NLP) techniques have shown promise in their capability to extract the embedded information in unstructured clinical data, and information retrieval (IR) techniques provide flexible and scalable solutions that can augment the NLP systems for retrieving and ranking relevant records. Methods: In this paper, we present the implementation of Cohort Retrieval Enhanced by Analysis of Text from EHRs (CREATE), a cohort retr…

### 2018-07-17 · [1807.06638](1807.06638/pdf/1807.06638.pdf)
**Developing a Portable Natural Language Processing Based Phenotyping System**

*Himanshu Sharma, Chengsheng Mao, Yizhen Zhang, et al.* · [arXiv](https://arxiv.org/abs/1807.06638v1)

> This paper presents a portable phenotyping system that is capable of integrating both rule-based and statistical machine learning based approaches. Our system utilizes UMLS to extract clinically relevant features from the unstructured text and then facilitates portability across different institutions and data systems by incorporating OHDSI's OMOP Common Data Model (CDM) to standardize necessary data elements. Our system can also store the key components of rule-based systems (e.g., regular expression matches) in the format of OMOP CDM, thus enabling the reuse, adaptation and extension of many…

### 2015-11-10 · [1511.03036](1511.03036/pdf/1511.03036.pdf)
**Semantic processing of EHR data for clinical research**

*Hong Sun, Kristof Depraetere, Jos De Roo, et al.* · [arXiv](https://arxiv.org/abs/1511.03036v1)

> There is a growing need to semantically process and integrate clinical data from different sources for clinical research. This paper presents an approach to integrate EHRs from heterogeneous resources and generate integrated data in different data formats or semantics to support various clinical research applications. The proposed approach builds semantic data virtualization layers on top of data sources, which generate data in the requested semantics or formats on demand. This approach avoids upfront dumping to and synchronizing of the data with various representations. Data from different EH…

### 2011-10-04 · [1110.0641](1110.0641/pdf/1110.0641.pdf)
**Identifying relationships between drugs and medical conditions: winning experience in the Challenge 2 of the OMOP 2010 Cup**

*Vladimir Nikulin* · [arXiv](https://arxiv.org/abs/1110.0641v1)

> There is a growing interest in using a longitudinal observational databases to detect drug safety signal. In this paper we present a novel method, which we used online during the OMOP Cup. We consider homogeneous ensembling, which is based on random re-sampling (known, also, as bagging) as a main innovation compared to the previous publications in the related field. This study is based on a very large simulated database of the 10 million patients records, which was created by the Observational Medical Outcomes Partnership (OMOP). Compared to the traditional classification problem, the given da…

---

## Quick table

| Date | arXiv ID | Title |
|---|---|---|
| 2026-04-27 | [2604.24572](2604.24572/pdf/2604.24572.pdf) | FastOMOP: A Foundational Architecture for Reliable Agentic Real-World Evidence Generation on OMOP CDM data |
| 2026-02-11 | [2602.11223](2602.11223/pdf/2602.11223.pdf) | Patient Digital Twins for Chronic Care: Technical Hurdles, Lessons Learned, and the Road Ahead **[FHIR+OMOP]** |
| 2025-12-01 | [2512.03098](2512.03098/pdf/2512.03098.pdf) | An AI Implementation Science Study to Improve Trustworthy Data in a Large Healthcare System **[FHIR+OMOP]** |
| 2025-11-25 | [2511.20285](2511.20285/pdf/2511.20285.pdf) | Schema Matching on Graph: Iterative Graph Exploration for Efficient and Explainable Data Integration |
| 2025-11-20 | [2511.21724](2511.21724/pdf/2511.21724.pdf) | AD-CDO: A Lightweight Ontology for Representing Eligibility Criteria in Alzheimer's Disease Clinical Trials |
| 2025-11-12 | [2511.09017](2511.09017/pdf/2511.09017.pdf) | OMOP ETL Framework for Semi-Structured Health Data |
| 2025-11-12 | [2511.09337](2511.09337/pdf/2511.09337.pdf) | TempoQL: A Readable, Precise, and Portable Query System for Electronic Health Record Data |
| 2025-11-04 | [2511.02340](2511.02340/pdf/2511.02340.pdf) | Chronic Kidney Disease Prognosis Prediction Using Transformer |
| 2025-09-10 | [2509.08247](2509.08247/pdf/2509.08247.pdf) | The CRITICAL Records Integrated Standardization Pipeline (CRISP): End-to-End Processing of Large-scale Multi-institutional OMOP CDM Data |
| 2025-09-04 | [2509.03828](2509.03828/pdf/2509.03828.pdf) | An Agentic Model Context Protocol Framework for Medical Concept Standardization |
| 2025-07-18 | [2507.14376](2507.14376/pdf/2507.14376.pdf) | Schemora: schema matching via multi-stage recommendation and metadata enrichment using off-the-shelf llms |
| 2025-07-03 | [2507.03067](2507.03067/pdf/2507.03067.pdf) | Large Language Models for Automating Clinical Data Standardization: HL7 FHIR Use Case **[FHIR+OMOP]** |
| 2025-05-14 | [2505.09794](2505.09794/pdf/2505.09794.pdf) | Automated Detection of Clinical Entities in Lung and Breast Cancer Reports Using NLP Techniques |
| 2025-05-07 | [2505.04728](2505.04728/pdf/2505.04728.pdf) | Data Standards in Audiology: A Mixed-Methods Exploration of Community Perspectives and Implementation Considerations |
| 2025-04-11 | [2504.08329](2504.08329/pdf/2504.08329.pdf) | MedRep: Medical Concept Representation for General Electronic Health Record Foundation Models |
| 2024-10-07 | [2410.05046](2410.05046/pdf/2410.05046.pdf) | Named Clinical Entity Recognition Benchmark |
| 2024-10-04 | [2410.09076](2410.09076/pdf/2410.09076.pdf) | Llettuce: An Open Source Natural Language Processing Tool for the Translation of Medical Terms into Uniform Clinical Encoding |
| 2024-08-03 | [2408.01869](2408.01869/pdf/2408.01869.pdf) | MALADE: Orchestration of LLM-powered Agents with Retrieval Augmented Generation for Pharmacovigilance |
| 2024-06-24 | [2406.16341](2406.16341/pdf/2406.16341.pdf) | EHRCon: Dataset for Checking Consistency between Unstructured Notes and Structured Tables in Electronic Health Records |
| 2024-02-06 | [2402.04400](2402.04400/pdf/2402.04400.pdf) | CEHR-GPT: Generating Electronic Health Records with Chronological Patient Timelines |
| 2023-09-22 | [2309.13175](2309.13175/pdf/2309.13175.pdf) | American Family Cohort, a data resource description |
| 2023-04-12 | [2304.05929](2304.05929/pdf/2304.05929.pdf) | ReDWINE: A Clinical Datamart with Text Analytical Capabilities to Facilitate Rehabilitation Research |
| 2022-09-10 | [2209.04732](2209.04732/pdf/2209.04732.pdf) | Ontologizing Health Systems Data at Scale: Making Translational Discovery a Reality |
| 2022-05-01 | [2205.02933](2205.02933/pdf/2205.02933.pdf) | Temporal Events Detector for Pregnancy Care (TED-PC): A Rule-based Algorithm to Infer Gestational Age and Delivery Date from Electronic Health Records of Pregnant Women with and without COVID-19 |
| 2022-03-19 | [2204.09599](2204.09599/pdf/2204.09599.pdf) | Radiology Text Analysis System (RadText): Architecture and Evaluation |
| 2021-09-16 | [2109.08235](2109.08235/pdf/2109.08235.pdf) | Integrating Flowsheet Data in OMOP Common Data Model for Clinical Research |
| 2021-06-24 | [2106.13265](2106.13265/pdf/2106.13265.pdf) | Disease Progression Modeling Workbench 360 |
| 2020-07-13 | [2007.10286](2007.10286/pdf/2007.10286.pdf) | COVID-19 SignSym: a fast adaptation of a general clinical NLP tool to identify and normalize COVID-19 signs and symptoms to OMOP common data model |
| 2020-07-10 | [2007.05611](2007.05611/pdf/2007.05611.pdf) | Deep Contextual Clinical Prediction with Reverse Distillation |
| 2019-01-22 | [1901.07601](1901.07601/pdf/1901.07601.pdf) | CREATE: Cohort Retrieval Enhanced by Analysis of Text from Electronic Health Records using OMOP Common Data Model |
| 2018-07-17 | [1807.06638](1807.06638/pdf/1807.06638.pdf) | Developing a Portable Natural Language Processing Based Phenotyping System |
| 2015-11-10 | [1511.03036](1511.03036/pdf/1511.03036.pdf) | Semantic processing of EHR data for clinical research |
| 2011-10-04 | [1110.0641](1110.0641/pdf/1110.0641.pdf) | Identifying relationships between drugs and medical conditions: winning experience in the Challenge 2 of the OMOP 2010 Cup |
