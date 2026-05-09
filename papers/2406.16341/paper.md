# EHRCon: Dataset for Checking Consistency between Unstructured Notes and Structured Tables in Electronic Health Records

- arXiv: [2406.16341v1](https://arxiv.org/abs/2406.16341v2)
- Published: 2024-06-24
- Source: `https://arxiv.org/html/2406.16341v1`

---
# EHRCon: Dataset for Checking Consistency between Unstructured Notes and Structured Tables in Electronic Health Records

Yeonsu Kwon1 , Jiho Kim111footnotemark: 1 , Gyubok Lee1, Seongsu Bae1, Daeun Kyung1,  
Wonchul Cha2, Tom Pollard3, Alistair Johnson4, Edward Choi1  
KAIST1   Samsung Medical Center2   MIT3   University of Toronto4  
{yeonsu.k, jiho.kim, edwardchoi}@kaist.ac.kr These authors contributed equally

###### Abstract

Electronic Health Records (EHRs) are integral for storing comprehensive patient medical records, combining structured data (e.g., medications) with detailed clinical notes (e.g., physician notes). These elements are essential for straightforward data retrieval and provide deep, contextual insights into patient care. However, they often suffer from discrepancies due to unintuitive EHR system designs and human errors, posing serious risks to patient safety. To address this, we developed EHRCon, a new dataset and task specifically designed to ensure data consistency between structured tables and unstructured notes in EHRs. EHRCon was crafted in collaboration with healthcare professionals using the MIMIC-III EHR dataset, and includes manual annotations of 3,943 entities across 105 clinical notes checked against database entries for consistency. EHRCon has two versions, one using the original MIMIC-III schema, and another using the OMOP CDM schema, in order to increase its applicability and generalizability. Furthermore, leveraging the capabilities of large language models, we introduce CheckEHR, a novel framework for verifying the consistency between clinical notes and database tables. CheckEHR utilizes an eight-stage process and shows promising results in both few-shot and zero-shot settings. The code is available at [https://github.com/dustn1259/EHRCon](https://github.com/dustn1259/EHRCon).

## 1 Introduction

Electronic Health Records (EHRs) are digital datasets comprising the rich information of a patient’s medical history within hospitals. These records integrate both structured data (e.g., medications, diagnoses) and detailed clinical notes (e.g., physician notes). The structured data facilitates straightforward retrieval and analysis of essential information, while clinical notes provide in-depth, contextual insights into the patient’s condition. These two forms of data are interconnected and provide complementary information throughout the diagnostic and treatment processes. For example, a practitioner might start by reviewing test results stored in the database, then determine a diagnosis and formulate a treatment plan, which are documented in the clinical notes. These notes are subsequently used to update the structured data in the database.

However, inconsistencies can arise between the two sets of data for several reasons. One primary issue is that EHR interfaces are often designed with a focus on administrative and financial tasks, which makes it difficult to accurately document clinical information \[[32](https://arxiv.org/html/2406.16341v1#bib.bib32)\]. Additionally, overburdened practitioners might unintentionally introduce errors by importing incorrect medication lists, copying and pasting outdated records, or entering inaccurate test results \[[4](https://arxiv.org/html/2406.16341v1#bib.bib4), [24](https://arxiv.org/html/2406.16341v1#bib.bib24), [38](https://arxiv.org/html/2406.16341v1#bib.bib38)\]. These errors can lead to significant discrepancies between the structured data and clinical notes in the EHR, potentially jeopardizing patient safety and leading to legal complications \[[3](https://arxiv.org/html/2406.16341v1#bib.bib3)\].

![Refer to caption](x1.png)

Figure 1: Examples of consistent and inconsistent data between clinical notes and EHR tables: An inconsistent example (datetime) is when a clinical note records an HR (abbreviation for heart rate) of 167 on “2022-02-02” but the EHR table shows the same HR on “2022-02-06”. A consistent example is when both the clinical note and the EHR table document the administration of Atorvastatin with matching drug name, dosage, and unit. Another example of inconsistency occurs when a clinical note mentions a hypertension diagnosis, but the EHR table lacks this information.

Manual scrutiny of these records is both time-intensive and costly, underscoring the necessity for automated interventions. Despite the need for automated systems, previous studies on consistency check between tables and text have primarily focused on single claims and small-scale single tables \[[1](https://arxiv.org/html/2406.16341v1#bib.bib1), [7](https://arxiv.org/html/2406.16341v1#bib.bib7), [8](https://arxiv.org/html/2406.16341v1#bib.bib8), [35](https://arxiv.org/html/2406.16341v1#bib.bib35)\]. These approaches are not designed for the complex and large-scale nature of EHRs, which require more comprehensive and scalable solutions.

To this end, we propose a new task and dataset called EHRCon, which is designed to verify the consistency between clinical notes and large-scale relational databases in EHRs. We collaborated closely with practitioners111EHR technician, nurse, and emergency medicine specialist with over 15 years of experience to design labeling instructions based on their insights and expertise, authentically reflecting real hospital environments. Based on these labeling instructions, trained human annotators used the MIMIC-III EHR dataset \[[15](https://arxiv.org/html/2406.16341v1#bib.bib15)\] to manually compare 3,943 entities mentioned in 105 clinical notes against corresponding table contents, annotating them for Consistent or Inconsistent as illustrated in Figure [1](https://arxiv.org/html/2406.16341v1#S1.F1 "Figure 1 ‣ 1 Introduction ‣ EHRCon: Dataset for Checking Consistency between Unstructured Notes and Structured Tables in Electronic Health Records"). Our dataset also offers interpretability by including detailed information about the specific tables and columns where inconsistencies occurred. Moreover, it contains two versions, one based on the original MIMIC-III schema, and another based on its OMOP CDM \[[34](https://arxiv.org/html/2406.16341v1#bib.bib34)\] implementation, allowing us to incorporate various schema types and enhance the generalizability.

Additionally, we introduce CheckEHR, a framework that leverages the reasoning capabilities of large language models (LLMs) to verify consistency between clinical notes and tables in EHRs. CheckEHR comprises eight sequential stages, enabling it to address complex tasks in both few-shot and zero-shot settings. Experimental results indicate that in a few-shot setting, our framework achieves a recall performance of 61.06% on MIMIC-III and 54.36% on OMOP. In a zero-shot setting, it achieves a recall performance of 52.39% on MIMIC-III. Additionally, we conduct comprehensive ablation studies to thoroughly analyze the contributions of each component within CheckEHR.

## 2 Related Works

Consistency Check  Fact verification involves assessing the truthfulness of claims by comparing them to evidence \[[13](https://arxiv.org/html/2406.16341v1#bib.bib13), [18](https://arxiv.org/html/2406.16341v1#bib.bib18), [23](https://arxiv.org/html/2406.16341v1#bib.bib23), [26](https://arxiv.org/html/2406.16341v1#bib.bib26), [27](https://arxiv.org/html/2406.16341v1#bib.bib27), [28](https://arxiv.org/html/2406.16341v1#bib.bib28), [29](https://arxiv.org/html/2406.16341v1#bib.bib29), [30](https://arxiv.org/html/2406.16341v1#bib.bib30), [31](https://arxiv.org/html/2406.16341v1#bib.bib31), [33](https://arxiv.org/html/2406.16341v1#bib.bib33)\]. This task is similar to ours as it involves checking for consistency between two sets of data. Among the various datasets, those utilizing tables as evidence are particularly relevant. TabFact \[[7](https://arxiv.org/html/2406.16341v1#bib.bib7)\], a prominent dataset for table-based fact verification, focuses on verifying claims by reasoning with Wikipedia tables. Additionally, INFOTABS \[[8](https://arxiv.org/html/2406.16341v1#bib.bib8)\] uses info-boxes from Wikipedia, and SEM-TAB-FACTS \[[35](https://arxiv.org/html/2406.16341v1#bib.bib35)\] utilizes tables from scientific articles. Furthermore, FEVEROUS \[[1](https://arxiv.org/html/2406.16341v1#bib.bib1)\] is a dataset designed to verify claims by reasoning over both text and tables from Wikipedia. While these datasets focus on verifying individual claims with small-scale tables (e.g., most 50 rows), our methodology differs significantly. We handle entire clinical notes where multiple claims must be first recognized, then perform consistency checks against a larger heterogeneous relational database (i.e., 13 tables each with up to 330M rows). This requires a more comprehensive and scalable solution for fact verification. Consequently, our work extends beyond previous studies, presenting a novel task in the field of Natural Language Processing (NLP) as well as healthcare.

Compositional Reasoning  Large Language Models (LLMs) \[[2](https://arxiv.org/html/2406.16341v1#bib.bib2), [6](https://arxiv.org/html/2406.16341v1#bib.bib6), [20](https://arxiv.org/html/2406.16341v1#bib.bib20), [21](https://arxiv.org/html/2406.16341v1#bib.bib21)\] have demonstrated remarkable abilities in handling a wide range of tasks with just a few examples in the prompts (i.e., in-context learning). However, some complex tasks remain challenging when tackled through in-context learning alone. To address these challenges, researchers have developed methods to break down complex problems into smaller, more manageable sub-tasks \[[16](https://arxiv.org/html/2406.16341v1#bib.bib16), [19](https://arxiv.org/html/2406.16341v1#bib.bib19), [39](https://arxiv.org/html/2406.16341v1#bib.bib39)\]. These decomposition techniques have also been applied to tasks that involve reasoning from structured data \[[12](https://arxiv.org/html/2406.16341v1#bib.bib12), [17](https://arxiv.org/html/2406.16341v1#bib.bib17), [36](https://arxiv.org/html/2406.16341v1#bib.bib36)\]. One significant development is StructGPT \[[12](https://arxiv.org/html/2406.16341v1#bib.bib12)\], which enables LLMs to gather evidence and reason using structured data to answer questions. Inspired by these decomposition techniques, CheckEHR improves the accuracy and efficiency of consistency checks between clinical notes and tables, effectively overcoming the limitations of in-context learning methods.

## 3 EHRCon

EHRCon includes annotations for 3,943 entities extracted from 105 randomly selected clinical notes, evaluated against 13 tables within the MIMIC-III database \[[15](https://arxiv.org/html/2406.16341v1#bib.bib15)\].222Although MIMIC-IV \[[14](https://arxiv.org/html/2406.16341v1#bib.bib14)\] is more recent than MIMIC-III, we use MIMIC-III in this work because MIMIC-IV lacks diverse note types (such as physician notes and nursing notes), and is missing all dates in notes for de-identification, as opposed to shifting the dates in MIMIC-III notes. MIMIC-III contains data from approximately 40,000 ICU patients treated at Beth Israel Deaconess Medical Center between 2001 and 2012, encompassing both structured information and textual records. To enhance standardization, we also utilize the Observational Medical Outcomes Partnership (OMOP) Common Data Model (CDM)333https://www.ohdsi.org/data-standardization/ version of MIMIC-III. OMOP CDM, a publicly developed data standard designed to unify the format and content of observational data for efficient and reliable biomedical research. In this regard, developing the OMOP version of EHRCon will be highly beneficial for future research scalability. In this section, we detail the process of designing the labeling instructions (Sec. [3.1](https://arxiv.org/html/2406.16341v1#S3.SS1 "3.1 Labeling Instructions ‣ 3 EHRCon ‣ EHRCon: Dataset for Checking Consistency between Unstructured Notes and Structured Tables in Electronic Health Records")), and labeling the dataset (Sec. [3.3](https://arxiv.org/html/2406.16341v1#S3.SS3 "3.3 Annotation Process ‣ 3 EHRCon ‣ EHRCon: Dataset for Checking Consistency between Unstructured Notes and Structured Tables in Electronic Health Records")) on MIMIC-III dataset. The labeling for the OMOP CDM version and detailed data preparation steps are provided in Appendix [B](https://arxiv.org/html/2406.16341v1#A2 "Appendix B MIMIC-III and OMOP CDM ‣ EHRCon: Dataset for Checking Consistency between Unstructured Notes and Structured Tables in Electronic Health Records").

### 3.1 Labeling Instructions

To reflect actual hospital environments, practitioners and AI researchers collaboratively designed the labeling instructions. The following are the three important aspects of the labeling instruction, and more detailed instructions can be found in Appendix [C](https://arxiv.org/html/2406.16341v1#A3 "Appendix C Labeling Instructions ‣ EHRCon: Dataset for Checking Consistency between Unstructured Notes and Structured Tables in Electronic Health Records").

Labels   We classify the entities as either Consistent or Inconsistent based on their alignment with the tables. This approach is fundamentally different from traditional fact-checking methods, which typically determine whether claims are Supported or Refuted using texts or tables as definitive evidence. In contrast, in the context of EHR, both tables and clinical notes can contain errors, making it impossible to define one as definitive evidence. Therefore, a more flexible approach is used by labeling them as Consistent or Inconsistent. An entity is labeled as Consistent if all related information, such as values and dates in the note, matches exactly with the tables. Conversely, if even one value differs, it is labeled as Inconsistent.

Definition of Entity Types  We categorized the entities in the notes into two main types for labeling. First, entities with numerical values, such as “WBC 10.0”, are defined as Type 1. Second, entities without values but whose existence can be verified in the database, such as “Vancomycin was started.”, are labeled as Type 2. In our study, we did not label entities with string values because they can be represented in various ways within a database. For example, the phrase “BP was stable.” might be shown in a value column as “Stable” or “Normal”, or it might be indicated by numeric values in the database. This variability can lead to labeling errors. However, to support future research, we included them as Type 3 entities in our dataset, but did not use them in the main experiments.

Time Expression  Clinical notes contain various time expressions, so we manually analyzed the time expressions in these notes (see Appendix [D](https://arxiv.org/html/2406.16341v1#A4 "Appendix D Time Expressions in Clinical Notes ‣ EHRCon: Dataset for Checking Consistency between Unstructured Notes and Structured Tables in Electronic Health Records")). As a result, we found that they can be categorized into three groups: 1) event time written in a standard time format, 2) event time described in a narrative style, and 3) time information of the event not written. When an entity is presented in the standard date and time format (i.e., YYYY-MM-DD, YYYY-MM-DD HH:MM:SS), we validate whether a clinical event occurred exactly at that timestamp. For narrative-style expressions, such as “around the time of patient admission” or “shortly after discharge”, we consider records within the day before and after the specified date to account for the approximate nature of the timing. In cases where no precise time information is provided, we determine the relevant time frame based on the type of the note. For instance, in discharge summaries, we examine the entire admission period, while for physician and nursing notes, we check the records within one day before and after the chart date.

![Refer to caption](x2.png)

Figure 2: Annotation process of EHRCon: The annotation process involves annotators reviewing clinical notes, identifying and classifying entities into Type 1 and Type 2, and extracting relevant information to generate and execute SQL queries. If the SQL queries yield no results, conditions (e.g., value or time) are masked to pinpoint where the inconsistency occurred. When annotators encounter corner cases, they update the labeling instructions through discussion. After all labeling is complete, a post-processing phase is conducted to ensure high-quality data.

### 3.2 Item Search Tool

Clinical notes can include a mix of abbreviations (e.g., Temp vs. Temperature), common names (e.g., White Count vs. White Blood Cells), and brand names (e.g., Tylenol vs. Acetaminophen) depending on the context and the practitioner’s preference. This discrepancy causes issues where the entities noted in the clinical notes do not match exactly with the items in the database. To resolve this, we developed a tool to search for database items related to the note entities.

To create a set E𝐸Eitalic\_E of database items related to the entity e𝑒eitalic\_e, we followed a detailed approach. First, we used the C4-WSRS medical abbreviation dataset \[[25](https://arxiv.org/html/2406.16341v1#bib.bib25)\] to gather a thorough list of abbreviation-full name pairs. Then, we utilized GPT-4 (0613) \[[20](https://arxiv.org/html/2406.16341v1#bib.bib20)\]444In all cases where GPTs were used, the HIPAA-compliant GPT models provided by Azure were used. to extract medication brand names from clinical notes and convert them to their generic names. By combining these methods, we built an extensive set V𝑉Vitalic\_V, which includes abbreviations, full names, brand names, and generic names associated with the entity e𝑒eitalic\_e. Finally, to create the set E𝐸Eitalic\_E, we calculated the bi-gram cosine similarity scores between the elements in V𝑉Vitalic\_V and the items in our database, retrieving those that exceeded a specific threshold.

Table 1: Data statistics of EHRCon.

  Note Type

Entity

Labels

Note

Mean Num

Total Num

Type 1 / 2

Con. / Incon.

Total Num

Mean Length

Discharge Summary

47.81

1,817

1,347 / 470

1,048 / 769

38

2,789

Physician Note

45.00

1,485

1,100 / 385

1,173 / 312

33

1,859

Nursing Note

18.85

641

 494 / 147

503 / 138

34

1,111

Total

37.55

3,943

2,941 / 1,002

2,724 / 1,219

105

1,953 

### 3.3 Annotation Process

In this section, we explain the data annotation process depicted in Figure [2](https://arxiv.org/html/2406.16341v1#S3.F2 "Figure 2 ‣ 3.1 Labeling Instructions ‣ 3 EHRCon ‣ EHRCon: Dataset for Checking Consistency between Unstructured Notes and Structured Tables in Electronic Health Records"). Annotators begin by carefully reviewing the clinical notes, utilizing web searches and discussions with GPT-4 (0613). Through this process, they identify entities and relevant information within the notes. Subsequently, the identified entities are classified into Type 1 and Type 2, as outlined in Sec. [3.1](https://arxiv.org/html/2406.16341v1#S3.SS1 "3.1 Labeling Instructions ‣ 3 EHRCon ‣ EHRCon: Dataset for Checking Consistency between Unstructured Notes and Structured Tables in Electronic Health Records") (Figure [2](https://arxiv.org/html/2406.16341v1#S3.F2 "Figure 2 ‣ 3.1 Labeling Instructions ‣ 3 EHRCon ‣ EHRCon: Dataset for Checking Consistency between Unstructured Notes and Structured Tables in Electronic Health Records")\-(1)). For each entity, annotators use the Item Search Tool (Sec. [3.2](https://arxiv.org/html/2406.16341v1#S3.SS2 "3.2 Item Search Tool ‣ 3 EHRCon ‣ EHRCon: Dataset for Checking Consistency between Unstructured Notes and Structured Tables in Electronic Health Records")) to find the relevant items in the database (Figure [2](https://arxiv.org/html/2406.16341v1#S3.F2 "Figure 2 ‣ 3.1 Labeling Instructions ‣ 3 EHRCon ‣ EHRCon: Dataset for Checking Consistency between Unstructured Notes and Structured Tables in Electronic Health Records")\-(2)). They then select the items and tables associated with the entity. If none of the retrieved items match the entity, the annotators manually find and match the appropriate items. Following this, the annotators extract information related to the entity from the notes (e.g., dates, values, units) and use them to generate SQL queries (Figure [2](https://arxiv.org/html/2406.16341v1#S3.F2 "Figure 2 ‣ 3.1 Labeling Instructions ‣ 3 EHRCon ‣ EHRCon: Dataset for Checking Consistency between Unstructured Notes and Structured Tables in Electronic Health Records")\-(3)). Finally, the annotators execute the generated queries and review the results to label the entity as either Consistent or Inconsistent (Figure [2](https://arxiv.org/html/2406.16341v1#S3.F2 "Figure 2 ‣ 3.1 Labeling Instructions ‣ 3 EHRCon ‣ EHRCon: Dataset for Checking Consistency between Unstructured Notes and Structured Tables in Electronic Health Records")\-(4)). If a query yields no results, the SQL conditions are sequentially masked and executed to pinpoint the source of the inconsistency (Figure [2](https://arxiv.org/html/2406.16341v1#S3.F2 "Figure 2 ‣ 3.1 Labeling Instructions ‣ 3 EHRCon ‣ EHRCon: Dataset for Checking Consistency between Unstructured Notes and Structured Tables in Electronic Health Records")\-(4)-2). Also, when the annotators encounter a corner case that is not addressed in the existing instructions, they update the instructions after thorough discussion (Figure [2](https://arxiv.org/html/2406.16341v1#S3.F2 "Figure 2 ‣ 3.1 Labeling Instructions ‣ 3 EHRCon ‣ EHRCon: Dataset for Checking Consistency between Unstructured Notes and Structured Tables in Electronic Health Records")\-(5)). Upon completing all annotations, the annotators engaged in a post-processing phase to ensure high-quality data. This phase involved additional annotation of entities according to the final labeling instructions, as well as the removal of any misaligned entities (Figure [2](https://arxiv.org/html/2406.16341v1#S3.F2 "Figure 2 ‣ 3.1 Labeling Instructions ‣ 3 EHRCon ‣ EHRCon: Dataset for Checking Consistency between Unstructured Notes and Structured Tables in Electronic Health Records")\-(6)). We implemented additional quality control processes to ensure high-quality. For more details on these processes, see Appendix [11](https://arxiv.org/html/2406.16341v1#footnote11 "footnote 11 ‣ Appendix E Quality Control ‣ EHRCon: Dataset for Checking Consistency between Unstructured Notes and Structured Tables in Electronic Health Records").

### 3.4 Statistics

Inconsistencies Found in Notes  As seen in Table [1](https://arxiv.org/html/2406.16341v1#S3.T1 "Table 1 ‣ 3.2 Item Search Tool ‣ 3 EHRCon ‣ EHRCon: Dataset for Checking Consistency between Unstructured Notes and Structured Tables in Electronic Health Records"), discharge summaries account for a significant portion of inconsistent cases, with 769 out of 1,219 total cases. Unlike nursing and physician notes, which document clinical events as they occur, discharge summaries are written at the time of discharge and summarize major events and treatments. This timing could potentially increase the likelihood of errors. Given the pivotal role discharge summaries play in hospitals such as during inpatient-outpatient transitions \[[5](https://arxiv.org/html/2406.16341v1#bib.bib5)\], inconsistencies in these notes can negatively impact patient care.

Inconsistencies Found in Tables  We found 53.8% of inconsistencies in the labevents table and 17.5% in medication-related tables (e.g., prescriptions). These data are crucial for patient care, and such discrepancies can lead to misdiagnosis and inaccurate medication administration, potentially resulting in patient death \[[9](https://arxiv.org/html/2406.16341v1#bib.bib9), [22](https://arxiv.org/html/2406.16341v1#bib.bib22)\]. Therefore, implementing automated consistency checks is important to ensure data accuracy and consistency.

Inconsistencies Found in Columns  An in-depth analysis revealed that 53.5% of discrepancies are related to time, with 58.85% of these temporal inconsistencies involving a one-hour difference between tables and clinical notes, possibly due to issues in the EHR system \[[37](https://arxiv.org/html/2406.16341v1#bib.bib37)\]. This suggests that the discrepancy could result from not only human but also software issues. For a more detailed analysis, refer to Appendix [F](https://arxiv.org/html/2406.16341v1#A6 "Appendix F Error cases ‣ EHRCon: Dataset for Checking Consistency between Unstructured Notes and Structured Tables in Electronic Health Records").

## 4 CheckEHR

CheckEHR is a novel framework designed to automatically verify the consistency between clinical notes and a relational database. As depicted in Figure [3](https://arxiv.org/html/2406.16341v1#S4.F3 "Figure 3 ‣ 4 CheckEHR ‣ EHRCon: Dataset for Checking Consistency between Unstructured Notes and Structured Tables in Electronic Health Records"), CheckEHR encompasses eight sequential stages: Note Segmentation, Named Entity Recognition (NER), Time Filtering, Table Identification, Pseudo Table Creation, Self Correction, Value Reformatting, and Query Generation. All stages utilize the in-context learning method with a few examples to maximize the reasoning ability of large language models (LLMs). The prompts for each step are included in Appendix [G](https://arxiv.org/html/2406.16341v1#A7 "Appendix G Prompt ‣ EHRCon: Dataset for Checking Consistency between Unstructured Notes and Structured Tables in Electronic Health Records").

![Refer to caption](x3.png)

Figure 3: Overview of CheckEHR. The framework consists of eight distinct stages: Note Segmentation, Named Entity Recognition, Time Filtering, Table Identification, Pseudo Table Creation, Self-Correction, Value Reformatting, and Query Generation.

Note Segmentation   LLMs face significant challenges in processing long clinical notes due to its limitations in handling extensive context lengths. To overcome this challenge, we propose a new scalable method called Note Segmentation, which divides the entire clinical note into smaller sub-texts that each focus on a specific topic. The following outlines the process of creating a set 𝒯𝒯\\mathcal{T}caligraphic\_T, composed of sub-texts from clinical note P𝑃Pitalic\_P. First, the text P𝑃Pitalic\_P is divided into two parts: P0fsuperscriptsubscript𝑃0𝑓P\_{0}^{f}italic\_P start\_POSTSUBSCRIPT 0 end\_POSTSUBSCRIPT start\_POSTSUPERSCRIPT italic\_f end\_POSTSUPERSCRIPT, containing the first l𝑙litalic\_l tokens, and the remaining text, P0bsuperscriptsubscript𝑃0𝑏P\_{0}^{b}italic\_P start\_POSTSUBSCRIPT 0 end\_POSTSUBSCRIPT start\_POSTSUPERSCRIPT italic\_b end\_POSTSUPERSCRIPT. Then, P0fsuperscriptsubscript𝑃0𝑓P\_{0}^{f}italic\_P start\_POSTSUBSCRIPT 0 end\_POSTSUBSCRIPT start\_POSTSUPERSCRIPT italic\_f end\_POSTSUPERSCRIPT is segmented by the LLM into n𝑛nitalic\_n sub-texts, each with its own distinct topic: {P0,1fsuperscriptsubscript𝑃01𝑓P\_{0,1}^{f}italic\_P start\_POSTSUBSCRIPT 0 , 1 end\_POSTSUBSCRIPT start\_POSTSUPERSCRIPT italic\_f end\_POSTSUPERSCRIPT, P0,2fsuperscriptsubscript𝑃02𝑓P\_{0,2}^{f}italic\_P start\_POSTSUBSCRIPT 0 , 2 end\_POSTSUBSCRIPT start\_POSTSUPERSCRIPT italic\_f end\_POSTSUPERSCRIPT, …, P0,nfsuperscriptsubscript𝑃0𝑛𝑓P\_{0,n}^{f}italic\_P start\_POSTSUBSCRIPT 0 , italic\_n end\_POSTSUBSCRIPT start\_POSTSUPERSCRIPT italic\_f end\_POSTSUPERSCRIPT}.555l𝑙litalic\_l is determined by the context length of the LLM. In this study, l𝑙litalic\_l was set to 1000 and n𝑛nitalic\_n to 3. The sub-texts from P0,1fsuperscriptsubscript𝑃01𝑓P\_{0,1}^{f}italic\_P start\_POSTSUBSCRIPT 0 , 1 end\_POSTSUBSCRIPT start\_POSTSUPERSCRIPT italic\_f end\_POSTSUPERSCRIPT to P0,n−1fsuperscriptsubscript𝑃0𝑛1𝑓P\_{0,n-1}^{f}italic\_P start\_POSTSUBSCRIPT 0 , italic\_n - 1 end\_POSTSUBSCRIPT start\_POSTSUPERSCRIPT italic\_f end\_POSTSUPERSCRIPT are added to the set 𝒯𝒯\\mathcal{T}caligraphic\_T. Since P0,nfsuperscriptsubscript𝑃0𝑛𝑓P\_{0,n}^{f}italic\_P start\_POSTSUBSCRIPT 0 , italic\_n end\_POSTSUBSCRIPT start\_POSTSUPERSCRIPT italic\_f end\_POSTSUPERSCRIPT is likely incomplete due to the l𝑙litalic\_l token limit, it is concatenated with P0bsuperscriptsubscript𝑃0𝑏P\_{0}^{b}italic\_P start\_POSTSUBSCRIPT 0 end\_POSTSUBSCRIPT start\_POSTSUPERSCRIPT italic\_b end\_POSTSUPERSCRIPT for further segmentation. The combined text of P0,nfsuperscriptsubscript𝑃0𝑛𝑓P\_{0,n}^{f}italic\_P start\_POSTSUBSCRIPT 0 , italic\_n end\_POSTSUBSCRIPT start\_POSTSUPERSCRIPT italic\_f end\_POSTSUPERSCRIPT and P0bsuperscriptsubscript𝑃0𝑏P\_{0}^{b}italic\_P start\_POSTSUBSCRIPT 0 end\_POSTSUBSCRIPT start\_POSTSUPERSCRIPT italic\_b end\_POSTSUPERSCRIPT is referred to as P1subscript𝑃1P\_{1}italic\_P start\_POSTSUBSCRIPT 1 end\_POSTSUBSCRIPT. This segmentation continues until the length of Pisubscript𝑃𝑖P\_{i}italic\_P start\_POSTSUBSCRIPT italic\_i end\_POSTSUBSCRIPT is l𝑙litalic\_l tokens or less, at which point Pisubscript𝑃𝑖P\_{i}italic\_P start\_POSTSUBSCRIPT italic\_i end\_POSTSUBSCRIPT is added to 𝒯𝒯\\mathcal{T}caligraphic\_T. To ensure smooth transitions, each sub-text includes some content from adjacent sub-texts. The algorithm and conceptual figure of Note Segmentation are detailed in Appendix [H](https://arxiv.org/html/2406.16341v1#A8 "Appendix H Note Segmentation ‣ EHRCon: Dataset for Checking Consistency between Unstructured Notes and Structured Tables in Electronic Health Records").

Named Entity Recognition   Our task takes the entire text as input, making the extraction of named entities essential for consistency checks. In this task, the LLM extracts entities related to the 13 tables, focusing on those with clear numeric values, and those whose existence can be verified in the database even without explicit values.666 Narrowing down the NER target like this might seem like taking advantage of our knowledge from the dataset construction process. However, we would like to emphasize that the scope of named entities is part of the task definition, and it is essential to share this information with the model so that the model at least understands the objective. This selective extraction is crucial for maintaining the accuracy and reliability of our checks.

Time Filtering   At this stage, the LLM determines whether the time expression of a clinical event is in a specific time format, written in a narrative style, or if the time is not specified. The results from this step are utilized for generating queries at the last stage.

Table Identification  To create a pseudo table in the next stage, it is essential to identify the relevant tables related to the entities. At this stage, the LLM uses table descriptions, foreign key relationships, and just two example rows to identify the necessary table names.

Pseudo Table Creation  Since clinical notes include content that cannot be easily verified through tables, the LLM creates a pseudo table to effectively extract table-related information. The LLM extracts the information through a multi-step process as follows: First, extracts sentences from the clinical note that contain the entity to verify. Then, analyzes the extracted sentences to determine the time information of the entity. Finally, completes the pseudo table by extracting information about the remaining columns (e.g., value, unit) from the notes, using the previously obtained information. Examples of the detailed process for creating the pseudo table can be found in Appendix [I](https://arxiv.org/html/2406.16341v1#A9 "Appendix I Process of Creating Pseudo Table ‣ EHRCon: Dataset for Checking Consistency between Unstructured Notes and Structured Tables in Electronic Health Records").

Self Correction  During the construction of the pseudo table, we found that hallucinations by the LLM were frequent (see Appendix [J](https://arxiv.org/html/2406.16341v1#A10 "Appendix J Hallucination of LLMs ‣ EHRCon: Dataset for Checking Consistency between Unstructured Notes and Structured Tables in Electronic Health Records")). For example, there were instances where the LLM generated unit information that was not present in the notes. To address this issue, the LLM re-evaluates whether the pseudo table created in the previous stage is directly aligned with the notes. We then use only the results that are actually aligned.

Value Reformatting  In clinical notes and tables, the same information may be expressed differently. For instance, a clinical note might mention ‘admission’, while the table might record the admission date as ‘2022-02-02’. To align the data types between the generated pseudo table and the actual table, the LLM reformats the pseudo table by using the schema information.

Query Generation  Using the results from the Time Filtering and Value Reformatting, the LLM creates an SQL query. This query is executed against the database to check if the content mentioned in the notes matches the actual database content. During execution, we replace the entity in the SQL query with items retrieved from the database. This process involves leveraging the Item Search Tool (see Sec. [3.2](https://arxiv.org/html/2406.16341v1#S3.SS2 "3.2 Item Search Tool ‣ 3 EHRCon ‣ EHRCon: Dataset for Checking Consistency between Unstructured Notes and Structured Tables in Electronic Health Records")) to cover both medication brand names and their corresponding abbreviations.

## 5 Experiments

### 5.1 Experimental Setting

Base LLMs  We aim to conduct an evaluation of our EHRCon and our proposed framework CheckEHR. For this evaluation, we utilized Tulu2 70B \[[10](https://arxiv.org/html/2406.16341v1#bib.bib10)\], Mixtral 8X7B \[[11](https://arxiv.org/html/2406.16341v1#bib.bib11)\], Llama-3 70B777https://llama.meta.com/llama3, and GPT-3.5 (0613) \[[21](https://arxiv.org/html/2406.16341v1#bib.bib21)\] as the base LLMs within our framework. To effectively measure CheckEHR’s performance, experiments were conducted under both few-shot and zero-shot settings.

Note Pre-processing  We filtered out information from the notes that is difficult to confirm from the tables (e.g., pre-admission history) to focus on the current admission records (see Appendix [B.1.1](https://arxiv.org/html/2406.16341v1#A2.SS1.SSS1 "B.1.1 Note Preparation ‣ B.1 Data Preparation ‣ Appendix B MIMIC-III and OMOP CDM ‣ EHRCon: Dataset for Checking Consistency between Unstructured Notes and Structured Tables in Electronic Health Records")). All experiments used these processed notes, with results using the unfiltered original notes available in Appendix [K](https://arxiv.org/html/2406.16341v1#A11 "Appendix K Experiments using Original Notes ‣ EHRCon: Dataset for Checking Consistency between Unstructured Notes and Structured Tables in Electronic Health Records").

Metrics   We evaluate CheckEHR’s performance for each note using Precision, Recall and Intersection, then calculate the average across all notes. Precision is the number of correctly classified entities divided by the number of all recognized entities888Note that CheckEHR must first recognize entities in the notes during the NER stage before classifying them as Consistent or Inconsistent. in the note. Recall is the number of correctly classified entities divided by the number of all human-labeled entities in the note. Intersection is the number of correctly classified entities divided by the number of correctly recognized entities in the note. Note that we use Intersection to assess how well CheckEHR performs at least for the correctly recognized entities, considering the difficulty of NER. Details on the experiment setups are in Appendix [L](https://arxiv.org/html/2406.16341v1#A12 "Appendix L Experiments Setting Details ‣ EHRCon: Dataset for Checking Consistency between Unstructured Notes and Structured Tables in Electronic Health Records").

Table 2: The main results of CheckEHR on MIMIC-III. Mixtral scored zero in the zero-shot setting, so it was not included in the table.

  Shot

Models

Discharge Summary

Physician Note

Nursing Note

Total

Rec

Prec

Inters

Rec

Prec

Inters

Rec

Prec

Inters

Rec

Prec

Inters

Zero

Tulu2

11.82

27.48

46.92

9.1

20.15

40.83

15.32

23.23

30.37

12.08

23.62

38.37

Mixtral

\-

\-

\-

\-

\-

\-

\-

\-

\-

\-

\-

\-

Llama-3

50.82

35.54

69.70

52.92

33.89

72.71

53.45

44.61

81.48

52.39

38.01

74.03

GPT-3.5 (0613)

45.04

46.71

74.58

40.14

37.32

70.07

43.30

44.53

70.81

42.83

42.85

71.82

Few

Tulu2

40.01

49.42

70.66

49.98

47.08

85.33

44.77

40.50

78.40

44.95

45.66

78.13

Mixtral

54.70

49.76

71.21

53.71

37.97

83.48

69.86

49.65

85.01

54.70

45.79

79.90

Llama-3

50.44

47.01

76.25

56.11

42.75

84.30

52.60

38.08

75.96

53.05

42.61

78.83

GPT-3.5 (0613)

64.31

54.64

81.60

54.64

44.01

81.41

64.25

47.25

95.74

61.06

48.63

86.25 

### 5.2 Results

Table [2](https://arxiv.org/html/2406.16341v1#S5.T2 "Table 2 ‣ 5.1 Experimental Setting ‣ 5 Experiments ‣ EHRCon: Dataset for Checking Consistency between Unstructured Notes and Structured Tables in Electronic Health Records") presents the results of our framework for both the few-shot and zero-shot settings. Notably, using GPT-3.5 (0613) as the base LLM in the few-shot scenario achieves the best result, with a recall of 61.06%, precision of 48.63%, and an intersection score of 86.25%. However, the overall recall scores for the baseline models remain in the 40-60% range. Despite the carefully crafted 8-stage CheckEHR framework, these findings highlight the inherent difficulty of the task. This challenge is further underscored by the significant gaps between recall and intersection, and between precision and intersection. Such discrepancies indicate the difficulty of NER in our task. Despite providing the model all the entity extraction criteria defined for the task during the NER stage, both recall and precision performance remains low. This suggests that LLMs lack capabilities required to comprehend clinical notes and accurately extract only the entities that meet the criteria.

Furthermore, in our comparative analysis of zero-shot and few-shot performance, we observed significant improvements with few-shot examples in models like Tulu2, Mixtral, and GPT-3.5 (0613). However, Llama-3 exhibits similar performance in both zero-shot and few-shot settings. Interestingly, few-shot samples improves Llama-3’s performance for discharge summaries and physician notes, but degrades for nursing notes. This suggests that Llama-3 struggles to derive general patterns from in-context examples, particularly in more unstructured formats. Discharge summaries and physician notes typically contain semi-structured patterns (e.g., “\[2022-02-02 04:06:00\] WBC - 9.6”), making it easier for models to generalize from in-context examples. In contrast, nursing notes are often written in free-form text, presenting a challenge for Llama-3 to generalize effectively from few-shot samples.

Table 3: The main results of CheckEHR on MIMIC-OMOP. In this experiment, the NER step was skipped, and the gold entity was provided. The experiment was conducted in a few-shot setting.

  Data

Models

Discharge

Physician

Nursing

Total

Rec

Prec

Rec

Prec

Rec

Prec

Rec

Prec

MIMIC-OMOP

Tulu2

56.08

55.23

53.78

61.79

52.23

52.28

54.36

56.43

Mixtral

53.20

54.86

48.50

63.90

58.16

59.29

53.28

59.35

Llama-3

53.83

58.22

53.82

76.95

59.49

60.06

55.71

65.07

MIMIC-III

Tulu2

55.72

66.04

55.44

68.42

53.23

68.18

54.13

67.54

Mixtral

55.23

65.20

63.55

57.78

69.62

68.25

62.80

63.74

Llama-3

53.85

63.28

68.19

64.45

64.25

63.35

62.09

63.69 

### 5.3 Result in MIMIC-OMOP

The MIMIC-III database stores various clinical events in multiple tables like “chartevents” and “labevents”, while the OMOP CDM organizes these events into standardized tables such as the “measurements” table, facilitating multi-organization biomedical research. Additionally, MIMIC-III uses a variety of dictionary tables (e.g., d\_items, d\_icd\_diagnoses), while the OMOP CDM uses only the “concept” table for this purpose (see Appendix [B.2.1](https://arxiv.org/html/2406.16341v1#A2.SS2.SSS1 "B.2.1 Matching OMOP CDM and MIMIC-III ‣ B.2 OMOP CDM ‣ Appendix B MIMIC-III and OMOP CDM ‣ EHRCon: Dataset for Checking Consistency between Unstructured Notes and Structured Tables in Electronic Health Records")). This characteristic of the OMOP CDM simplifies table identification and item search within the database, leading us to anticipate superior performance of MIMIC-OMOP over MIMIC-III. Contrary to our expectations, however, the performance on MIMIC-OMOP was found to be similar to or lower than that of MIMIC, as shown in Table [3](https://arxiv.org/html/2406.16341v1#S5.T3 "Table 3 ‣ 5.2 Results ‣ 5 Experiments ‣ EHRCon: Dataset for Checking Consistency between Unstructured Notes and Structured Tables in Electronic Health Records"). To understand this discrepancy, we conducted an analysis based on entity types (see Sec. [3.1](https://arxiv.org/html/2406.16341v1#S3.SS1 "3.1 Labeling Instructions ‣ 3 EHRCon ‣ EHRCon: Dataset for Checking Consistency between Unstructured Notes and Structured Tables in Electronic Health Records")) and discovered that a significant performance drop occurred with Type 1 entities. This decline was mainly caused by the complexity of entities within the MIMIC-OMOP database. MIMIC-OMOP includes detailed and diverse information related to specific entity names, such as “Cipralex 10mg tablets (Sigma Pharmaceuticals Plc) 28 tablets”, encompassing value, unit, and other related details all at once. Our findings indicate the necessity for developing a framework that can freely interact with the database to overcome these challenges in future research. The detailed experimental results for each type of OMOP and MIMIC-III can be found in Appendix [M](https://arxiv.org/html/2406.16341v1#A13 "Appendix M Results of MIMIC-III and MIMIC-OMOP ‣ EHRCon: Dataset for Checking Consistency between Unstructured Notes and Structured Tables in Electronic Health Records").

### 5.4 Component Analysis

For evaluating the role of each component of our framework, we performed further analysis on 25% of the entire test set. This analysis involved three distinct experimental settings. In the first experimental setting, we excluded the NER stage (Figure [3](https://arxiv.org/html/2406.16341v1#S4.F3 "Figure 3 ‣ 4 CheckEHR ‣ EHRCon: Dataset for Checking Consistency between Unstructured Notes and Structured Tables in Electronic Health Records")\-2) and provided the ground truth entities. The second setting built upon this by adding ground truth for the time filtering and table identification (Figure [3](https://arxiv.org/html/2406.16341v1#S4.F3 "Figure 3 ‣ 4 CheckEHR ‣ EHRCon: Dataset for Checking Consistency between Unstructured Notes and Structured Tables in Electronic Health Records")\-3,4) stages. In the third setting, we further included ground truth for pseudo table creation, self correction, and value reformatting stage (Figure [3](https://arxiv.org/html/2406.16341v1#S4.F3 "Figure 3 ‣ 4 CheckEHR ‣ EHRCon: Dataset for Checking Consistency between Unstructured Notes and Structured Tables in Electronic Health Records")\-5,6,7). According to Table [7](https://arxiv.org/html/2406.16341v1#A14.T7 "Table 7 ‣ Appendix N Component Analysis of CheckEHR ‣ EHRCon: Dataset for Checking Consistency between Unstructured Notes and Structured Tables in Electronic Health Records"), our experiments with GPT-3.5 (0613) demonstrated a significant improvement in recall: 76.11% at the first setting, 82.49% at the second, and 92.83% at the third, with an approximate increase of 8 percentage points at each setting. This finding indicates that the information provided at each stage plays a crucial role in enabling the model to better understand and solve the task. Notably, the performance in the third setting exceeded 92%, showing a significant improvement over the second setting, indicating that LLMs struggle considerably with converting free text into a structured format. Refer to Appendix [N](https://arxiv.org/html/2406.16341v1#A14 "Appendix N Component Analysis of CheckEHR ‣ EHRCon: Dataset for Checking Consistency between Unstructured Notes and Structured Tables in Electronic Health Records") for experimental results and additional analysis.

## 6 Conclusion and Future Direction

In this paper, we introduce EHRCon, a carefully crafted dataset designed to improve the accuracy and reliability of EHRs. By meticulously comparing clinical notes with their corresponding database, EHRCon addresses critical inconsistencies that can jeopardize patient safety and care quality. Alongside EHRCon, we present CheckEHR, an innovative framework that leverages LLMs to efficiently verify data consistency within EHRs. Our study lays the groundwork for future advancements in automated and dependable healthcare documentation systems, ultimately enhancing patient safety and streamlining healthcare processes.

Despite the careful design of our dataset, several limitations exist. First, although MIMIC-III is hospital data, preprocessing is required to protect patient privacy. This preprocessing can introduce inconsistencies that do not occur in the actual hospital setting. Therefore, the inconsistencies we identified may not be present in real hospital data. In this regard, future research should incorporate consistency checks using real hospital data to identify inconsistency patterns in practical settings. Secondly, despite the high quality of our dataset, created by highly trained human annotators, there are limitations in verifying the contents of all clinical notes in MIMIC-III. To cover a broader range of cases, more scalable methods will be required.

## Acknowledgments and Disclosure of Funding

This work was supported by Institute for Information & communications Technology Promotion(IITP) grant (No.RS-2019-II190075) and Korea Medical Device Development Fund grant (Project Number: 1711138160, KMDF\_PR\_20200901\_0097), funded by the Korea government (MOTIE, MOHW, MFDS).

## References

-   \[1\] Rami Aly, Zhijiang Guo, Michael Schlichtkrull, James Thorne, Andreas Vlachos, Christos Christodoulopoulos, Oana Cocarascu, and Arpit Mittal. Feverous: Fact extraction and verification over unstructured and structured information. arXiv preprint arXiv:2106.05707, 2021.
-   \[2\] Rohan Anil, Andrew M Dai, Orhan Firat, Melvin Johnson, Dmitry Lepikhin, Alexandre Passos, Siamak Shakeri, Emanuel Taropa, Paige Bailey, Zhifeng Chen, et al. Palm 2 technical report. arXiv preprint arXiv:2305.10403, 2023.
-   \[3\] Hassan A Aziz and Ola Asaad Alsharabasi. Electronic health records uses and malpractice risks. Clinical Laboratory Science, 28(4):250–255, 2015.
-   \[4\] Sigall K Bell, Tom Delbanco, Joann G Elmore, Patricia S Fitzgerald, Alan Fossa, Kendall Harcourt, Suzanne G Leveille, Thomas H Payne, Rebecca A Stametz, Jan Walker, et al. Frequency and types of patient-reported errors in electronic health record ambulatory care notes. JAMA network open, 3(6):e205867–e205867, 2020.
-   \[5\] Meghan Black and Cristin M Colford. Transitions of care: improving the quality of discharge summaries completed by internal medicine residents. MedEdPORTAL, 13:10613, 2017.
-   \[6\] Tom Brown, Benjamin Mann, Nick Ryder, Melanie Subbiah, Jared D Kaplan, Prafulla Dhariwal, Arvind Neelakantan, Pranav Shyam, Girish Sastry, Amanda Askell, et al. Language models are few-shot learners. Advances in neural information processing systems, 33:1877–1901, 2020.
-   \[7\] Wenhu Chen, Hongmin Wang, Jianshu Chen, Yunkai Zhang, Hong Wang, Shiyang Li, Xiyou Zhou, and William Yang Wang. Tabfact: A large-scale dataset for table-based fact verification. arXiv preprint arXiv:1909.02164, 2019.
-   \[8\] Vivek Gupta, Maitrey Mehta, Pegah Nokhiz, and Vivek Srikumar. INFOTABS: Inference on tables as semi-structured data. In Dan Jurafsky, Joyce Chai, Natalie Schluter, and Joel Tetreault, editors, Proceedings of the 58th Annual Meeting of the Association for Computational Linguistics, pages 2309–2324, Online, July 2020. Association for Computational Linguistics.
-   \[9\] Julie A Hammerling. A review of medical errors in laboratory diagnostics and where we are today. Laboratory medicine, 43(2):41–44, 2012.
-   \[10\] Hamish Ivison, Yizhong Wang, Valentina Pyatkin, Nathan Lambert, Matthew Peters, Pradeep Dasigi, Joel Jang, David Wadden, Noah A Smith, Iz Beltagy, et al. Camels in a changing climate: Enhancing lm adaptation with tulu 2. arXiv preprint arXiv:2311.10702, 2023.
-   \[11\] Albert Q Jiang, Alexandre Sablayrolles, Antoine Roux, Arthur Mensch, Blanche Savary, Chris Bamford, Devendra Singh Chaplot, Diego de las Casas, Emma Bou Hanna, Florian Bressand, et al. Mixtral of experts. arXiv preprint arXiv:2401.04088, 2024.
-   \[12\] Jinhao Jiang, Kun Zhou, Zican Dong, Keming Ye, Xin Zhao, and Ji-Rong Wen. StructGPT: A general framework for large language model to reason over structured data. In Proceedings of the 2023 Conference on Empirical Methods in Natural Language Processing, pages 9237–9251, Singapore, December 2023. Association for Computational Linguistics.
-   \[13\] Yichen Jiang, Shikha Bordia, Zheng Zhong, Charles Dognin, Maneesh Singh, and Mohit Bansal. Hover: A dataset for many-hop fact extraction and claim verification. arXiv preprint arXiv:2011.03088, 2020.
-   \[14\] Alistair Johnson, Lucas Bulgarelli, Tom Pollard, Steven Horng, Leo Anthony Celi, and Roger Mark. Mimic-iv. PhysioNet. Available online at: https://physionet. org/content/mimiciv/1.0/(accessed August 23, 2021), pages 49–55, 2020.
-   \[15\] Alistair E. W. Johnson, Tom J. Pollard, and Roger G. Mark. MIMIC-III clinical database (version 1.4), 2016.
-   \[16\] Tushar Khot, Harsh Trivedi, Matthew Finlayson, Yao Fu, Kyle Richardson, Peter Clark, and Ashish Sabharwal. Decomposed prompting: A modular approach for solving complex tasks. In The Eleventh International Conference on Learning Representations, 2022.
-   \[17\] Jiho Kim, Yeonsu Kwon, Yohan Jo, and Edward Choi. KG-GPT: A general framework for reasoning on knowledge graphs using large language models. In Findings of the Association for Computational Linguistics: EMNLP 2023, pages 9410–9421, Singapore, December 2023. Association for Computational Linguistics.
-   \[18\] Jiho Kim, Sungjin Park, Yeonsu Kwon, Yohan Jo, James Thorne, and Edward Choi. FactKG: Fact verification via reasoning on knowledge graphs. In Proceedings of the 61st Annual Meeting of the Association for Computational Linguistics (Volume 1: Long Papers), pages 16190–16206, Toronto, Canada, July 2023. Association for Computational Linguistics.
-   \[19\] Pan Lu, Baolin Peng, Hao Cheng, Michel Galley, Kai-Wei Chang, Ying Nian Wu, Song-Chun Zhu, and Jianfeng Gao. Chameleon: Plug-and-play compositional reasoning with large language models. Advances in Neural Information Processing Systems, 36, 2024.
-   \[20\] OpenAI. Gpt-4 technical report, 2023.
-   \[21\] OpenAI. Introducing chatgpt., 2023.
-   \[22\] Matvey B Palchuk, Elizabeth A Fang, Janet M Cygielnik, Matthew Labreche, Maria Shubina, Harley Z Ramelson, Claus Hamann, Carol Broverman, Jonathan S Einbinder, and Alexander Turchin. An unintended consequence of electronic prescriptions: prevalence and impact of internal discrepancies. Journal of the American Medical Informatics Association, 17(4):472–476, 2010.
-   \[23\] Jungsoo Park, Sewon Min, Jaewoo Kang, Luke Zettlemoyer, and Hannaneh Hajishirzi. Faviq: Fact verification from information-seeking questions. arXiv preprint arXiv:2107.02153, 2021.
-   \[24\] Thomas H Payne, W David Alonso, J Andrew Markiel, Kevin Lybarger, Ross Lordon, Meliha Yetisgen, Jennifer M Zech, and Andrew A White. Using voice to create inpatient progress notes: effects on note timeliness, quality, and physician satisfaction. JAMIA open, 1(2):218–226, 2018.
-   \[25\] Alvin Rajkomar, Eric Loreaux, Yuchen Liu, Jonas Kemp, Benny Li, Ming-Jun Chen, Yi Zhang, Afroz Mohiuddin, and Juraj Gottweis. Deciphering clinical abbreviations with a privacy protecting machine learning system. Nature Communications, 13, 12 2022.
-   \[26\] Anku Rani, S.M Towhidul Islam Tonmoy, Dwip Dalal, Shreya Gautam, Megha Chakraborty, Aman Chadha, Amit Sheth, and Amitava Das. FACTIFY-5WQA: 5W aspect-based fact verification through question answering. In Anna Rogers, Jordan Boyd-Graber, and Naoaki Okazaki, editors, Proceedings of the 61st Annual Meeting of the Association for Computational Linguistics (Volume 1: Long Papers), pages 10421–10440, Toronto, Canada, July 2023. Association for Computational Linguistics.
-   \[27\] Arkadiy Saakyan, Tuhin Chakrabarty, and Smaranda Muresan. Covid-fact: Fact extraction and verification of real-world claims on covid-19 pandemic. arXiv preprint arXiv:2106.03794, 2021.
-   \[28\] Mourad Sarrouti, Asma Ben Abacha, Yassine M’rabet, and Dina Demner-Fushman. Evidence-based fact-checking of health-related claims. In Findings of the Association for Computational Linguistics: EMNLP 2021, pages 3499–3512, 2021.
-   \[29\] Tal Schuster, Adam Fisch, and Regina Barzilay. Get your vitamin c! robust fact verification with contrastive evidence. arXiv preprint arXiv:2103.08541, 2021.
-   \[30\] Tal Schuster, Darsh J Shah, Yun Jie Serene Yeo, Daniel Filizzola, Enrico Santus, and Regina Barzilay. Towards debiasing fact verification models. arXiv preprint arXiv:1908.05267, 2019.
-   \[31\] James Thorne, Andreas Vlachos, Christos Christodoulopoulos, and Arpit Mittal. Fever: a large-scale dataset for fact extraction and verification. arXiv preprint arXiv:1803.05355, 2018.
-   \[32\] Luis Bernardo Villa and Ivan Cabezas. A review on usability features for designing electronic health records. In 2014 IEEE 16th international conference on e-health networking, applications and services (Healthcom), pages 49–54. IEEE, 2014.
-   \[33\] Juraj Vladika and Florian Matthes. Scientific fact-checking: A survey of resources and approaches. arXiv preprint arXiv:2305.16859, 2023.
-   \[34\] Erica Voss, Rupa Makadia, Amy Matcho, Qianli Ma, Chris Knoll, Martijn Schuemie, Frank Defalco, Ajit Londhe, Vivienne Zhu, and Patrick Ryan. Feasibility and utility of applications of the common data model to multiple, disparate observational health databases. Journal of the American Medical Informatics Association : JAMIA, 22, 02 2015.
-   \[35\] Nancy X. R. Wang, Diwakar Mahajan, Marina Danilevsky, and Sara Rosenthal. SemEval-2021 task 9: Fact verification and evidence finding for tabular data in scientific documents (SEM-TAB-FACTS). In Proceedings of the 15th International Workshop on Semantic Evaluation (SemEval-2021), pages 317–326, Online, August 2021.
-   \[36\] Zilong Wang, Hao Zhang, Chun-Liang Li, Julian Martin Eisenschlos, Vincent Perot, Zifeng Wang, Lesly Miculicich, Yasuhisa Fujii, Jingbo Shang, Chen-Yu Lee, et al. Chain-of-table: Evolving tables in the reasoning chain for table understanding. In The Twelfth International Conference on Learning Representations, 2023.
-   \[37\] Michael J Ward, Wesley H Self, and Craig M Froehle. Effects of common data errors in electronic health records on emergency department operational performance metrics: A monte carlo simulation. Academic Emergency Medicine, 22(9):1085–1092, 2015.
-   \[38\] Siddhartha Yadav, Noora Kazanji, Narayan KC, Sudarshan Paudel, John Falatko, Sandor Shoichet, Michael Maddens, and Michael A Barnes. Comparison of accuracy of physical examination findings in initial progress notes between paper charts and a newly implemented electronic health record. Journal of the American Medical Informatics Association, 24(1):140–144, 2017.
-   \[39\] Denny Zhou, Nathanael Schärli, Le Hou, Jason Wei, Nathan Scales, Xuezhi Wang, Dale Schuurmans, Claire Cui, Olivier Bousquet, Quoc V Le, et al. Least-to-most prompting enables complex reasoning in large language models. In The Eleventh International Conference on Learning Representations, 2022.

## Checklist

1.  1.
    
    For all authors…
    
    1.  (a)
        
        Do the main claims made in the abstract and introduction accurately reflect the paper’s contributions and scope? \[Yes\] See Section [1](https://arxiv.org/html/2406.16341v1#S1.F1 "Figure 1 ‣ 1 Introduction ‣ EHRCon: Dataset for Checking Consistency between Unstructured Notes and Structured Tables in Electronic Health Records").
        
    2.  (b)
        
        Did you describe the limitations of your work? \[Yes\] See Section [6](https://arxiv.org/html/2406.16341v1#S6 "6 Conclusion and Future Direction ‣ EHRCon: Dataset for Checking Consistency between Unstructured Notes and Structured Tables in Electronic Health Records").
        
    3.  (c)
        
        Did you discuss any potential negative societal impacts of your work? \[No\] Our dataset is entirely based on MIMIC-III. All datasets have been de-identified and are provided under the PhysioNet license. Moreover, we have not attempted to identify any clinical records within the dataset to prevent potential negative social consequences.
        
    4.  (d)
        
        Have you read the ethics review guidelines and ensured that your paper conforms to them? \[Yes\]
        
    
2.  2.
    
    If you are including theoretical results…
    
    1.  (a)
        
        Did you state the full set of assumptions of all theoretical results? \[N/A\]
        
    2.  (b)
        
        Did you include complete proofs of all theoretical results? \[N/A\]
        
    
3.  3.
    
    If you ran experiments (e.g. for benchmarks)…
    
    1.  (a)
        
        Did you include the code, data, and instructions needed to reproduce the main experimental results (either in the supplemental material or as a URL)? \[Yes\] See Appendix [L](https://arxiv.org/html/2406.16341v1#A12 "Appendix L Experiments Setting Details ‣ EHRCon: Dataset for Checking Consistency between Unstructured Notes and Structured Tables in Electronic Health Records"). We will release the experimental code.
        
    2.  (b)
        
        Did you specify all the training details (e.g., data splits, hyperparameters, how they were chosen)? \[Yes\] See Appendix [L](https://arxiv.org/html/2406.16341v1#A12 "Appendix L Experiments Setting Details ‣ EHRCon: Dataset for Checking Consistency between Unstructured Notes and Structured Tables in Electronic Health Records").
        
    3.  (c)
        
        Did you report error bars (e.g., with respect to the random seed after running experiments multiple times)? \[No\] We did not conduct the experiment multiple times.
        
    4.  (d)
        
        Did you include the total amount of compute and the type of resources used (e.g., type of GPUs, internal cluster, or cloud provider)? \[Yes\] See Appendix [L](https://arxiv.org/html/2406.16341v1#A12 "Appendix L Experiments Setting Details ‣ EHRCon: Dataset for Checking Consistency between Unstructured Notes and Structured Tables in Electronic Health Records").
        
    
4.  4.
    
    If you are using existing assets (e.g., code, data, models) or curating/releasing new assets…
    
    1.  (a)
        
        If your work uses existing assets, did you cite the creators? \[Yes\]
        
    2.  (b)
        
        Did you mention the license of the assets? \[Yes\]
        
    3.  (c)
        
        Did you include any new assets either in the supplemental material or as a URL? \[Yes\] We will share a Google Drive link containing new assets. After all review periods have ended, the link will be deprecated.
        
    4.  (d)
        
        Did you discuss whether and how consent was obtained from people whose data you’re using/curating? \[No\]
        
    5.  (e)
        
        Did you discuss whether the data you are using/curating contains personally identifiable information or offensive content? \[No\] Our dataset is sourced from the MIMIC-III database on PhysioNet and includes de-identified patient records. It contains no personally identifiable information or offensive material.
        
    
5.  5.
    
    If you used crowdsourcing or conducted research with human subjects…
    
    1.  (a)
        
        Did you include the full text of instructions given to participants and screenshots, if applicable? \[Yes\] see Appendix [G](https://arxiv.org/html/2406.16341v1#A7 "Appendix G Prompt ‣ EHRCon: Dataset for Checking Consistency between Unstructured Notes and Structured Tables in Electronic Health Records").
        
    2.  (b)
        
        Did you describe any potential participant risks, with links to Institutional Review Board (IRB) approvals, if applicable? \[No\] We used MIMIC-III, which was approved by the Institutional Review Boards of Beth Israel Deaconess Medical Center (Boston, MA) and Massachusetts Institute of Technology (Cambridge, MA).
        
    3.  (c)
        
        Did you include the estimated hourly wage paid to participants and the total amount spent on participant compensation? \[N/A\]
        
    

\\startcontents

\[supplementary\] \\printcontents\[supplementary\]l1

## Supplementary Contents

## Appendix A Datasheet for Datasets

### A.1 Motivation

-   •
    
    For what purpose was the dataset created?
    
    EHRs are integral for storing comprehensive patient medical records, combining structured data with detailed clinical notes. However, they often suffer from discrepancies due to unintuitive EHR system designs and human errors, posing serious risks to patient safety. To address this, we developed EHRCon.
    
-   •
    
    Who created the dataset (e.g., which team, research group) and on behalf of which entity (e.g., company, institution, organization)?
    
    The authors created the dataset.
    
-   •
    
    Who funded the creation of the dataset? If there is an associated grant, please provide the name of the grantor and the grant name and number.
    
    This work was supported by Institute for Information & communications Technology Promotion(IITP) grant (No.RS-2019-II190075) and Korea Medical Device Development Fund grant (Project Number: 1711138160, KMDF\_PR\_20200901\_0097), funded by the Korea government (MOTIE, MOHW, MFDS).
    

### A.2 Composition

-   •
    
    What do the instances that comprise the dataset represent (e.g., documents, photos, people, countries)?
    
    EHRCon includes entities identified in the notes along with their labels. Additionally, for inconsistent entities, it identifies the specific table and column in the EHR where the inconsistencies are found.
    
-   •
    
    How many instances are there in total (of each type, if appropriate)?
    
    It includes 3,943 entities extracted from a total of 105 clinical notes.
    
-   •
    
    Does the dataset contain all possible instances or is it a sample (not necessarily random) of instances from a larger set?
    
    We randomly extracted and used 105 clinical notes from MIMIC-III. The notes consist of discharge summaries, physician notes, and nursing notes.
    
-   •
    
    What data does each instance consist of?
    
    Entities extracted from the notes have corresponding labels, and for inconsistent entities, the specific tables and columns in the EHR where the inconsistency occurs are recorded.
    
-   •
    
    Is there a label or target associated with each instance?
    
    Each entity has a corresponding label.
    
-   •
    
    Is any information missing from individual instances? If so, please provide a description, explaining why this information is missing (e.g., because it was unavailable). This does not include intentionally removed information, but might include, e.g., redacted text.
    
    No.
    
-   •
    
    Are relationships between individual instances made explicit (e.g., users’ movie ratings, social network links)?
    
    No.
    
-   •
    
    Are there recommended data splits (e.g., training, development/validation, testing)?
    
    We randomly divided 105 clinical notes into a test set of 83 and a validation set of 22 for the experiment.
    
-   •
    
    Are there any errors, sources of noise, or redundancies in the dataset?
    
    Although trained human annotators followed the labeling instructions, slight variations may exist due to individual perspectives.
    
-   •
    
    Is the dataset self-contained, or does it link to or otherwise rely on external resources (e.g., websites, tweets, other datasets)?
    
    EHRCon depends on MIMIC-III which is accessible via PhysioNet999[https://physionet.org/](https://physionet.org/).
    
-   •
    
    Does the dataset contain data that might be considered confidential (e.g., data that is protected by legal privilege or by doctor-patient confidentiality, data that includes the content of individuals’ non-public communications)?
    
    No.
    
-   •
    
    Does the dataset contain data that, if viewed directly, might be offensive, insulting, threatening, or might otherwise cause anxiety?
    
    No.
    
-   •
    
    Does the dataset relate to people?
    
    Yes.
    
-   •
    
    Does the dataset identify any subpopulations (e.g., by age, gender)?
    
    No.
    
-   •
    
    Does the dataset contain data that might be considered sensitive in any way (e.g., data that reveals race or ethnic origins, sexual orientations, religious beliefs, political opinions or union memberships, or locations; financial or health data; biometric or genetic data; forms of government identification, such as social security numbers; criminal history)?
    
    No.
    

### A.3 Collection process

-   •
    
    How was the data associated with each instance acquired?
    
    Before starting the labeling process, we designed the labeling instructions in consultation with the partitioners. Based on these instructions, trained human annotators reviewed the clinical notes and labeled the entities.
    
-   •
    
    What mechanisms or procedures were used to collect the data (e.g., hardware apparatuses or sensors, manual human curation, software programs, software APIs)?
    
    We used Google Search and ChatGPT4 API (Azure) to analyze the entities in clinical notes, and SQLite3 for SQL query execution.
    
-   •
    
    If the dataset is a sample from a larger set, what was the sampling strategy (e.g., deterministic, probabilistic with specific sampling probabilities)?
    
    When extracting notes, we randomly selected notes with at least 800 tokens to ensure they contained sufficient content.
    
-   •
    
    Who was involved in the data collection process (e.g., students, crowd workers, contractors) and how were they compensated (e.g., how much were crowd workers paid)?
    
    The authors manually labeled the data.
    
-   •
    
    Over what timeframe was the data collected?
    
    We created the dataset from April 2023 to April 2024.
    
-   •
    
    Were any ethical review processes conducted (e.g., by an institutional review board)?
    
    N/A.
    
-   •
    
    Does the dataset relate to people?
    
    Yes.
    
-   •
    
    Did you collect the data from the individuals in question directly, or obtain it via third parties or other sources (e.g., websites)?
    
    N/A.
    
-   •
    
    Were the individuals in question notified about the data collection?
    
    N/A.
    
-   •
    
    Did the individuals in question consent to the collection and use of their data?
    
    N/A.
    
-   •
    
    If consent was obtained, were the consenting individuals provided with a mechanism to revoke their consent in the future or for certain uses?
    
    N/A.
    
-   •
    
    Has an analysis of the potential impact of the dataset and its use on data subjects (e.g., a data protection impact analysis) been conducted?
    
    Yes.
    

### A.4 Preprocessing/cleaning/labeling

-   •
    
    Was any preprocessing/cleaning/labeling of the data done (e.g., discretization or bucketing, tokenization, part-of-speech tagging, SIFT feature extraction, removal of instances, processing of missing values)?
    
    We performed preprocessing by removing pre-admission records and treatment plans from the clinical notes.
    
-   •
    
    Was the “raw” data saved in addition to the preprocess/cleaned/labeled data (e.g., to support unanticipated future uses)?
    
    We additionally provide labels for the original notes.
    
-   •
    
    Is the software that was used to preprocess/clean/label the data available?
    
    We performed preprocessing using Python.
    

### A.5 Uses

-   •
    
    Has the dataset been used for any tasks already?
    
    No.
    
-   •
    
    Is there a repository that links to any or all papers or systems that use the dataset?
    
    N/A.
    
-   •
    
    What (other) tasks could the dataset be used for?
    
    It can be used not only for consistency checks of EHR but also for table-based fact verification tasks.
    
-   •
    
    Is there anything about the composition of the dataset or the way it was collected and preprocessed/cleaned/labeled that might impact future uses?
    
    N/A.
    
-   •
    
    Are there tasks for which the dataset should not be used?
    
    N/A.
    

### A.6 Distribution

-   •
    
    Will the dataset be distributed to third parties outside of the entity (e.g., company, institution, organization) on behalf of which the dataset was created?
    
    No.
    
-   •
    
    How will the dataset be distributed?
    
    The dataset will be released at PhysioNet.
    
-   •
    
    Will the dataset be distributed under a copyright or other intellectual property (IP) license, and/or under applicable terms of use (ToU)?
    
    The dataset is released under MIT License.
    
-   •
    
    Have any third parties imposed IP-based or other restrictions on the data associated with the instances?
    
    No.
    
-   •
    
    Do any export controls or other regulatory restrictions apply to the dataset or to individual instances?
    
    No.
    

### A.7 Maintenance

-   •
    
    Who will be supporting/hosting/maintaining the dataset?
    
    The authors will support it.
    
-   •
    
    How can the owner/curator/manager of the dataset be contacted(e.g., email address)?
    
    Contact the authors ({yeonsu.k, jiho.kim}@kaist.ac.kr).
    
-   •
    
    Is there an erratum?
    
    No.
    
-   •
    
    Will the dataset be updated (e.g., to correct labeling erros, add new instances, delete instances)?
    
    The authors will update the dataset if any corrections are required.
    
-   •
    
    If the dataset relates to people, are there applicable limits on the retention of the data associated with the instances (e.g., were the individuals in question told that their data would be retained for a fixed period of time and then deleted)?
    
    N/A
    
-   •
    
    Will older versions of the dataset continue to be supported/hosted/maintained?
    
    We plan to upload the latest version of the dataset and will document the updates for each version separately.
    
-   •
    
    If others want to extend/augment/build on/contribute to the dataset, is there a mechanism for them to do so?
    
    Contact the authors ({yeonsu.k, jiho.kim}@kaist.ac.kr).
    

## Appendix B MIMIC-III and OMOP CDM

EHRCon is built on two types of relational databases: MIMIC-III and its version in OMOP CDM. This structure allows us to incorporate various schema types and enhance generalizability. In this section, we will describe in detail the process of creating both MIMIC-III and MIMIC-OMOP.

### B.1 Data Preparation

We created EHRCon using 105 randomly selected clinical notes and 13 tables. In this section, we will provide a detailed description of how the clinical notes and tables were selected and preprocessed.

#### B.1.1 Note Preparation

To develop a more realistic dataset that mirrors a typical hospital setting, we began by analyzing the clinical notes from MIMIC-III by category (see Figure [4](https://arxiv.org/html/2406.16341v1#A2.F4 "Figure 4 ‣ B.1.1 Note Preparation ‣ B.1 Data Preparation ‣ Appendix B MIMIC-III and OMOP CDM ‣ EHRCon: Dataset for Checking Consistency between Unstructured Notes and Structured Tables in Electronic Health Records")). The largest portion of notes came from the “Nursing/other” category. However, much of this content, such as details of family meetings, couldn’t be verified against the table data and was therefore excluded. Radiology reports and ECG (electrocardiogram) reports were also excluded since they rely on imaging and cardiac monitoring, which are outside our scope. Therefore, our focus was on discharge summaries, nursing notes, and physician notes, as these are commonly used in hospitals and related to tabular information.

Additionally, clinical notes may contain pre-admission history and future treatment plans not found in the EHR tables. To concentrate on current admission records, we filtered out this additional information from the notes. To ensure sufficient detail, we randomly selected 105 notes with more than 800 tokens for the experiments.

![Refer to caption](x4.png)

Figure 4: Distribution of different note categories in MIMIC-III.

#### B.1.2 Table Preparation

To enhance the utility of our dataset, we identified tables in the MIMIC-III database that contain entities from discharge summaries, physician notes, and nursing notes. To achieve this, we analyzed randomly selected 300 clinical notes, consisting of 100 discharge summaries, 100 nursing notes, and 100 physician notes. As a result, we concluded with a total of thirteen tables, including four dictionary tables, as follows: Chartevents, Labevents, Prescriptions, Inputevents\_cv, Inputevents\_mv, Outputevents, Microbiologyevents, Diagnoses\_icd, Procedures\_icd, D\_items, D\_icd\_diagnoses, D\_icd\_procedures, and D\_labitems. The overall table preparation process is described in Figure [5](https://arxiv.org/html/2406.16341v1#A2.F5 "Figure 5 ‣ B.1.2 Table Preparation ‣ B.1 Data Preparation ‣ Appendix B MIMIC-III and OMOP CDM ‣ EHRCon: Dataset for Checking Consistency between Unstructured Notes and Structured Tables in Electronic Health Records").

![Refer to caption](x5.png)

Figure 5: Overall process of table preparation.

### B.2 OMOP CDM

#### B.2.1 Matching OMOP CDM and MIMIC-III

Table [4](https://arxiv.org/html/2406.16341v1#A2.T4 "Table 4 ‣ B.2.1 Matching OMOP CDM and MIMIC-III ‣ B.2 OMOP CDM ‣ Appendix B MIMIC-III and OMOP CDM ‣ EHRCon: Dataset for Checking Consistency between Unstructured Notes and Structured Tables in Electronic Health Records") illustrates how each MIMIC-III table and column correspond to the respective OMOP CDM table and column.

Table 4: Relationship between MIMIC-III and MIMIC-OMOP Tables.

MIMIC-III

MIMIC-OMOP

Table

Column

Table

Column

Chartevents

chartttime

Measurement

measurement\_datetime

valuenum

value\_as\_number

valueuom

unit\_source\_value

Labevents

chartttime

measurement\_datetime

valuenum

value\_as\_number

valueuom

unit\_source\_value

Outputevents

chartttime

measurement\_datetime

valuenum

value\_as\_number

valueuom

unit\_source\_value

Microbiologyevents

charttime

measurement\_datetime

Specimen

specimen\_datetime

org\_name

Concept

concept\_name

spec\_type\_desc

Inputevents\_mv

starttime

Drug\_exposure

drug\_exposure\_startdate

endtime

drug\_exposure\_enddate

amount

\-

amoutuom

\-

rate

\-

rateuom

\-

Inputevents\_cv

charttime

drug\_exposure\_startdate

drug\_exposure\_enddate

amount

\-

amoutuom

\-

rate

\-

rateuom

\-

Prescriptions

startdate

drug\_exposure\_startdate

enddate

drug\_exposure\_enddate

dose\_val\_rx

\-

dose\_unit\_rx

\-

drug

Concept

concept\_name

D\_items

label

D\_labitems

label

D\_icd\_diagnosis

short\_title

long\_title

D\_icd\_procedures

short\_title

long\_title

#### B.2.2 Labeling Process of MIMIC-OMOP

MIMIC-OMOP is derived from MIMIC-III, and while both are organized using different table structures (schemas), they contain the same patient information. Therefore, the labels of the entities annotated in MIMIC-III can be directly applied to MIMIC-OMOP as well.

We downloaded the MIMIC-OMOP database101010Database sourced from [https://github.com/MIT-LCP/mimic-omop](https://github.com/MIT-LCP/mimic-omop)., which follows the mapping guidelines specified in Section [B.2.1](https://arxiv.org/html/2406.16341v1#A2.SS2.SSS1 "B.2.1 Matching OMOP CDM and MIMIC-III ‣ B.2 OMOP CDM ‣ Appendix B MIMIC-III and OMOP CDM ‣ EHRCon: Dataset for Checking Consistency between Unstructured Notes and Structured Tables in Electronic Health Records"). Upon reviewing MIMIC-OMOP, we discovered that the drug exposure start time was recorded as being later than the end time. We corrected this issue by swapping the values in the columns.

## Appendix C Labeling Instructions

### C.1 Task Description

Identify the entities mentioned in the clinical note and write an SQLite3 query to check if the corresponding values exist in the database. If you encounter any ambiguous or corner cases during the annotation process, make a note of them and discuss them with the practitioners and other annotators.

### C.2 Identify the Entity

Identify the entities that likely exist in the following tables: Procedures\_icd, Diagnoses\_icd, Microbiologyevents, Chartevents, Labevents, Prescriptions, Inputevents\_mv, Inputevents\_cv, and Outputevents. Detect entities that occurred exclusively between the patient’s admission and the charted time of the note.

#### C.2.1 Additional Rules (for Discharge Summary)

-   •
    
    For diagnoses, extract entities from the Discharge Diagnosis list, including both the Primary Diagnosis and Secondary Diagnosis sections.
    
-   •
    
    For procedures, extract entities from both the Major Surgical and Invasive Procedure sections.
    

### C.3 Classify the Type of the Identified Entity

-   •
    
    Type 1: Entities with numerical values.
    
    -   –
        
        When the value associated with the entity is numeric.
        
        -   \*
            
            e.g., temp - 99.9, WBC - 9.6
            
        
    
-   •
    
    Type 2: Entities without numerical values but whose existence can be verified in the database.
    
    -   –
        
        When the value associated with the entity is not numeric and it is sufficient to confirm its existence without checking the value in the database.
        
        -   \*
            
            e.g., Lasix was started, WBC was tested
            
        
    
-   •
    
    Type 3: Entities with string values.
    
    -   –
        
        When the value associated with the entity is not numeric and it is necessary to check the value in the database.
        
        -   \*
            
            e.g., Lasix increased, BP was stable, WBC changed from 1 to 5, temp > 100
            
        
    

### C.4 Search Items in the Database

Use the Item Search Tool to find items in the database related to the detected entity. From these, select those that accurately represent the detected entity.

-   •
    
    Guidelines for using the Item Search Tool
    
    -   –
        
        Display items related to the entity in the following order: D\_labitems, D\_items, Prescriptions, D\_icd\_procedures, D\_icd\_diagnoses
        
    -   –
        
        If none of the searched items can accurately represent the entity, manually search for the items in the database and add it.
        
    

### C.5 Select Tables and Enter the Evidence Line

-   •
    
    Check the tables connected to the selected items and select the tables to which the detected entity can be linked.
    
-   •
    
    Enter the line number in the clinical notes where the entity is located.
    

### C.6 Check the Number of Entities

This section is for checking how many times an entity is mentioned. For example, in the case of BP, if it is written as 120/50, it should be considered as two mentions of BP. Each instance should then be verified to ensure it is correctly recorded in the database.

### C.7 Extract Information Related to the Entity from the Clinical Note

Extract the value, unit, time, organism, and specimen related to the entity. Refer to Figure [6](https://arxiv.org/html/2406.16341v1#A3.F6 "Figure 6 ‣ C.7 Extract Information Related to the Entity from the Clinical Note ‣ Appendix C Labeling Instructions ‣ EHRCon: Dataset for Checking Consistency between Unstructured Notes and Structured Tables in Electronic Health Records") for the actual table columns corresponding to value, unit, time, organism and specimen.

-   •
    
    Value: Numeric value corresponding to the entity (e.g., 184, 103.3).
    
-   •
    
    Unit: Unit corresponding to the numeric value (e.g., mg, ml/h). If the unit is not specified, do not extract it.
    
-   •
    
    Time of the clinical event occurrence
    
    -   –
        
        If only the date is noted, use the format YYYY-MM-DD. If only MM-DD is noted, use the year from the note’s chartdate to complete as YYYY-MM-DD.
        
    -   –
        
        In case the time is also specified, use the format YYYY-MM-DD HH:MM:SS (24-hour format).
        
    -   –
        
        For relative time expression (e.g., HD #3), calculating the date based on the admission date. For ‘Yesterday’, calculate it based on the note’s chartdate.
        
    -   –
        
        If ‘admission’, ‘charttime’, or ‘discharge’ is noted, calculate the date based on the respective entry.
        
    -   –
        
        If there is no time noted, for discharge summaries, consider the entire hospitalization period. For nursing and physician notes, consider the period within one day before and one day after the chartdate.
        
    
-   •
    
    Organism: This corresponds to a microbiology event and involves microorganism (e.g., bacteria, fungi).
    
-   •
    
    Specimen: This corresponds to a microbiology event and involves specimen (e.g., blood, urine, tissue) from which the microbiological sample was obtained.
    

![Refer to caption](x6.png)

Figure 6: Actual table columns corresponding to value, unit, time, organism, and specimen.

### C.8 Example of Annotation

-   •
    
    Physical Exam: Temperature 99.9
    
    -   –
        
        Label based on whether there is a record with a value of 99.9 in the ‘Temperature’ data.
        
    
-   •
    
    Oxygen saturation 98%
    
    -   –
        
        Label based on whether there is a record with a value of 98 and unit of % in the ‘Oxygen saturation’ data.
        
    
-   •
    
    BP: 120/80 (90)
    
    -   –
        
        Label whether ‘BP’ has the records of 120, 80, and 90.
        
    

### C.9 Query Generation

Create an SQL query that utilizes the values extracted from the clinical note and satisfies the conditions specified in Figure [8](https://arxiv.org/html/2406.16341v1#A4.F8 "Figure 8 ‣ Appendix D Time Expressions in Clinical Notes ‣ EHRCon: Dataset for Checking Consistency between Unstructured Notes and Structured Tables in Electronic Health Records"). If an inconsistency occurs, mask the condition values, execute the query on the database, and identify the table and columns causing the inconsistency.

### C.10 Notice

-   •
    
    For blood pressure, if given in the format (num1/num2), each of num1 and num2 should be checked individually.
    
-   •
    
    Exclude entities that are not explicitly identified (e.g., Chem 7: 140 / 4.2 / 104 / 25 / 15 / 1.0 / 90).
    

## Appendix D Time Expressions in Clinical Notes

Figure [7](https://arxiv.org/html/2406.16341v1#A4.F7 "Figure 7 ‣ Appendix D Time Expressions in Clinical Notes ‣ EHRCon: Dataset for Checking Consistency between Unstructured Notes and Structured Tables in Electronic Health Records") provides examples categorized by type of time expression. Furthermore, Figure [8](https://arxiv.org/html/2406.16341v1#A4.F8 "Figure 8 ‣ Appendix D Time Expressions in Clinical Notes ‣ EHRCon: Dataset for Checking Consistency between Unstructured Notes and Structured Tables in Electronic Health Records") depicts the verification ranges for various table types based on these time expressions.

![Refer to caption](x7.png)

Figure 7: Examples categorized by type of time expression.

![Refer to caption](x8.png)

Figure 8: Range of verification based on temporal expressions. The left side indicates time solely through ‘charttime’. On the right, however, ‘prescriptions’ and ‘inputevents\_mv’ utilize both ‘starttime’ and ‘endtime’, creating a varied verification range for time.

## Appendix E Quality Control

To ensure the high quality of our dataset, we rely on expert researchers for annotation rather than crowd-sourced workers. The researchers have published AI healthcare-related papers and possess a thorough understanding of the MIMIC-III database and SQL syntax. After the labeling was completed, four annotators conducted cross-validation on a total of 20 notes.111111Each type of note (e.g., discharge summary, physician note, nursing note) has its own unique format and style. Therefore, we manually cross-checked only 20 notes for each type, focusing on these characteristics. For the remaining notes, we corrected the data based on the key elements resolved during the cross-check to maintain consistency. As a result, the F1 score of the entities recognized by the annotators was 0.880. Additionally, among the entities recognized by both annotators, the cases where the labels were the same accounted for 0.938. This demonstrates the consistency of our labeling process.

## Appendix F Error cases

We conducted an in-depth analysis of various discrepancies observed in EHRCon. To achieve this, we compared the coverage of tables where discrepancies occur in EHRCon and analyzed the error rates per column. Additionally, we examined in detail which columns have higher error occurrence rates for each note. These details can be found in Figure [10](https://arxiv.org/html/2406.16341v1#A6.F10 "Figure 10 ‣ Appendix F Error cases ‣ EHRCon: Dataset for Checking Consistency between Unstructured Notes and Structured Tables in Electronic Health Records") to [12](https://arxiv.org/html/2406.16341v1#A6.F12 "Figure 12 ‣ Appendix F Error cases ‣ EHRCon: Dataset for Checking Consistency between Unstructured Notes and Structured Tables in Electronic Health Records").

![Refer to caption](x9.png)

Figure 9: Proportion of tables used in EHRCon, covering various clinical events in a hospital such as vital signs, medications, and lab results.

![Refer to caption](x10.png)

Figure 10: Proportion of tables with inconsistencies. Every table exhibited inconsistencies, with the highest rate observed in labevents.

![Refer to caption](x11.png)

Figure 11: Proportion of columns with inconsistencies. The highest frequency of inconsistencies occurred in the date and time columns.

![Refer to caption](x12.png)

Figure 12: Proportion of inconsistencies by column in each note. Unlike discharge summaries and physician notes, nursing notes had the highest occurrence of inconsistencies within the unit.

## Appendix G Prompt

The prompts used in CheckEHR can be found in Figure [13](https://arxiv.org/html/2406.16341v1#A7.F13 "Figure 13 ‣ Appendix G Prompt ‣ EHRCon: Dataset for Checking Consistency between Unstructured Notes and Structured Tables in Electronic Health Records") to [20](https://arxiv.org/html/2406.16341v1#A7.F20 "Figure 20 ‣ Appendix G Prompt ‣ EHRCon: Dataset for Checking Consistency between Unstructured Notes and Structured Tables in Electronic Health Records"). To protect patient privacy, all values in the example data mentioned in the paper have been replaced with fictional values. Additionally, some sentences have been paraphrased or omitted.

In particular, table descriptions and column descriptions were utilized to effectively conduct the table identification and pseudo table creation processes. The descriptions used for this purpose, derived using MIMIC-III documentation121212https://mimic.mit.edu/docs/iii/ and ChatGPT-4, can be found in Table LABEL:desc\_table and Table LABEL:desc\_column.

{longtblr}

\[ caption = Table description used in the Table Identification prompt., label = desc\_table \] colspec = X\[1.4,c,m\]X\[2.2,c,m\]X\[10,l,m\], colsep = 0.3pt, rowhead = 1, hlines, rows=font=, rowsep=0.3pt, Database & Table \\SetCell\[c=1\]cDescription  
MIMIC-III D\_items D\_items provides metadata for all recorded items, including medications, procedures, and other clinical measurements, with unique identifiers, labels, and descriptions.  
MIMIC-III Chartevents Chartevents contains time-stamped clinical data recorded by caregivers, such as vital signs, laboratory results, and other patient observations, with references to the D\_items table for item details.  
MIMIC-III Inputevents\_cv Inputevents\_cv contains detailed data on all intravenous and fluid inputs for patients during their stay in the ICU and uses ITEMID to link to D\_items.  
MIMIC-III Inputevents\_mv The inputevents\_mv table records detailed information about medications and other fluids administered to patients, including dosages, timings, and routes of administration, specifically from the MetaVision ICU system.  
MIMIC-III Microbiologyevents Microbiologyevents contains detailed information on microbiology tests, including specimen types, test results, and susceptibility data for pathogens identified in patient samples. This information is linked to D\_items by ITEMID.  
MIMIC-III Outputevents Records information about fluid outputs from patients, such as urine, blood, and other bodily fluids, including timestamps, amounts, and types of outputs, with references to the D\_items table for item details.  
MIMIC-III D\_labitems D\_labitems contains metadata about laboratory tests, including unique identifiers, labels, and descriptions for each lab test performed.  
MIMIC-III Labevents Labevents contains detailed records of laboratory test results, including test values, collection times, and patient identifiers, with references to the D\_labitems table for test-specific metadata.  
MIMIC-III Prescriptions Lists patient prescriptions with details on dose, administration route, and frequency. There is no reference table.  
MIMIC-III D\_icd\_diagnoses The D\_icd\_diagnoses table provides descriptions and categorizations for ICD diagnosis codes used to classify patient diagnoses.  
MIMIC-III Diagnoses\_icd The Diagnoses\_icd table contains records of ICD diagnosis codes assigned to patients, linking each diagnosis to specific hospital admissions.  
MIMIC-III D\_icd\_procedures D\_icd\_procedures contains definitions and details for ICD procedure codes, including code descriptions and their corresponding categories.  
MIMIC-III Procedures\_icd Procedures\_icd records the procedures performed on patients during their hospital stay, indexed by ICD procedure codes and linked to specific hospital admissions.  
MIMIC-OMOP Concept The concept table is a standardized lookup table that contains unique identifiers and descriptions for all clinical and administrative concepts, providing a consistent way to reference data elements across various healthcare domains.  
MIMIC-OMOP Measurement Table stores quantitative or qualitative data obtained from tests, screenings, or assessments of a patient, including lab results, vital signs, and other measurable parameters related to patient health.  
MIMIC-OMOP Durg\_exposure Drug\_exposure table records details about the dispensing and administration of drugs to a patient, including the drug type, dosage, route, and duration of each drug exposure event.  
MIMIC-OMOP Specimen Specimen table contains details about patient specimens, including type, collection method, and collection context.  
MIMIC-OMOP Condition\_occurrence The table logs instances of clinical conditions diagnosed or reported in a patient, detailing the type of condition, diagnosis date, and source information.  
MIMIC-OMOP Procedure\_occurrence Procedure\_occurrence table captures details of medical procedures performed on a patient, including the type of procedure, date, and relevant context from the healthcare encounter.  
{longtblr} \[ caption = Column description used in the Pseudo Table Creation prompt., label = desc\_column \] colspec = X\[1.4,c,m\]X\[2,c,m\]X\[1.7,c,m\]X\[10,l,m\], colsep = 0.3pt, rowhead = 1, hlines, rows=font=, rowsep=0.3pt, Database & Table Column \\SetCell\[c=1\]cDescription  
MIMIC-III D\_items Label The label column provides a human-readable name for this item. The label could be a description of a clinical observation such as Temperature, blood pressure, and heart rate.  
MIMIC-III D\_labitems Label The label column provides a human-readable name for this item. The label could be a description of a clinical observation such as wbc, glucose, and PTT.  
MIMIC-III D\_icd\_procedures Short\_title Short\_title provides a concise description of medical procedures encoded by ICD-9-CM codes.  
MIMIC-III D\_icd\_procedures Long\_title Long\_title offers a detailed and comprehensive description of medical procedures associated with ICD-9-CM codes.  
MIMIC-III D\_icd\_diagnoses Short\_title Short\_title provides brief descriptions or names of medical diagnoses corresponding to their ICD-9 codes.  
MIMIC-III D\_icd\_diagnoses Long\_title Long\_title offers more detailed descriptions of medical diagnoses corresponding to their ICD-9 codes.  
MIMIC-III Chartevents Charttime Charttime records the time at which an observation occurred and is usually the closest proxy to the time the data was measured, such as admission time or a specific date like 2112-12-12.  
MIMIC-III Chartevents Valuenum This column contains the numerical value of the laboratory test result, offering a quantifiable measure of the test outcome. If this data is not numeric, Valuenum must be null.  
MIMIC-III Chartevents Valueuom Valueuom is the unit of measurement.  
MIMIC-III Inputevents\_cv Charttime Charttime represents the time at which the measurement was charted.  
MIMIC-III Inputevents\_cv Amount Indicates the total quantity of the input given during the charted event.  
MIMIC-III Inputevents\_cv Amountuom Amountuom is the unit of Amount.  
MIMIC-III Inputevents\_cv Rate Details the rate at which the input was administered, typically relevant for intravenous fluids or medications.  
MIMIC-III Inputevents\_cv Rateuom Rateuom is the unit of Rate.  
MIMIC-III Labevents Charttime The Charttime column records the exact timestamp when a laboratory test result was charted or documented (e.g., 2112-12-12).  
MIMIC-III Labevents Valuenum The Valuenum column contains the numeric result of a laboratory test, represented as a floating-point number.  
MIMIC-III Labevents Valueuom The valueuom column specifies the unit of measurement for the numeric result recorded in the Valuenum column.  
MIMIC-III Inputevents\_mv Starttime The Starttime column records the timestamp indicating when the administration of a medication or other clinical intervention was initiated.  
MIMIC-III Inputevents\_mv Endtime The Endtime column records the timestamp indicating when the administration of a medication or other clinical intervention was completed.  
MIMIC-III Inputevents\_mv Amount Amount records the total quantity of a medication or fluid administered to the patient.  
MIMIC-III Inputevents\_mv Amountuom Amountuom specifies the unit of measurement for the amount of medication or fluid administered, such as milliliters (ml) or milligrams (mg).  
MIMIC-III Inputevents\_mv Rate Rate specifies the rate at which a medication or fluid was administered.  
MIMIC-III Inputevents\_mv Rateuom Rateuom specifies the unit of measurement for the rate at which a medication or fluid was administered, such as milliliters per hour (mL/hr).  
MIMIC-III Outputevents Charttime Charttime records the timestamp when an output event, such as urine output or drainage, was documented.  
MIMIC-III Outputevents Valuenum Valuenum contains the numeric value representing the quantity of output, such as the volume of urine or other fluids, recorded as a floating-point number.  
MIMIC-III Outputevents Valueuom Valueuom specifies the unit of measurement for the numeric value recorded in the Valuenum column, such as milliliters (mL).  
MIMIC-III Prescriptions Startdate The Startdate column records the date when a prescribed medication was first ordered or administered to the patient.  
MIMIC-III Prescriptions Enddate The Enddate column records the date when the administration of a prescribed medication was completed or discontinued.  
MIMIC-III Prescriptions Drug The Drug column lists the name of the medication that was prescribed to the patient.  
MIMIC-III Prescriptions Dose\_val\_rx The Dose\_val\_rx column specifies the numeric value of the prescribed dose for the medication.  
MIMIC-III Prescriptions Dose\_unit\_rx The Dose\_unit\_rx column specifies the unit of measurement for the prescribed dose of the medication, such as milligrams (mg) or milliliters (mL).  
MIMIC-III Microbiologyevents Charttime The Charttime column records the timestamp when the microbiological culture result was documented or charted.  
MIMIC-III Microbiologyevents Org\_name The Org\_name column identifies the name of the organism (such as a bacterium or fungus) that was detected in a microbiological culture.  
MIMIC-III Microbiologyevents Spec\_type\_desc The Spec\_type\_desc column describes the type of specimen (such as blood, urine, or tissue) from which the microbiological culture was obtained.  
MIMIC-OMOP Concept Concept\_name The Concept\_name column contains an unambiguous, meaningful, and descriptive name for the Concept.  
MIMIC-OMOP Drug\_exposure Drug\_exposure \_start\_date The start date for the current instance of Drug utilization. Valid entries include a start date of a prescription, the date a prescription was filled, or the date on which a Drug administration procedure was recorded.  
MIMIC-OMOP Drug\_exposure Drug\_exposure \_end\_date The end date for the current instance of Drug utilization. It is not available from all sources.  
MIMIC-OMOP Drug\_exposure Quantity The quantity column records the amount of the drug administered or prescribed, providing essential information for dosage and treatment analysis.  
MIMIC-OMOP Drug\_exposure Dose\_unit \_source\_value The dose\_unit\_source\_value captures the original unit of measurement for the drug dosage as recorded in the source data, preserving the raw data detail for reference and mapping purposes.  
MIMIC-OMOP Measurements Measurement \_datetime The measurement\_datetime records the exact date and time when the measurement was taken, providing precise temporal context for each measurement entry.  
MIMIC-OMOP Measurements Value\_as \_number The value\_as\_number stores the numerical result of the measurement, allowing for quantitative analysis of the recorded data.  
MIMIC-OMOP Measurements Unit\_source \_value The unit\_source\_value captures the original unit of measurement as recorded in the source data, preserving the context of the measurement’s unit before any standardization.  
MIMIC-OMOP Specimen Specimen \_datetime The specimen\_datetime records the exact date and time when the specimen was collected, providing precise temporal context for each specimen entry.  

Prompt Template for Note Segmentation Task : Your task is to analyze a clinical note and divide it into three sections based on thematic or semantic coherence. Each section should center around a unique theme or idea, providing a cohesive view of the content.  
Please follow these guidelines: • Thematic or Semantic Unity: Group content based on clear thematic or semantic relationships, ensuring that each section covers a distinct aspect related to the overall topic. Everything within a section should be related and contribute to a unified understanding of that theme. • Equal Length and Comprehensive Coverage: Strive for a balance in the length of each section, but also consider the depth and breadth of the content. The division should reflect an equitable distribution of information, without sacrificing the completeness of any thematic area. This balance is essential to ensure no single section is overwhelmingly long or short compared to the others. • Integrity of Sections: Pay close attention to the natural divisions within the text, such as headings or topic changes (e.g., ‘History of Present Illness’). Ensure that these content blocks are not fragmented across sections. A section should encompass complete thoughts or topics to preserve the logical flow and coherence of information. • Completeness of Sentences: When dividing the note, ensure each section ends with complete sentences, preventing sentences from being split across sections. • Output format must be \[section1: (start\_line\_number-end\_line\_number), section2: (start\_line\_number-end\_line\_number), section3: (start\_line\_number-end\_line\_number)\]. • Precise Output Format and Continuous Line Coverage: The start line number in section1 should match the start number of the given text and the end line number in section3 should match the last line number of the given text. Ensure sections are contiguous; the end of one section immediately precedes the start of the next, with no gaps or overlaps. Example 1)  
Clinical note: “44. On transfer, vitals were T 97.8, HR 72, BP 118/76, RR 45\. She was alert, but denied dizziness, headache, palpitations,leg pain. 46\. She reported mild shortness of breath, dry cough, mild nausea, lower abdominal 47\. discomfort dry cough, mild nausea, lower abdominal discomfort, and decreased urine. … 70\. MEDICATIONS ON DISCHARGE: 71\. 8. Zoloft 50 mg q.d. 72\. 9. Nexium 20 mg b.i.d. 73\. 10. Tylenol 500 mg q.d.” Output: \[section1: 44-59, section2: 60-69, section3: 70-73\]  
Your task: Clinical note: “<<<<CLINICAL\_NOTE>>>>” The output format must be \[section1: (start\_line\_number(int)-end\_line\_number(int)), section2: (start\_line\_number(int)-end\_line\_number(int)), section3: (start\_line\_number(int)-end\_line\_number(int))\], indicating the line numbers that mark the start and end of each section. Output: \[Write your answer here\]

Figure 13: Prompt Template for Note Segmentation.

Prompt Template for Named Entity Recognition Task : Develop a NER system to identify and categorize specific named entities in clinical texts step by step.  
Guidelines: Extract entities step by step and classify entity. • Category 1: Entities Accompanied by Numeric Values – Definition: This category includes entities that are mentioned along with specific numeric values. These numbers represent measurable data such as dosages, counts, measurements, etc., providing precise quantifiable information. – Example: ‘The glucose level is 100 mg/dL’ or ‘Administer 200 mg of ibuprofen’. In these cases, the numeric values are explicitly stated. • Category 2: Entities Mentioned Without Any Numeric Values – Definition: Entities that are discussed in terms of their presence, occurrence, or the fact that they were administered or performed, without providing any numerical or quantitative data, fall into this category. – ‘The patient has been prescribed antibiotics’ or ‘An MRI scan was conducted’. Here, no specific dosage of antibiotics or quantitative results from the MRI scan are mentioned. • Category 3: Entities with Condition-Related Information Excluding Numeric Values – Definition: This category captures entities related to state, condition, or outcomes that are described through qualitative assessments or descriptions without the use of explicit numeric data. It may include references to changes in condition or stability, described not with numbers but in descriptive or qualitative terms. – Example: ‘Pt had a severe rise in ALT and AST’ or ‘Pulse was dropping’. Although these statements imply a change or assessment of condition, they do not provide specific numeric values. Instead, the focus is on qualitative descriptions of change or status, which may inherently rely on an understanding of baseline or previous values for context. Example 1: Develop a NER system to identify and categorize specific named entities in clinical texts, step by step. Clinical note: “Physical Exam: Patient’s t is 99. Heart shows an irregular rhythm. … LABORATORY DATA: On admission, WBC 11.0, hematocrit 35.0” Step 1) Extract entities related to medication or inputevents and classify each entity. Extract the entity written in the note without modifying it. Answer: Nothing Step 2) Extract entities related to vital signs and classify each entity. Extract the entity written in the note without modifying it. Answer: t - category 1 (numeric value: 99.6), heart rhythm - category 3 (qualitative assessments or descriptions: irregular) … Your task: Develop a NER system to identify and categorize specific named entities in clinical texts step by step. Clinical Note: “<<<<CLINICAL\_NOTE>>>>”

Figure 14: Prompt Template for Named Entity Recognition.

Prompt Template for Time Filtering Task: You are provided with a Discharge summary and are required to analyze time information related to an entity mentioned within the note.  
Example 1) Please answer three questions that focus on {{\*\*chloride\*\*}}. Clinical note: • Admission Date: 1999-11-11 • Date charted on the note: 1999-11-13 • Content: “LABORATORY DATA: On admission, white count 9.3, hematocrit 32, platelet count 365000, PT 14, PTT 30, INR 1.3 sodium 139, potassium 4.8, {{\*\*chloride\*\*}} 102, CO2 26, BUN 51”  
\[Question 1\] Based on the discharge summary provided, did the measurement for {{\*\*chloride\*\*}} occur during the current hospitalization period? Respond with ‘Yes’ if it did, or ‘No’ if it pertains to past medical history or conditions. \[Answer 1\] Yes, because the chloride level was measured after the patient was admitted. \[Question 2\] Extract and note the specific section from the discharge summary that mentions {{\*\*chloride\*\*}}, including any time expression associated with it. Ensure your transcription is accurate and does not infer or add details not present in the note. \[Answer 2\] Note: ‘LABORATORY DATA: On admission, … {{\*\*chloride\*\*}} 102 …’ Time: ‘admission’ \[Question 3\] Determine how the time of the {{\*\*chloride\*\*}} measurement is recorded in the note. Select the appropriate option based on the description provided: 1\. Indeterminate Time stamp: Choose this if the note mentions the event in a vague or general timeframe without specific dates or times 2\. Directly written in the format yyyy-mm-dd: Choose this for notes with specific dates or times in a clear, standardized format 3\. Inferable Time stamp from Narrative: Choose this if the note uses terms like ‘admission’, ‘yesterday’, etc., from which the exact time of the event can be inferred based on context provided in the note. \[Answer 3\] Inferable Time stamp from Narrative Let’s solve three questions that focus on {{\*\*<<<<ENTITY>>>>\*\*}}. Clinical Note: • Admission Date: <<<<ADMISSION>>>> • Date charted on the note: <<<<CHARTTIME>>>> • Content: “<<<<CLINICAL\_NOTE>>>>”  

Figure 15: Prompt Template for Time Filtering.

Prompt Template for Table Identification Task: Select a table based on the provided table schemas and their interconnections within the database that can store specific entity-related information. Focus on tables that are likely to contain columns relevant to the entity you are searching. Requirements: • Output format: \[{table1, reference\_table1},{table2, reference\_table2},…\]. • Choose from the set of table pairs: {Chartevents, D\_items}, {Outputevents, D\_items}, {Microbiologyevents, D\_items}, {Inputevents\_cv, D\_items}, {Diagnoses\_icd, D\_icd\_diagnoses}, {Procedures\_icd, D\_icd\_procedures}, {Prescriptions}, {Inputevents\_mv, D\_items}, {Labevents, D\_labitems}. If ‘ENTITY’ is not clearly recorded in any of the tables, the output should be \[ ‘NONE’\].  
Database Schema: • D\_items: A central reference table with details for items used across multiple tables, linked by ITEMID. – Columns: ‘itemid’, ‘label’, ‘abbreviation’ – Example Rows:  
\- ‘1054’, ‘protonix’, ‘None’  
\- ‘1099’, ‘tegretol’, ‘None’  
• Chartevents: Includes patient observations like vital signs, uses ITEMID to link to D\_items. – Columns: ‘subject\_id’, ‘itemid’, ‘charttime’, ‘valuenum’, ‘valueuom’ – Example Rows:  
\- ‘3’, ‘128’, ‘2101-10-25 04:00:00’, ‘15.0’, ‘points’  
\- ‘13’, ‘263738’, ‘2167-01-10 08:30:00’, ‘84.0’, ‘mmHg’  
Inter-table Relationships: • Labevents is a child of D\_Labitems. • Chartevents, Inputevents\_mv, Inputevents\_cv, Microbiology, Outputevents are children of D\_items. Example 1) Identify the specific tables that contain definitive records of ‘R’ In order to locate the ‘R’ within the database, examine the provided table schemas and their interconnections. Each table’s purpose and the nature of the data they contain should be taken into account. Focus on the relevant columns that could store information related to ‘R’. If no explicit match is found for the entity in question, indicate this with ‘\[none\]’. Selected-Table: \[chartevents, d\_items\] Your task: Identify the specific tables that contain definitive records of ‘<<<<ENTITY>>>>’ In order to locate the ‘<<<<ENTITY>>>>’ within the database, examine the provided table schemas and their interconnections. Each table’s purpose and the nature of the data they contain should be taken into account. Focus on the relevant columns that could store information related to ‘<<<<ENTITY>>>>’. If no explicit match is found for the entity in question, indicate this with ‘\[none\]’. Selected-Table: \[Write your answer here\]

Figure 16: Prompt Template for Table Identification.

Prompt Template for Pseudo Table Creation Task: The objective is to analyze a clinical note to extract specific details about an indicated Entity, focusing solely on information that is directly stated. Instruction: • Carefully examine the clinical note, paying close attention to any instance of the Entity highlighted as {{\*\*Entity\*\*}}. Focus solely on this entity for your analysis. • Rely exclusively on the information provided within the clinical note, guided by the instructions and column descriptions provided. • Extract and document only the information that directly pertains to the {{\*\*Entity\*\*}}, disregarding all other data. • When extracting data, only include information that is explicitly mentioned in the text. Avoid making assumptions or inferring details that are not directly stated. • Each piece of extracted information related to the Entity must be documented in the specified output format in the EHR table, detailed below, with each piece of information in separate rows: ‘Mentioned \[#\]. DRUG: drug, STARTDATE: startdate, ENDDATE: enddate, DOSE\_VAL\_RX: dose\_val\_rx, DOSE\_UNIT\_RX: dose\_unit\_rx’  
Column Descriptions and Schema Information: • Drug: Name of Drug <class ‘str’\> • STARTDATE: Date when the prescription started. <class ‘datetime’\>  
Example 1: Analyze the clinical note to extract {{\*\*Ibuprofen\*\*}} data and document the findings in the EHR table. When Extract data, do not make assumptions or infer details not directly stated in the clinical note, even if this is common knowledge. Clincal Note: “1. Lisinopril 10 mg p.o. 7 days 2\. {{\*\*Ibuprofen \*\*}} 400 mg Tablet Sig: One (1) Tablet PO Q8H (every 8 hours)” Step 1) Identify and Extract Information about ‘{{\*\*Acetaminophen\*\*}}’ in the given text. \[Answer in step 1\]: DISCHARGE MEDICATIONS: … {{\*\*Ibuprofen \*\*}} 400 mg Tablet Step 2) Determine the STARTDATE and ENDDATE step-by-step: Identify when the ‘{{\*\*Ibuprofen\*\*}}’ occurs. \[Answer in step 2\]: When I reviewed the notes, it was mentioned that the STARTDATE would be the NaN. ENDDATE would be NAN. Step 3) Based on the mentions of ‘{{\*\*Ibuprofen\*\*}}’ in the given text found in Step 1 and Step 2, fill in the EHR table with these column headers: DRUG, STARTDATE, ENDDATE, DOSE\_VAL\_RX, DOSE\_UNIT\_RX. \[Answer in step 3\]: As referred to in the answer from step 2, the drug is Ibuprofen. The starttime and enddate would be ‘NAN’. The valuenum should be 400, and the dose\_val\_rx should be in mg. Your Task: Analyze the clinical note to extract {{<<<<ENTITY>>>>}} data and document the findings in the EHR table. When Extract data, do not make assumptions or infer details not directly stated in the clinical note, even if this is common knowledge. Clinical Note: “<<<<CLINICAL\_NOTE>>>>”

Figure 17: Prompt Template for Pseudo Table Creation. The example is a prescriptions table.

Prompt Template for Self Correction Task: You will be given a passage of clinical note along with several questions that relate to specific details within that clinical note. Your job is to determine whether the clinical note explicitly mentions the details asked in the questions. For each question, your response should be divided into two parts: • Evidence quote: Provide a direct quote or the exact sentences from the clinical note that either confirm or refute the detail in question. Additionally, include a brief explanation of why this evidence supports your answer. • Answer: Respond with ‘Yes’ if the detail is explicitly mentioned in the clinical note using the exact words or phrases from the question. If the clnical note does not contain the specific detail, respond with ‘No’. These are the only acceptable response options.  
Example 1: Please answer the questions focusing on the specified entity named ‘Hgb’. Clinical Note: “The patient admitted on 2196-2-18 and this note charted on 2196-2-21. Pertinent Results: \[\*\*2200-07-01\*\*\] 09:25AM BLOOD WBC-7.7 RBC-3.16\* {{\*\*Hgb\*\*}}-13.3\* Hct-37.9\* MCV-90 MCH-31.2 MCHC-32 RDW-12.7 Plt Ct-320” Questions: \[1\] Is it directly mentioned that Hgb’s charttime is ‘2200-07-01’? Evidence quote: “\[\*\*2200-07-01\*\*\] 09:25AM BLOOD WBC-7.7 RBC-3.16\* {{\*\*Hgb\*\*}}-13.3\* Hct-37.9\*” Answer: Yes. The clinical note explicitly mentions the date and time as “2200-07-01” in relation to the Hgb measurement, indicating the charttime for the Hgb value. \[2\] Is it directly mentioned that Hgb’s valuenum is ‘13.3’? Evidence quote: “\[\*\*2200-07-01\*\*\] 09:25AM BLOOD WBC-7.7 RBC-3.16\* {{\*\*Hgb\*\*}}-13.3\* Hct-37.9\*” Answer: Yes. The note explicitly states the Hgb value as ‘13.3’, directly mentioning the numerical value associated with the Hgb measurement. \[3\] Is it directly mentioned that Hgb’s valueuom is ‘g/dL’? Evidence quote: “\[\]” Answer: No. The clinical note mentions “BLOOD Hgb-13.3” but does not specify the unit of measurement for the Hgb value. Your task: Please answer the questions focusing on the specified entity named “<<<<ENTITY>>>>”. Clinical Note: “The patient admitted on <<<<ADMISSION>>>> and this note charted on <<<<CHARTTIME>>>>. <<<<CLINICAL\_NOTE>>>>” Questions: Please maintain the output format. <<<<QUESTIONS>>>>

Figure 18: Prompt Template for Self Correction.

Prompt Template for Value Reformatting Task: Transform Given Data to Match a Database Table Format. Your goal is to modify a set of given data so that it matches the format of an existing database table. The data transformation should adhere to any constraints evident from the table’s structure. Focus solely on the fields provided in the given data and do not add or infer any additional fields. Only transform and include the fields mentioned in the given data. Do not add, create, or infer any additional fields beyond what is specified. Time Information: • Existing Table Schema: {‘Chartevents’: {‘CHARTTIME’: <class ‘datetime’\>, ‘VALUENUM’: <class ‘float’\>, ‘VALUEUOM’ : <class ‘str’\>}, ‘D\_items’: {‘LABEL’: <class ‘str’\>}} • Example rows of Chartevents and D\_items tables – Chartevents.CHARTTIME: 2200-11-03 – Chartevents.VALUENUM: 30.0 – Chartevents.VALUEUOM: % – D\_items.LABEL: Monocytes • CHARTTIME uses a 24-hour format. • If the given data includes relative dates, replace it with the corresponding actual date from the patient’s record.  
Example 1) • Information: – Admission Date: 1999-11-11 – Date charted on the note: 1999-11-13 • Given Data: – Chartevents.CHARTTIME: \[\*\*2208-11-08\*\*\] 8:00 PM – Chartevents.VALUENUM: 7.10 – Chartevents.VALUEUOM: mg/dL – D\_items.LABEL: Blasts • Output: – Chartevents.CHARTTIME: 2208-11-08 20:00:00 – Chartevents.VALUENUM: 7.10 – Chartevents.VALUEUOM: mg/dL – D\_items.LABEL: Blasts  
Your Task: • Information – Admission Date: <<<ADMISSION>>> – Date charted on the note: <<<CHARTTIME>>> • Given Data: <<<GIVEN\_DATA>>> • Output: \[Only print answer here with structured format tablename.columnname = value\]

Figure 19: Prompt Template for Value Reformatting. The example is a Chartevents table.

Prompt Template for Query Generation Task: You are a highly intelligent and accurate sqlite3 query creator. You take a \[{tablename}.{columnname} = {condition value}\] and given extra information and turn it into a \[SQLite3 query\]. Please Use only the information given. Your output format is a dictionary with a single key ‘Q’ and the value is the SQLite3 query, so \[{‘Q’: Query}\] form. And begin the query with “SELECT \*”, to retrieve all columns. Rules: \- Utilize strftime to maintain the given time format. \- The ‘Chartevents’ and ‘D\_items’ tables need to be joined using the ‘itemid’ as the key for the join operation. Example 1) \[{table}.{column} = {condition value}\] Chartevents.hadm\_id = 12345 Chartevents.valuenum = 94.0 Chartevents.valueuom = mmHg Chartevents.charttime = ‘2000-11-11’ D\_items.label = ‘BP’ Output: \[{“Q”: “SELECT \* FROM Chartevents JOIN D\_items ON Chartevents.itemid = D\_items.itemid WHERE Chartevents.hadm\_id = 12345 AND Chartevents.valuenum = 94.0 AND Chartevents.valueuom = ‘mmHg’ AND strftime(‘%Y-%m-%d’, Chartevents.charttime) = ‘2000-11-11’ AND D\_items.label = ‘BP”’}\] Example 2) \[{table}.{column} = {condition value}\] Chartevents.hadm\_id = 14456 Chartevents.valuenum = 36.7 D\_items.label = ‘Temp’ Chartevents.charttime = ‘2331-02-11 21:32:33’ Output:\[{“Q”: “SELECT \* FROM Chartevents JOIN D\_items ON Chartevents.itemid = D\_items.itemid WHERE Chartevents.hadm\_id = 14456 AND Chartevents.valuenum = 36.7 AND D\_items.label = ‘Temp’ AND strftime(‘%Y-%m-%d %H:%M:%S’, Chartevents.charttime) = ‘2331-02-11 21:32:33”’}\] Your task) \[{table}.{column} = {condition value}\] Chartevents.hadm\_id = <<<<HADM\_ID>>>> Output: \[Write your answer here\]

Figure 20: Prompt Template for Query Generation. This is an example where the date is written in the yyyy-mm-dd (hh:mm:ss) format.

## Appendix H Note Segmentation

Algorithm [1](https://arxiv.org/html/2406.16341v1#alg1 "Algorithm 1 ‣ Appendix H Note Segmentation ‣ EHRCon: Dataset for Checking Consistency between Unstructured Notes and Structured Tables in Electronic Health Records") provides a summary of the note segmentation process, with a detailed example illustrated in Figure [21](https://arxiv.org/html/2406.16341v1#A8.F21 "Figure 21 ‣ Appendix H Note Segmentation ‣ EHRCon: Dataset for Checking Consistency between Unstructured Notes and Structured Tables in Electronic Health Records").

Algorithm 1 Note Segmentation Process

0:  Clinical Note P𝑃Pitalic\_P, Maximum Length of Subtext l𝑙litalic\_l, Number of Subtexts n𝑛nitalic\_n

0:  Set of Subtexts 𝒯𝒯\\mathcal{T}caligraphic\_T

1:  𝒯←∅,i←0,Pi←Pformulae-sequence←𝒯formulae-sequence←𝑖0←subscript𝑃𝑖𝑃\\mathcal{T}\\leftarrow\\emptyset,i\\leftarrow 0,P\_{i}\\leftarrow Pcaligraphic\_T ← ∅ , italic\_i ← 0 , italic\_P start\_POSTSUBSCRIPT italic\_i end\_POSTSUBSCRIPT ← italic\_P

2:  while T⁢o⁢k⁢e⁢n⁢L⁢e⁢n⁢(Pi)𝑇𝑜𝑘𝑒𝑛𝐿𝑒𝑛subscript𝑃𝑖TokenLen(P\_{i})italic\_T italic\_o italic\_k italic\_e italic\_n italic\_L italic\_e italic\_n ( italic\_P start\_POSTSUBSCRIPT italic\_i end\_POSTSUBSCRIPT ) \>labsent𝑙\>l\> italic\_l do

3:     Pif,Pib←D⁢i⁢v⁢i⁢d⁢e⁢B⁢y⁢L⁢e⁢n⁢(Pi,l)←subscriptsuperscript𝑃𝑓𝑖subscriptsuperscript𝑃𝑏𝑖𝐷𝑖𝑣𝑖𝑑𝑒𝐵𝑦𝐿𝑒𝑛subscript𝑃𝑖𝑙P^{f}\_{i},P^{b}\_{i}\\leftarrow DivideByLen(P\_{i},l)italic\_P start\_POSTSUPERSCRIPT italic\_f end\_POSTSUPERSCRIPT start\_POSTSUBSCRIPT italic\_i end\_POSTSUBSCRIPT , italic\_P start\_POSTSUPERSCRIPT italic\_b end\_POSTSUPERSCRIPT start\_POSTSUBSCRIPT italic\_i end\_POSTSUBSCRIPT ← italic\_D italic\_i italic\_v italic\_i italic\_d italic\_e italic\_B italic\_y italic\_L italic\_e italic\_n ( italic\_P start\_POSTSUBSCRIPT italic\_i end\_POSTSUBSCRIPT , italic\_l )

4:     Pi,1f,Pi,2f,…,Pi,nf,←DivideByLLM(Pif,n)P^{f}\_{i,1},P^{f}\_{i,2},...,P^{f}\_{i,n},\\leftarrow DivideByLLM(P^{f}\_{i},n)italic\_P start\_POSTSUPERSCRIPT italic\_f end\_POSTSUPERSCRIPT start\_POSTSUBSCRIPT italic\_i , 1 end\_POSTSUBSCRIPT , italic\_P start\_POSTSUPERSCRIPT italic\_f end\_POSTSUPERSCRIPT start\_POSTSUBSCRIPT italic\_i , 2 end\_POSTSUBSCRIPT , … , italic\_P start\_POSTSUPERSCRIPT italic\_f end\_POSTSUPERSCRIPT start\_POSTSUBSCRIPT italic\_i , italic\_n end\_POSTSUBSCRIPT , ← italic\_D italic\_i italic\_v italic\_i italic\_d italic\_e italic\_B italic\_y italic\_L italic\_L italic\_M ( italic\_P start\_POSTSUPERSCRIPT italic\_f end\_POSTSUPERSCRIPT start\_POSTSUBSCRIPT italic\_i end\_POSTSUBSCRIPT , italic\_n )

5:     𝒯←𝒯∪{Pi,1f,Pi,2f,…⁢Pi,n−1f}←𝒯𝒯subscriptsuperscript𝑃𝑓𝑖1subscriptsuperscript𝑃𝑓𝑖2…subscriptsuperscript𝑃𝑓𝑖𝑛1\\mathcal{T}\\leftarrow\\mathcal{T}\\cup\\{P^{f}\_{i,1},P^{f}\_{i,2},...P^{f}\_{i,n-1}\\}caligraphic\_T ← caligraphic\_T ∪ { italic\_P start\_POSTSUPERSCRIPT italic\_f end\_POSTSUPERSCRIPT start\_POSTSUBSCRIPT italic\_i , 1 end\_POSTSUBSCRIPT , italic\_P start\_POSTSUPERSCRIPT italic\_f end\_POSTSUPERSCRIPT start\_POSTSUBSCRIPT italic\_i , 2 end\_POSTSUBSCRIPT , … italic\_P start\_POSTSUPERSCRIPT italic\_f end\_POSTSUPERSCRIPT start\_POSTSUBSCRIPT italic\_i , italic\_n - 1 end\_POSTSUBSCRIPT }

6:     Pi+1←M⁢e⁢r⁢g⁢e⁢T⁢e⁢x⁢t⁢(Pi,nf,Pib)←subscript𝑃𝑖1𝑀𝑒𝑟𝑔𝑒𝑇𝑒𝑥𝑡subscriptsuperscript𝑃𝑓𝑖𝑛subscriptsuperscript𝑃𝑏𝑖P\_{i+1}\\leftarrow MergeText(P^{f}\_{i,n},P^{b}\_{i})italic\_P start\_POSTSUBSCRIPT italic\_i + 1 end\_POSTSUBSCRIPT ← italic\_M italic\_e italic\_r italic\_g italic\_e italic\_T italic\_e italic\_x italic\_t ( italic\_P start\_POSTSUPERSCRIPT italic\_f end\_POSTSUPERSCRIPT start\_POSTSUBSCRIPT italic\_i , italic\_n end\_POSTSUBSCRIPT , italic\_P start\_POSTSUPERSCRIPT italic\_b end\_POSTSUPERSCRIPT start\_POSTSUBSCRIPT italic\_i end\_POSTSUBSCRIPT )

7:     i←i+1←𝑖𝑖1i\\leftarrow i+1italic\_i ← italic\_i + 1

8:  end while

9:  𝒯←𝒯∪{Pi}←𝒯𝒯subscript𝑃𝑖\\mathcal{T}\\leftarrow\\mathcal{T}\\cup\\{P\_{i}\\}caligraphic\_T ← caligraphic\_T ∪ { italic\_P start\_POSTSUBSCRIPT italic\_i end\_POSTSUBSCRIPT }

10:  𝒯←M⁢a⁢k⁢e⁢I⁢n⁢t⁢e⁢r⁢s⁢e⁢c⁢t⁢i⁢o⁢n⁢(𝒯)←𝒯𝑀𝑎𝑘𝑒𝐼𝑛𝑡𝑒𝑟𝑠𝑒𝑐𝑡𝑖𝑜𝑛𝒯\\mathcal{T}\\leftarrow MakeIntersection(\\mathcal{T})caligraphic\_T ← italic\_M italic\_a italic\_k italic\_e italic\_I italic\_n italic\_t italic\_e italic\_r italic\_s italic\_e italic\_c italic\_t italic\_i italic\_o italic\_n ( caligraphic\_T )

11:  return  𝒯𝒯\\mathcal{T}caligraphic\_T

![Refer to caption](x13.png)

Figure 21: Overall process of Note Segmentation where n𝑛nitalic\_n is 3.

## Appendix I Process of Creating Pseudo Table

An example of the process for creating a pseudo table is described in Figure [22](https://arxiv.org/html/2406.16341v1#A9.F22 "Figure 22 ‣ Appendix I Process of Creating Pseudo Table ‣ EHRCon: Dataset for Checking Consistency between Unstructured Notes and Structured Tables in Electronic Health Records").

![Refer to caption](x14.png)

Figure 22: The overall process of creating a pseudo table. First, the LLM identifies sentences about a given entity (BP) in the text. Then, it finds time information in those sentences and uses this information to complete the pseudo table.

## Appendix J Hallucination of LLMs

Examples of hallucination in LLMs are described in Figure [23](https://arxiv.org/html/2406.16341v1#A10.F23 "Figure 23 ‣ Appendix J Hallucination of LLMs ‣ EHRCon: Dataset for Checking Consistency between Unstructured Notes and Structured Tables in Electronic Health Records").

![Refer to caption](x15.png)

Figure 23: Examples of hallucination in LLMs. There have been many instances where the LLM generated non-existent information from clinical notes to create pseudo tables. In the left box, a pseudo table was created with the unit listed as ‘mmHg’, which was not mentioned in the note. In the right box, a pseudo table was created with the charttime listed as ‘admission’, based on the ‘PHYSICAL EXAMINATION’ section, which was not explicitly mentioned.

## Appendix K Experiments using Original Notes

The results using the unfiltered original notes are reported in Table [5](https://arxiv.org/html/2406.16341v1#A11.T5 "Table 5 ‣ Appendix K Experiments using Original Notes ‣ EHRCon: Dataset for Checking Consistency between Unstructured Notes and Structured Tables in Electronic Health Records"). Clinical notes often contain not only information related to the current hospitalization but also past medical history or future plans, which can be difficult to discern from tables. To effectively filter this information, we use a Time Filtering step where an LLM determines if the entity occurred during the current hospitalization. We proceed with further steps (e.g., pseudo table creation) only if the LLM determines that the entity is relevant to the current hospitalization. The experimental results showed that Recall and Precision decreased by approximately 12.73% and 8.31%, respectively, compared to the filtered notes. This indicates that the current LLMs lack the reasoning ability to understand clinical notes and determine whether each event occurred during the current admission.

Table 5: Results using the unfiltered original notes. We conduct experiments using a few-shot setting.

Models

Discharge Summary

Physician Note

Nursing Note

Total

Rec

Prec

Inters

Rec

Prec

Inters

Rec

Prec

Inters

Rec

Prec

Inters

Tulu2

31.90

40.75

69.18

39.78

43.43

85.64

39.07

29.10

68.56

36.91

37.76

74.46

Mixtral

39.16

37.32

72.52

37.55

40.86

99.11

47.86

31.38

70.08

41.52

36.52

81.57

Llama-3

41.91

36.88

69.34

37.2

40.44

79.37

32.09

27.20

54.23

37.06

34.84

67.64

## Appendix L Experiments Setting Details

### L.1 Examples of Evaluation Metrics

We measured the performance of the framework using the following three metrics: Recall, Precision, and Intersection. We demonstrate how these metrics are calculated with the following examples. Consider the gold entity set 𝒢\={{e1,i},{e2,c},{e3,c}}𝒢subscript𝑒1𝑖subscript𝑒2𝑐subscript𝑒3𝑐\\mathcal{G}=\\{\\{e\_{1},i\\},\\{e\_{2},c\\},\\{e\_{3},c\\}\\}caligraphic\_G = { { italic\_e start\_POSTSUBSCRIPT 1 end\_POSTSUBSCRIPT , italic\_i } , { italic\_e start\_POSTSUBSCRIPT 2 end\_POSTSUBSCRIPT , italic\_c } , { italic\_e start\_POSTSUBSCRIPT 3 end\_POSTSUBSCRIPT , italic\_c } }, and the recognized entity set ℛ\={{e1,i},{e3,i},{e4,c}}ℛsubscript𝑒1𝑖subscript𝑒3𝑖subscript𝑒4𝑐\\mathcal{R}=\\{\\{e\_{1},i\\},\\{e\_{3},i\\},\\{e\_{4},c\\}\\}caligraphic\_R = { { italic\_e start\_POSTSUBSCRIPT 1 end\_POSTSUBSCRIPT , italic\_i } , { italic\_e start\_POSTSUBSCRIPT 3 end\_POSTSUBSCRIPT , italic\_i } , { italic\_e start\_POSTSUBSCRIPT 4 end\_POSTSUBSCRIPT , italic\_c } }, where ensubscript𝑒𝑛e\_{n}italic\_e start\_POSTSUBSCRIPT italic\_n end\_POSTSUBSCRIPT represents an entity, i𝑖iitalic\_i indicates Inconsistent, and c𝑐citalic\_c indicates Consistent. In this situation, the Recall is 33.33% because only 1 out of the 3 labeled entities, {e1,i}subscript𝑒1𝑖\\{e\_{1},i\\}{ italic\_e start\_POSTSUBSCRIPT 1 end\_POSTSUBSCRIPT , italic\_i }, was correctly classified. Similarly, the Precision is 33.33% since only 1 out of the 3 recognized entities, {e1,i}subscript𝑒1𝑖\\{e\_{1},i\\}{ italic\_e start\_POSTSUBSCRIPT 1 end\_POSTSUBSCRIPT , italic\_i }, was accurate. However, the Intersection is 50.00% because the intersection of the gold and recognized sets includes 2 entities, {e1,i}subscript𝑒1𝑖\\{e\_{1},i\\}{ italic\_e start\_POSTSUBSCRIPT 1 end\_POSTSUBSCRIPT , italic\_i } and {e3,i}subscript𝑒3𝑖\\{e\_{3},i\\}{ italic\_e start\_POSTSUBSCRIPT 3 end\_POSTSUBSCRIPT , italic\_i }, and only 1 of these, {e1,i}subscript𝑒1𝑖\\{e\_{1},i\\}{ italic\_e start\_POSTSUBSCRIPT 1 end\_POSTSUBSCRIPT , italic\_i }, was correctly classified.

### L.2 Number of In-Context Examples

We carefully designed in-context examples for each stage to maximize the performance of the framework. We provided 15 examples for Table Identification stage and 2 examples for all other stages.

## Appendix M Results of MIMIC-III and MIMIC-OMOP

Table [6](https://arxiv.org/html/2406.16341v1#A13.T6 "Table 6 ‣ Appendix M Results of MIMIC-III and MIMIC-OMOP ‣ EHRCon: Dataset for Checking Consistency between Unstructured Notes and Structured Tables in Electronic Health Records") presents the experimental results categorized by entity type and note type from both MIMIC-III and MIMIC-OMOP.

Table 6: The results of MIMIC-III and MIMIC-OMOP. This performance metric is Recall.

Data

Type

Model

Discharge Summary

Physician Note

Nursing Note

Total

MIMIC-III

Type 1

Tulu2

69.26

73.38

68.75

66.79

Mixtral

68.70

75.50

68.93

59.21

Llama3

65.15

72.88

59.21

65.74

Type 2

Tulu2

19.56

43.06

40.34

34.32

Mixtral

19.49

47.38

49.47

38.31

Llama3

20.10

42.76

56.68

39.84

MIMIC-OMOP

Type 1

Tulu2

54.93

52.41

54.75

54.03

Mixtral

51.88

57.34

47.98

52.40

Llama3

51.17

53.35

53.08

52.53

Type 2

Tulu2

49.77

47.13

47.05

47.98

Mixtral

50.50

35.41

50.41

45.44

Llama3

54.16

53.23

49.85

52.41

## Appendix N Component Analysis of CheckEHR

All main experiments utilized the Item Search Tool (see Sec. [3.2](https://arxiv.org/html/2406.16341v1#S3.SS2 "3.2 Item Search Tool ‣ 3 EHRCon ‣ EHRCon: Dataset for Checking Consistency between Unstructured Notes and Structured Tables in Electronic Health Records")) to search for items related to entities in the database. However, the actual annotated data also includes instances where annotators manually searched for items in the database when the search tool did not yield results. As seen in Table [8](https://arxiv.org/html/2406.16341v1#A14.T8 "Table 8 ‣ Appendix N Component Analysis of CheckEHR ‣ EHRCon: Dataset for Checking Consistency between Unstructured Notes and Structured Tables in Electronic Health Records"), the experiment showed that using both the outputs from the Item Search Tool and the additional manual annotations by annotators resulted in an increase in Recall and Precision by 1.75% and 4.85%, respectively, compared to using only the Item Search Tool. Therefore, future work should explore methods to find semantically similar items in the database, rather than relying solely on the surface form of the entity.

Table [7](https://arxiv.org/html/2406.16341v1#A14.T7 "Table 7 ‣ Appendix N Component Analysis of CheckEHR ‣ EHRCon: Dataset for Checking Consistency between Unstructured Notes and Structured Tables in Electronic Health Records") shows the results of experiments for component analysis conducted by matching entities with items in the database, including items added by the Item Search Tool and annotators. The open-source models also demonstrated an average performance improvement of 10% in each setting, proving that each stage plays a crucial role in solving this task. Unlike other models that showed significant performance improvements in the second and third settings, Llama3’s Recall remained at 74.96% in the third setting. This indicates that Llama3’s SQL query generation capability is inferior to that of other models. By understanding the performance of each LLM in different settings and addressing their shortcomings, the framework’s performance will be significantly enhanced.

Table 7: Component Analysis Result

Models

Experiment Setting

Rec

Prec

Models

Experiment Setting

Rec

Prec

Tulu2

CheckEHR

50.69

45.93

Llama3

CheckEHR

53.86

41.57

\- NER

61.86

74.27

\- NER

60.33

64.67

\- (Table Identification + Time Filtering)

67.53

69.69

\- (Table Identification + Time Filtering)

67.12

68.81

\- Pseudo Table Creation

90.35

93.27

\- Pseudo Table Creation

74.96

87.32

Mixtral

CheckEHR

54.92

44.60

GPT-3.5 (0613)

CheckEHR

65.45

50.75

\- NER

66.35

70.51

\- NER

76.11

77.70

\- (Table Identification + Time Filtering)

70.05

74.86

\- (Table Identification + Time Filtering)

82.49

78.99

\- Pseudo Table Creation

86.06

91.26

\- Pseudo Table Creation

92.83

94.93

Table 8: Results of experiments for component analysis conducted by matching entities with items in the database. In our experiment, we bypassed the named entity recognition (NER) step and directly provided gold entities. -Additional Manual Annotation uses only the Item Search Tool, whereas +Additional Manual Annotation uses both the Item Search Tool and additional manual annotation.

Model

\-Additional

Manual Annotation

+Additional

Manual Annotation

Rec

Prec

Rec

Prec

Tulu2

61.56

65.07

61.86

74.27

Mixtral

65.07

70.21

66.35

70.51

Llama3

59.23

56.16

60.33

64.67

GPT-3.5 (0613)

71.81

76.25

76.11

77.70

## Appendix O Sample data of EHRCon

The sample data of EHRCon is described in Figure [24](https://arxiv.org/html/2406.16341v1#A15.F24 "Figure 24 ‣ Appendix O Sample data of EHRCon ‣ EHRCon: Dataset for Checking Consistency between Unstructured Notes and Structured Tables in Electronic Health Records").

![Refer to caption](x16.png)

Figure 24: These are sample datas of EHRCon. The ‘Tmax’ example illustrates an inconsistent case, while the ‘aspirin’ example demonstrates a consistent case. The ‘tag’ provides the results of the verification, the ‘errors’ indicate the number of errors, and the ‘position’ refers to the sentence number containing each entity. The ‘entity\_type’ of ‘1’ indicates that a numeric value is clearly shown, while the ‘entity\_type’ of ‘2’ means that the presence of the entity in the database is sufficient for verification. If the ‘time’ is marked as ‘NaN’, it means there is no time information associated with the entity. In the provided samples, all entities and values have been altered to prevent patient identification, and the sentences within the clinical notes have been rephrased with some content added or removed.

## Appendix P Author statement

The authors of this paper bear all responsibility in case of violation of rights, etc. associated with EHRCon.
