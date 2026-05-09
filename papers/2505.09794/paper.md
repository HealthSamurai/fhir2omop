# Automated Detection of Clinical Entities in Lung and Breast Cancer Reports Using NLP Techniques

- arXiv: [2505.09794v1](https://arxiv.org/abs/2505.09794v1)
- Published: 2025-05-14
- Source: `https://arxiv.org/html/2505.09794v1`

---
\\UseRawInputEncoding

\[a\]\\fnmJ. \\surMoreno-Casanova

a\]\\orgdivDepartment of Artificial Intelligence and Big Data, \\orgnameGMV, \\orgaddress\\streetIsaac Newton 11, \\cityTres Cantos, \\postcode28760, \\stateMadrid, \\countrySpain

b\]\\orgnameHealth Research Institute Hospital La Fe, \\orgaddress\\streetAvinguda de Fernando Abril Martorell, 106, \\cityValencia, \\postcode46026, \\stateValencia, \\countrySpain

# Automated Detection of Clinical Entities in Lung and Breast Cancer Reports Using NLP Techniques

[julia.moreno.casanova@gmv.com](mailto:julia.moreno.casanova@gmv.com)    \\fnmJ.M. \\surAuñón    \\fnmA. \\surMártinez-Pérez    \\fnmM.E. \\surPérez-Martínez    \\fnmM.E. \\surGas-López \[ \[

###### Abstract

Many clinical research projects, including those focused on cancer, rely on the manual extraction of information from clinical reports. This process is both time-consuming and prone to errors, limiting the efficiency of data-driven approaches in healthcare. To address these challenges, Natural Language Processing (NLP) offers an alternative for automating the extraction of relevant data from electronic health records (EHRs). In this study, we focus on lung and breast cancer due to their high incidence and the significant impact they have on public health. Early detection and effective data management in both types of cancer are crucial for improving patient outcomes.

To enhance the accuracy and efficiency of data extraction, we utilized GMV’s NLP tool uQuery, which excels at identifying relevant entities in clinical texts and converting them into standardized formats such as SNOMED and OMOP. uQuery not only detects and classifies entities but also associates them with contextual information, including negated entities, temporal aspects, and patient-related details.

In this work, we explore the use of NLP techniques, specifically Named Entity Recognition (NER), to automatically identify and extract key clinical information from EHRs related to these two cancers. A dataset from Health Research Institute Hospital La Fe (IIS La Fe), comprising 200 annotated breast cancer and 400 lung cancer reports, was used, with eight clinical entities manually labeled using the Doccano platform. To perform NER, we fine-tuned the bsc-bio-ehr-en3 model, a RoBERTa-based biomedical linguistic model pre-trained in Spanish. Fine-tuning was performed using the Transformers architecture, enabling accurate recognition of clinical entities in these cancer types. Our results demonstrate strong overall performance, particularly in identifying entities like MET and PAT, although challenges remain with less frequent entities like EVOL. The incorporation of a text pre-processing layer significantly improved the accuracy of entity recognition, reflected in high precision, recall, and F1 scores across most entities in both validation and test sets.

###### keywords:

NER, NLP, clinical records, lung cancer, breast cancer, uQuery

## 1 Introduction

As is well known, lung cancer is one of the most common and deadly carcinomas worldwide \[[1](https://arxiv.org/html/2505.09794v1#bib.bib1)\]. In fact, its survival rate is lower compared to many other major cancers \[[1](https://arxiv.org/html/2505.09794v1#bib.bib1)\]. Thus, in order to improve the patient’s survival rate, early detection is key. However, lung cancer is not the only carcinoma that stands out in this aspect. Although breast cancer has a higher survival rate than lung cancer, in 2020 2.3 million women were diagnosed with it, with 685,000 deaths reported worldwide \[[2](https://arxiv.org/html/2505.09794v1#bib.bib2)\]. So, as with lung cancer, early and accurate detection can save many lives.

Given the critical importance of early detection, it becomes imperative to leverage comprehensive patient data to inform clinical decisions. This data is predominantly stored in electronic health records (EHRs), which have become integral to modern clinical care. Among the various types of data in EHRs, clinical notes are particularly valuable as they contain detailed, narrative descriptions of patient conditions, treatments, and responses. These records present a significant opportunity for generating large-scale real-world evidence (RWE) that can inform the development of new biomarkers, therapies, and clinical decision-support systems. However, extracting actionable insights from EHRs is challenging due to the prevalence of unstructured data formats, such as free-text notes, which are often complicated by specialized medical terminology, abbreviations, and unique documentation practices.

To address these challenges, researchers have developed various natural language processing (NLP) techniques for automating the clinical information extraction process. Clinical named entity recognition (NER) is a critical NLP task that focuses on identifying and categorizing key clinical entities, such as medical conditions, treatments, and tests. By automating this process, the time and effort required for manual chart review and coding by health professionals can be significantly reduced, thus improving patient care efficiency and accelerating clinical research.

It should be noted that this methodology is based on GMV’s NLP tool uQuery\[[3](https://arxiv.org/html/2505.09794v1#bib.bib3)\], which excels at identifying relevant entities in clinical texts and converting them into standardized formats such as SNOMED and OMOP. uQuery not only detects and classifies entities but also associates them with contextual information, including negated entities, temporal aspects, and patient-related details. Additionally, the tool integrates with doccano \[[4](https://arxiv.org/html/2505.09794v1#bib.bib4)\], an open-source correction system, allowing for manual adjustments and enhancements to the entity recognition process. This ensures that entities are accurately captured and refined in future iterations. uQuery also features a significant pre-processing layer that effectively captures a wide range of entities, minimizing the risk of losing essential information.

The structure of this document is as follows: Section 2 provides an overview of the study’s background, objectives, literature review, and the significance or contribution of this study to the field. Section 3 describes the methodology, including dataset details, model training, and validation procedures. Section 4 presents the results and statistical analyses, and Section 5 concludes with a summary of findings and their implications for cancer research.

## 2 Background

In this section, various algorithms that provide the background for the methods proposed in this paper are reviewed, as introduced in [1](https://arxiv.org/html/2505.09794v1#S1 "1 Introduction ‣ Automated Detection of Clinical Entities in Lung and Breast Cancer Reports Using NLP Techniques"). These algorithms are essential for understanding the theoretical and practical aspects of the approach, offering a comprehensive background to the innovations and improvements presented.

First of all, the work of Fang et al. \[[5](https://arxiv.org/html/2505.09794v1#bib.bib5)\] will be reviewed. This study focuses on extracting clinical entities from Chinese electronic medical records (EMRs) of patients with pituitary adenomas (a common pituitary disorder affecting young adults). The goal is to enable machines to intelligently process and automatically extract clinical named entities from unstructured texts in EMRs.Data from a neurosurgery treatment center in China were used, analyzing 500 patient records \[[5](https://arxiv.org/html/2505.09794v1#bib.bib5)\]. Four methods were applied: dictionary-based matching, Conditional Random Fields (CRF), BiLSTM-CRF, and BERT-BiLSTM-CRF. Specifically, the BERT-BiLSTM-CRF model achieved the highest performance in most cases, particularly in extracting symptoms, body regions, and diseases \[[5](https://arxiv.org/html/2505.09794v1#bib.bib5)\]. The study demonstrates that deep learning methods are effective in extracting clinical entities from Chinese electronic medical records (EMRs), highlighting their potential for broader application in diverse medical texts.

This research aligns with our objective of developing methods for the effective and accurate extraction of clinical information. Furthermore, our study aims to address the limitations identified in Fang et al.’s work by applying these techniques to a different dataset, specifically focusing on lung and breast cancer reports, and enhancing performance through further refinements tailored to these contexts.

Several researchers have adopted similar approaches: Zhang et al. \[[6](https://arxiv.org/html/2505.09794v1#bib.bib6)\] used a fine-tuned BERT model to extract clinical information specific to breast cancer-related texts, demonstrating the model’s adaptability to different types of clinical data. Obeid et al. \[[7](https://arxiv.org/html/2505.09794v1#bib.bib7)\] utilized a convolutional neural network (CNN) to detect mental status indicators within emergency department clinical notes, demonstrating the versatility of machine learning models in various clinical contexts. These studies underscore the significance of leveraging advanced machine learning models for clinical named entity recognition (NER), which is a critical component of our proposed methodology. Our work builds on these approaches by integrating additional contextual information and refining the models to enhance accuracy and applicability.

Another interesting paper is that of Paolo D, Bria A, Greco C, et al.\[[8](https://arxiv.org/html/2505.09794v1#bib.bib8)\]. This study addresses NER for extracting clinical information from Italian EHRs of patients with non-small cell lung cancer (NSCLC). The research focuses on improving a previous model by expanding the set of clinical entities from 25 to 29, including negated entities (e.g., absence of symptoms). The authors applied a BERT-based model \[[8](https://arxiv.org/html/2505.09794v1#bib.bib8)\] to an annotated dataset of 257 NSCLC patients (CLARO \[[8](https://arxiv.org/html/2505.09794v1#bib.bib8)\]) and evaluated its performance. Results showed that including negated entities increased the complexity and slightly decreased the model’s performance. Despite this, the study highlights the effectiveness of NER in extracting comprehensive clinical information (in our paper, we will demonstrate similar effectiveness in applying this technique to our specific dataset), including both present and absent health characteristics, which could enhance patient care and support personalized health and prognostic tasks \[[8](https://arxiv.org/html/2505.09794v1#bib.bib8)\].

These studies underscore the significance of advanced algorithms in the accurate extraction and analysis of clinical information, providing a foundation for the methodologies proposed in this paper.

## 3 Methods

In this chapter, the methodologies and processes followed to apply NER to clinical texts will be explained. The dataset composition is first described, followed by an explanation of the selected model and the techniques used. A method pipeline, as illustrated in Figure [1](https://arxiv.org/html/2505.09794v1#S3.F1 "Figure 1 ‣ 3 Methods ‣ Automated Detection of Clinical Entities in Lung and Breast Cancer Reports Using NLP Techniques") integrates all stages of the process, starting with data preparation. This is followed by the fine-tuning of a cancer-specific NER model and its subsequent application to pseudonymized clinical records extracted from the IIS La Fe Big Data Platform, culminating in the detection of relevant entities, such as EVOL (evolution), FACTR (risk factors), ANTPERSON (personal history, specific to lung cancer), MUTAC (genetic mutations, specific to lung cancer), MET (method of diagnosis), PAT (pathology), SINT (symptomatology), and TTO (treatment). This integrated approach ensures an effective implementation of NER, enabling the extraction of clinically relevant information while adhering to established guidelines and regulations.

\\bmhead

Ethical Approval and Informed Consent Statement All procedures in this study adhered to established guidelines and regulations. The study received approval from the relevant legal and ethical boards on 01 26, 2024. This included the ethics committee for biomedical research involving medicines at the University and Polytechnic La Fe Hospital in Valencia, with registration number 2021-686-1. This committee adheres to Good Clinical Practice (GCP) standards (CPMP/ICH/135/95) and complies with the applicable legal frameworks governing its operations. The committee confirmed that there were no conflicts of interest in the assessment and approval of the study, affirming that the project aligns with ethical guidelines for biomedical research involving human subjects and is feasible in terms of its scientific approach, objectives, materials, and methods as detailed in the application.

Due to retrospective nature of the study the informed consent has been waived by the approval committee. The legal basis for processing personal data is supported by anonymized or pseudonymized data handling, as permitted under Spanish law, particularly Article 16.3 of Law 41/2002 of November 14, which governs patient rights and clinical information, and in the second paragraph of the seventeenth additional provision regarding health data processing in Organic Law 3/2018 of December 5, on the Protection of Personal Data and the Guarantee of Digital Rights.

![Refer to caption](x1.png)

Figure 1: Proposed method pipeline, illustrating the stages of the process, from dataset preparation, fine-tuning of the cancer-specific NER model, to the application of the model to pseudonymized clinical records extracted from the Big Data Platform of IIS La Fe and the detection of entities within them.

### 3.1 Data Source

The University and Polytechnic La Fe Hospital in Valencia serves as the main clinical facility within the La Fe Health Department. This health district, which supports a population of approximately 300,000, includes two specialized centers and twenty primary care facilities. The Hospital’s Electronic Health Record (EHR) system integrates data from both primary and specialized care services. The La Fe Health Department has implemented an EHR system across various care levels, accumulating over 20 million records. This system has achieved stage 6 in the eight-stage EMRAM maturity model, which ranges from stage 0 to stage 7. Presently, the data lake consists of both structured and semi-structured data from multiple information systems involved in clinical activities such as emergency care, outpatient services, hospital admissions, clinical reports, surgical units, intensive care, and home-based hospital care. Additionally, the La Fe Health Department has developed a Real-World Data analysis platform that aggregates data from 22 datamarts, encompassing 750 million rows, 84 tables, and 4,064 columns.

This study is a retrospective, observational analysis conducted at a single center. It includes all adult individuals diagnosed with breast or lung cancer

For the breast cancer cohort, patients aged over 18 at the time of diagnosis and belonging to the hospital health department (DS7LAFE) registered in primary care and outpatient clinics with ICD-9 and ICD-10 codes referring to breast cancer were included. Oncology, radiotherapy, thoracic surgery, internal medicine and breast tumour committee services were filtered for the extraction of pathological anatomy notes. A similar approach was followed for the lung cancer cohort as for the breast cancer cohort. ICD codes for lung cancer were identified and patients were selected who were 18 years of age or older and belonged to the hospital. In particular, clinical pathology notes from the oncology, radiotherapy, thoracic surgery, internal medicine and pneumology departments were selected. For the symptomatology notes, a sample of 2000 random reports was selected from the medical records of all patients in the lung cancer cohort.

Once the cohorts were defined, the dataset that GMV would work with was extracted. It consists on 6000 unstructured reports, of which 2000 were clinical notes on breast cancer pathology and 4000 were clinical notes on lung cancer, of which 2000 were related to pathology and another 2000 to symptomatology. From this dataset, it was agreed with GMV that IIS La Fe would only tag 600 reports for the model learning (200 from each of the indicated categories).

In both cases, information was collected from anatomical pathology reports, randomly selecting 2000 anonymised clinical notes from breast cancer patients and 2000 from lung cancer patients. In addition, for lung cancer, additional information on symptomatology was extracted from historical hospital records, obtaining a random sample of 2000 additional notes. Once the study dataset was obtained, access was granted to GMV through a secure mechanism, guaranteeing the security, integrity and confidentiality of the data at all times. GMV selected randomly 200 notes from each category and uploaded them to Doccano for carring out the tagging task.

### 3.2 Data Preparation

Before applying the Named Entity Recognition (NER) model, a fine-tuning process was conducted to adapt and optimize the pre-trained model for the specific NER task. This process is nothing more than a method commonly used to adjust and improve a pre-trained machine learning model for a specific task (in this case NER task) using a specific dataset. The dataset, consisting of 200 breast cancer reports (pathological anatomy) and 400 lung cancer reports (200 pathological anatomy and 200 symptomatology), was utilized for this purpose. The dataset included annotations for eight distinct categories: six common to both cancer types (EVOL - Evolution, FACTR - Risk Factors, MET - Method of Diagnosis, PAT - Pathology, SINT - Symptomatology, and TTO - Treatment) and two specific to lung cancer (ANTPERSON - Personal history of malignant neoplasm and MUTAC - mutations associated with lung cancer). To facilitate the NER task, a dictionary of relevant terms for each entity was created. These terms were collected from databases, literature, pre-existing lists, and ontologies, and served as the foundation for the model’s recognition of key entities in the text corpus.It is crucial to ensure that the dictionary is broad enough to capture relevant entities but not too general, as it could include irrelevant terms. The resulting dictionary, developed by researchers at IIS La Fe and professionals at Hospital La Fe, was structured hierarchically, where entities are grouped by categories, facilitating their integration into text processing pipelines. This hierarchy consisted of the following categories: EVOL (Evolution), FACTR (Risk Factors), ANTPERSON (Personal History), MUTAC (Genetic Mutations), MET (Diagnostic Method), PAT (Pathology), SINT (Symptomatology), and TTO (Treatment). The creation of the dictionary involves a structured process of collecting, cleaning, structuring, and normalizing terms, essential for the model to learn to recognize specific entities in a text corpus. After creating the dictionary, the text annotation was carried out using the Doccano \[[4](https://arxiv.org/html/2505.09794v1#bib.bib4)\] tool.

Doccano is an open-source platform designed for data annotation and labeling in natural language processing (NLP) and machine learning projects (as mentioned in section [1](https://arxiv.org/html/2505.09794v1#S1 "1 Introduction ‣ Automated Detection of Clinical Entities in Lung and Breast Cancer Reports Using NLP Techniques"))). To carry out this process, GMV provided a secure environment for IIS La Fe researchers to manually annotate the texts. The annotation consisted of highlighting text fragments associated with one of the defined labels. To ensure high-quality annotation, iterative annotation cycles were performed, allowing for reviews and adjustments. Once the annotated corpus was available, the data was stored in the appropriate format to feed the machine learning model.

### 3.3 Modelling

Following on from the previous subsection, once the data has been prepared, we proceed to fine-tune the model so that it can perform the task of identifying entities. The model used for this task is bsc-bio-ehr-en \[[9](https://arxiv.org/html/2505.09794v1#bib.bib9)\], a biomedical linguistic model based on the RoBERTa (Robustly Optimized BERT Pretraining Approach) architecture \[[10](https://arxiv.org/html/2505.09794v1#bib.bib10)\], which is pre-trained in Spanish and suitable for medical records and EHRs. Thus, the fine-tuning process adapted the model for NER, specifically designed to detect relevant entities in breast and lung cancer clinical reports. A detailed explanation of the model’s application is provided in the following subsection

#### 3.3.1 Model use

The bsc-bio-ehr-en3 model, based on the widely adopted Transformer architecture, was employed to perform Named Entity Recognition (NER) tasks. Transformers have had a transformative impact on natural language processing (NLP), achieving remarkable success in tasks such as machine translation, text generation, and sentiment analysis. Building on this powerful architecture, the bsc-bio-ehr-en3 model was fine-tuned specifically to detect relevant entities in clinical reports. The following section outlines the implementation of this model for entity detection in the context of breast and lung cancer reports:

[⬇](data:text/plain;base64,ZnJvbSB0cmFuc2Zvcm1lcnMgaW1wb3J0IEF1dG9Ub2tlbml6ZXIsIEF1dG9Nb2RlbEZvclRva2VuQ2xhc3NpZmljYXRpb24sIHBpcGVsaW5lCgp0b2tlbml6ZXIgPSBBdXRvVG9rZW5pemVyLmZyb21fcHJldHJhaW5lZCgiL21vZGVsb19jbWFtYV9jcHVsbW9uIiwgbG9jYWxfZmlsZXNfb25seT1UcnVlKQoKbW9kZWwgPSBBdXRvTW9kZWxGb3JUb2tlbkNsYXNzaWZpY2F0aW9uLmZyb21fcHJldHJhaW5lZCgiL21vZGVsb19jbWFtYV9jcHVsbW9uIiwgbG9jYWxfZmlsZXNfb25seT1UcnVlKQoKcGlwZSA9IHBpcGVsaW5lKCduZXInLCB0b2tlbml6ZXI9dG9rZW5pemVyLCBtb2RlbD1tb2RlbCwgYWdncmVnYXRpb25fc3RyYXRlZ3k9ImF2ZXJhZ2UiKQoKc2VudGVuY2UgPSAnUG9yIGVsIGhhbGxhemdvIGRlIG3Dumx0aXBsZXMgZnJhY3R1cmFzIHBvciBlc3Ryw6lzLCBzZSBwcm9jZWRpw7MgYSBlc3R1ZGlvIGVuIG51ZXN0cmFzIGNvbnN1bHRhcywgcmVhbGl6w6FuZG9zZSBhbsOhbGlzaXMgY29uIGZ1bmNpw7NuIHJlbmFsLCBjYWxjaW8gc8OpcmljbyB5IHVyaW5hcmlvLCBjYWxjaW8gacOzbmljbywgbWFnbmVzaW8geSBQVEgsIHF1ZSBmdWVyb24gbm9ybWFsZXMuJwpyZXN1bHRzID0gcGlwZShzZW50ZW5jZSkKCnByaW50KHJlc3VsdHMp)

1from transformers import AutoTokenizer, AutoModelForTokenClassification, pipeline

2

3tokenizer \= AutoTokenizer.from\_pretrained("/modelo\_cmama\_cpulmon", local\_files\_only\=True)

4

5model \= AutoModelForTokenClassification.from\_pretrained("/modelo\_cmama\_cpulmon", local\_files\_only\=True)

6

7pipe \= pipeline(’ner’, tokenizer\=tokenizer, model\=model, aggregation\_strategy\="average")

8

9sentence \= ’Por el hallazgo de múltiples fracturas por estrés, se procedió a estudio en nuestras consultas, realizándose análisis con función renal, calcio sérico y urinario, calcio iónico, magnesio y PTH, que fueron normales.’

10results \= pipe(sentence)

11

12print(results)

## 4 Results and Discussion

This section outlines the results obtained from the evaluation of the model with both the breast cancer report set and the combined dataset (comprising breast and lung cancer reports set). Once the results have been presented, they will be analyzed and discussed.

### 4.1 Validation results for the breast cancer reporting set

To initially assess the model’s performance, a subset of 200 breast cancer reports (pathological anatomy) was utilized. This set was randomly split according to these percent- ages: 50 % train, 25 % test and 25 % validation. Thus, the distribution of the number of labels in the set would be as follows:

Table 1: Label Distribution in the Breast Cancer Set

Set

EVOL

FACTR

MET

PAT

SINT

TTO

Train

0

48

1237

814

54

104

Validation

2

19

647

410

16

53

Test

4

22

759

544

38

89

Complete

2

19

647

410

16

53

\\botrule

As shown in Table [1](https://arxiv.org/html/2505.09794v1#S4.T1 "Table 1 ‣ 4.1 Validation results for the breast cancer reporting set ‣ 4 Results and Discussion ‣ Automated Detection of Clinical Entities in Lung and Breast Cancer Reports Using NLP Techniques"), the most frequently annotated entities categories in the breast cancer dataset are MET (Method of Diagnosis) and PAT (Pathology). These two entities dominate the label distribution across the training, validation, and test sets. On the other hand, FACTR (Risk Factors) and EVOL (Evolution) are considerably less represented, with EVOL being absent in the training set. The underrepresentation of certain entities, such as EVOL, poses a significant challenge for the model’s performance, particularly in terms of generalizability. Since there are no instances of EVOL in the training set, the model will struggle to detect or predict this entity during testing, leading to either null or erroneous results. Similarly, entities with sparse representation (like FACTR and SINT) may also suffer from limited predictive accuracy.

#### 4.1.1 Automatic validation

This section presents the results of the automatic validation conducted during the model training phase. The validation process includes evaluating the model’s performance using several key metrics for each label: precision, recall, and F1-score \[[11](https://arxiv.org/html/2505.09794v1#bib.bib11)\]. These metrics are essential for assessing the model’s effectiveness in entity detection tasks. Additionally, global metrics such as accuracy and loss \[[11](https://arxiv.org/html/2505.09794v1#bib.bib11)\] are included to provide a comprehensive view of the model’s overall performance. The following table summarizes the metrics for each label in the breast cancer dataset:

Table 2: Automatic Validation Results for the Breast Cancer Model by Label

Validation Set

EVOL

FACTR

MET

PAT

SINT

TTO

F1

0

0.5

0.8289

0.6578

0.7999

0.7222

Precision

0

0.4762

0.8252

0.6538

0.7368

0.6964

Recall

0

0.5263

0.8288

0.6618

0.8750

0.75

\\botrule

Table 3: Automatic Validation Results for the Breast Cancer Model

Validation Set

Accuracy

F1

Precision

Recall

Loss

Global

0.9418

0.7684

0.7641

0.7728

0.2497

\\botrule

As shown in Table [2](https://arxiv.org/html/2505.09794v1#S4.T2 "Table 2 ‣ 4.1.1 Automatic validation ‣ 4.1 Validation results for the breast cancer reporting set ‣ 4 Results and Discussion ‣ Automated Detection of Clinical Entities in Lung and Breast Cancer Reports Using NLP Techniques"), the EVOL label has zero metrics, as previously mentioned, underscoring a significant performance issue for this entity. In contrast, the MET label achieved the highest scores across all metrics, indicating strong performance. Both FACTR and PAT labels show lower metrics compared to others, suggesting areas that require improvement. Despite these challenges, the overall validation metrics, as presented in Table [3](https://arxiv.org/html/2505.09794v1#S4.T3 "Table 3 ‣ 4.1.1 Automatic validation ‣ 4.1 Validation results for the breast cancer reporting set ‣ 4 Results and Discussion ‣ Automated Detection of Clinical Entities in Lung and Breast Cancer Reports Using NLP Techniques"), indicate strong performance. The model achieved an accuracy of 94%, an F1-score of 0.77, and a low loss of 0.25, reflecting the model’s reliability in entity recognition. These results demonstrate that, while there are areas for improvement, the model performs well overall.

The model’s generalizability was further assessed using a test set, to ensure that the results from the validation phase hold true across different datasets. The metrics from the test set, shown in Table [4](https://arxiv.org/html/2505.09794v1#S4.T4 "Table 4 ‣ 4.1.1 Automatic validation ‣ 4.1 Validation results for the breast cancer reporting set ‣ 4 Results and Discussion ‣ Automated Detection of Clinical Entities in Lung and Breast Cancer Reports Using NLP Techniques"), reveal that the model maintains strong performance in identifying entities, especially for the FACTR, MET, and SINT labels. However, the EVOL label still shows zero metrics, indicating persistent challenges in recognizing this entity.

The overall results for the test set, as presented in Table [5](https://arxiv.org/html/2505.09794v1#S4.T5 "Table 5 ‣ 4.1.1 Automatic validation ‣ 4.1 Validation results for the breast cancer reporting set ‣ 4 Results and Discussion ‣ Automated Detection of Clinical Entities in Lung and Breast Cancer Reports Using NLP Techniques"), confirm that the model performs exceptionally well. With an accuracy of 94% and an F1-score of 0.75, the model demonstrates strong generalization to unseen data. The loss value of 0.24 further supports the conclusion that the model is robust and not overfitting. These results provide confidence in the model’s ability to reliably identify entities in real-world clinical reports, although further refinement is needed for certain labels like EVOL.

Table 4: Automatic Test Results for the Breast Cancer Model by Label

Test Set

EVOL

FACTR

MET

PAT

SINT

TTO

F1

0

0.7059

0.8057

0.6503

0.6383

0.7027

Precision

0

0.6207

0.7747

0.6444

0.5357

0.6771

Recall

0

0.8181

0.8392

0.6563

0.7895

0.7303

\\botrule

Table 5: Automatic test results of the breast cancer model

Test Set

Accuracy

F1

Precision

Recall

Loss

Global

0.9442

0.7464

0.7215

0.7733

0.2376

\\botrule

#### 4.1.2 Manual validation

In this subsection, the results of the manual validation of the breast cancer dataset are presented. The validation process involved the incorporation of a text pre-processing layer using uQuery, GMV’s NLP tool, prior to model execution. This pre-processing step was designed to improve the quality of the results and demonstrate the model’s robust performance.The impact of this pre-processing layer is illustrated in Figures [2](https://arxiv.org/html/2505.09794v1#S4.F2 "Figure 2 ‣ 4.1.2 Manual validation ‣ 4.1 Validation results for the breast cancer reporting set ‣ 4 Results and Discussion ‣ Automated Detection of Clinical Entities in Lung and Breast Cancer Reports Using NLP Techniques") and [3](https://arxiv.org/html/2505.09794v1#S4.F3 "Figure 3 ‣ 4.1.2 Manual validation ‣ 4.1 Validation results for the breast cancer reporting set ‣ 4 Results and Discussion ‣ Automated Detection of Clinical Entities in Lung and Breast Cancer Reports Using NLP Techniques"), where the difference in entity detection between unprocessed and optimally pre-processed texts is highlighted.

![Refer to caption](x2.png)

Figure 2: Entity extraction from raw text

As shown in [2](https://arxiv.org/html/2505.09794v1#S4.F2 "Figure 2 ‣ 4.1.2 Manual validation ‣ 4.1 Validation results for the breast cancer reporting set ‣ 4 Results and Discussion ‣ Automated Detection of Clinical Entities in Lung and Breast Cancer Reports Using NLP Techniques"), when raw text is processed through the NER model, certain entities, such as lung staging (pTNM), are not identified. In contrast, text that has been optimally pre-processed allows the model to detect all relevant entities, including complete identification of partial entities like Mama derecha, which is only partially recognized in unprocessed text. We can see this effect in Figure [3](https://arxiv.org/html/2505.09794v1#S4.F3 "Figure 3 ‣ 4.1.2 Manual validation ‣ 4.1 Validation results for the breast cancer reporting set ‣ 4 Results and Discussion ‣ Automated Detection of Clinical Entities in Lung and Breast Cancer Reports Using NLP Techniques"). This comparison underscores the significant advantage of implementing a pre-processing layer, which maximizes the model’s effectiveness and enhances its capability to detect and accurately identify entities. It is also important to note that the pre-processing capabilities of uQuery exceed those discussed in this study, offering superior text cleanliness and a higher detection rate of entities.

![Refer to caption](x3.png)

Figure 3: Entity extraction from pre-processed text

Following the examination of the methodology, the results are illustrated through graphical representations. The pie chart in panel (a) of Figure [4](https://arxiv.org/html/2505.09794v1#S4.F4 "Figure 4 ‣ 4.1.2 Manual validation ‣ 4.1 Validation results for the breast cancer reporting set ‣ 4 Results and Discussion ‣ Automated Detection of Clinical Entities in Lung and Breast Cancer Reports Using NLP Techniques") provides a visual breakdown of the entity detection results from the validation set. It reveals that 97.5% of the detected entities are correctly identified, while only 2.5% are incorrect. This high percentage of accurate detections highlights the model’s strong performance in correctly identifying relevant entities.

In addition, a comparative analysis is presented between the entities identified by the model and the true entities as annotated by IIS La Fe experts. The subsequent chart provides a detailed comparison, illustrating the alignment and discrepancies between the model’s output and expert annotations. Panel (b) of Figure [4](https://arxiv.org/html/2505.09794v1#S4.F4 "Figure 4 ‣ 4.1.2 Manual validation ‣ 4.1 Validation results for the breast cancer reporting set ‣ 4 Results and Discussion ‣ Automated Detection of Clinical Entities in Lung and Breast Cancer Reports Using NLP Techniques") presents this comparative analysis, showing that entities labeled as EVOL are notably absent in the model’s detections. Conversely, entities such as MET, PAT, TTO, and SINT show a high degree of alignment with the expert annotations. In some cases, such as MET, the model detected more entities than those actually labeled, which is depicted as an "overshoot" in the chart.

Additionally, an analysis of unlabelled reports reveals that the model’s performance is commendable, as it successfully identified relevant entities even in these reports. This highlights the model’s robustness and capability in detecting entities beyond the labeled dataset, further demonstrating its effectiveness in practical applications.

These visualizations not only confirm the model’s strong performance but also pinpoint areas for potential improvement, providing valuable insights for refining the entity recognition process.

\\pie\\pie2.5%percent2.5\\!\\!2.5\\%2.5 %\\pie

(a)

EVOLFACTRMETNO\_LABELPATSINTTTO001001001001002002002002003003003003004004004004005005005005006006006006007007007007008008008008009009009009001,00010001{,}0001 , 00022221818181894694694694633334174174174171919191949494949002222222294194194194122223983983983981717171745454545001111151515150018181818003333EntityQuantityReal entityCorrect predicted entityIncorrect predicted entity

(b)

Figure 4: (a) Distribution of Hits and Misses in the Validation Set. (b) Comparison of Model-Detected Entities with Expert-Annotated Entities: EVOL (Evolution), FACTR (Risk Factors), MET (Method of Diagnosis), NO\_LABEL (Non annotated entities), PAT (Pathology), SINT (Symptomatology), and TTO (Treatment).

### 4.2 Validation results for the complete dataset

The validation results for the complete dataset, comprising a total of 600 reports, are detailed below. This dataset is categorized as follows:

-   •
    
    200 reports of Breast Cancer
    
-   •
    
    400 reports of Lung Cancer
    

As in the previous section, the dataset was partitioned into training, testing, and validation subsets, following a distribution of 50% for training, 25% for testing, and 25% for validation. Each subset maintains the same proportional representation of report types to ensure consistency across the data splits

As illustrated in Table [6](https://arxiv.org/html/2505.09794v1#S4.T6 "Table 6 ‣ 4.2 Validation results for the complete dataset ‣ 4 Results and Discussion ‣ Automated Detection of Clinical Entities in Lung and Breast Cancer Reports Using NLP Techniques"), the labels with the highest representation in the dataset are MET and PAT, consistent with observations from the previous dataset. Conversely, labels such as EVOL and ANTPERSON appear less frequently, reflecting their lower incidence across the complete dataset.

Table 6: Label distribution in the complete dataset

Set

EVOL

FACTR

MUTAC

ANTPERSON

MET

PAT

SINT

TTO

Train

42

107

242

46

1916

1432

327

286

Validation

21

60

90

17

1178

746

131

143

Test

22

20

10

14

711

566

93

105

Complete

85

187

342

77

3805

2744

551

534

\\botrule

This comprehensive validation underscores the model’s performance across a diverse set of clinical reports, providing a robust assessment of its ability to generalize across different types of cancer and reporting formats. The consistent representation of key labels such as MET and PAT highlights the model’s strengths, while the lower frequency of other labels points to areas where further refinement may be needed

#### 4.2.1 Automatic validation

This subsection details the automatic validation results obtained by training the model on the complete dataset. The evaluation metrics used are consistent with those described in Section [4.1.1](https://arxiv.org/html/2505.09794v1#S4.SS1.SSS1 "4.1.1 Automatic validation ‣ 4.1 Validation results for the breast cancer reporting set ‣ 4 Results and Discussion ‣ Automated Detection of Clinical Entities in Lung and Breast Cancer Reports Using NLP Techniques").

Table [7](https://arxiv.org/html/2505.09794v1#S4.T7 "Table 7 ‣ 4.2.1 Automatic validation ‣ 4.2 Validation results for the complete dataset ‣ 4 Results and Discussion ‣ Automated Detection of Clinical Entities in Lung and Breast Cancer Reports Using NLP Techniques") reveals that the EVOL label shows very low metrics, reflecting its limited representation in the dataset compared to other classes. In contrast, MUTAC achieves the highest metrics across the board. The overall model performance, as summarized in Table [8](https://arxiv.org/html/2505.09794v1#S4.T8 "Table 8 ‣ 4.2.1 Automatic validation ‣ 4.2 Validation results for the complete dataset ‣ 4 Results and Discussion ‣ Automated Detection of Clinical Entities in Lung and Breast Cancer Reports Using NLP Techniques"), indicates a strong performance:

Table 7: Automatic validation results of the complete dataset model per label

Validation Set

EVOL

FACTR

MUTAC

ANTPERSON

MET

PAT

SINT

TTO

F1

0.3684

0.6441

0.8195

0.7027

0.7867

0.6657

0.6593

0.7751

Precision

0.4118

0.6552

0.7304

0.65

0.7809

0.6648

0.6403

0.7619

Recall

0.3333

0.6333

0.9333

0.7647

0.7926

0.6666

0.6794

0.7887

\\botrule

Table 8: Automatic validation results of complete dataset model

Validation Set

Accuracy

F1

Precision

Recall

Loss

Global

0.9557

0.7411

0.7332

0.7493

0.2565

\\botrule

The results demonstrate that the model performs exceptionally well, with high accuracy and F1 scores (Table [8](https://arxiv.org/html/2505.09794v1#S4.T8 "Table 8 ‣ 4.2.1 Automatic validation ‣ 4.2 Validation results for the complete dataset ‣ 4 Results and Discussion ‣ Automated Detection of Clinical Entities in Lung and Breast Cancer Reports Using NLP Techniques")). The high recall for MUTAC, which reaches 1, signifies that the model has accurately identified all positive instances of MUTAC in the dataset. However, this high recall for MUTAC may come at the expense of overall accuracy, as the model might be generating more false positives, evidenced by the lower accuracy compared to the validation set. The overall results, shown in Table 8, further confirm that the model’s performance on the test set aligns closely with that of the validation set, indicating consistent performance across different subsets of the dataset.

As shown in Table [9](https://arxiv.org/html/2505.09794v1#S4.T9 "Table 9 ‣ 4.2.1 Automatic validation ‣ 4.2 Validation results for the complete dataset ‣ 4 Results and Discussion ‣ Automated Detection of Clinical Entities in Lung and Breast Cancer Reports Using NLP Techniques"), the detailed test results for each label reveal that while the model performs well overall, there are variations in performance across different entity types. Notably, the recall for MUTAC is perfect (1.000), indicating that the model successfully identifies all positive examples for this label. However, this high recall for MUTAC is coupled with a lower accuracy, suggesting the presence of false positives affecting overall accuracy. The overall results, which are very similar to the previous ones, are also shown:

Table 9: Automatic test results of the complete dataset model per label

Test Set

EVOL

FACTR

MUTAC

ANTPERSON

MET

PAT

SINT

TTO

F1

0.375

0.56

0.8

0.8571

0.8113

0.6564

0.6915

0.8122

Precision

0.3462

0.4666

0.6666

0.8571

0.7917

0.6754

0.6842

0.8696

Recall

0.4091

0.7

1

0.8571

0.8320

0.6384

0.6989

0.7619

\\botrule

Table 10: Automatic test results of complete dataset model

Test Set

Accuracy

F1

Precision

Recall

Loss

Global

0.9591

0.7489

0.7435

0.7543

0.2234

\\botrule

Table [10](https://arxiv.org/html/2505.09794v1#S4.T10 "Table 10 ‣ 4.2.1 Automatic validation ‣ 4.2 Validation results for the complete dataset ‣ 4 Results and Discussion ‣ Automated Detection of Clinical Entities in Lung and Breast Cancer Reports Using NLP Techniques") summarizes the global test results, showing an accuracy of 95.91% and an F1-score of 0.7489, consistent with the validation results. The precision and recall values (0.7435 and 0.7543, respectively) further confirm the model’s robust performance. The lower loss of 0.2234 supports the conclusion that the model is well-calibrated and generalizes effectively to new data. In summary, the evaluation across both validation and test datasets demonstrates that the model performs reliably and consistently. The detailed metrics highlight areas where the model excels and where further refinements might be necessary, ensuring its suitability for real-world applications in entity recognition tasks.

#### 4.2.2 Manual validation

This subsection provides a comprehensive analysis of the manual validation results for the breast and lung cancer datasets, specifically focusing on each of the abovementioned categories. As with the validation described in Section [4.1.2](https://arxiv.org/html/2505.09794v1#S4.SS1.SSS2 "4.1.2 Manual validation ‣ 4.1 Validation results for the breast cancer reporting set ‣ 4 Results and Discussion ‣ Automated Detection of Clinical Entities in Lung and Breast Cancer Reports Using NLP Techniques"), these results were obtained after applying a text pre-processing layer. This pre-processing step was crucial for achieving high-quality results and ensuring the model’s effective performance.

\\pie\\pie1.5%percent1.5\\!\\!1.5\\%1.5 %\\pie

(a)

EVOLFACTRANTPERSONMUTACMETPATSINTTTO002002002002004004004004006006006006008008008008001,00010001{,}0001 , 0001,20012001{,}2001 , 200222222225959595917171717969696961,16111611{,}1611 , 1617507507507501321321321321471471471471212121249494949171717171091091091091,12011201{,}1201 , 12074774774774712012012012014014014014033333333222277771111111177772222EntityQuantityReal entityCorrect predicted entityIncorrect predicted entity

(b)

Figure 5: (a) Distribution of Hits and Misses in the Validation Set. (b) Comparison of Model-Detected Entities with Expert-Annotated Entities: EVOL (Evolution), FACTR (Risk Factors), ANTPERSON (Personal History, specific to lung cancer), MUTAC (Genetic Mutations, specific to lung cancer),MET (Method of Diagnosis), PAT (Pathology), SINT (Symptomatology), and TTO (Treatment).

Figure [5](https://arxiv.org/html/2505.09794v1#S4.F5 "Figure 5 ‣ 4.2.2 Manual validation ‣ 4.2 Validation results for the complete dataset ‣ 4 Results and Discussion ‣ Automated Detection of Clinical Entities in Lung and Breast Cancer Reports Using NLP Techniques") presents a pie chart illustrating the distribution of hits and misses in the validation set. The chart reveals that an impressive 98.5% of the identified entities are accurate, with only 1.5% being incorrect. This high proportion of correct entities underscores the model’s robustness and reliability in entity recognition. Following this, a detailed comparison is provided between the entities identified by the model and those manually annotated (bar chart).

In summary, the manual validation results confirm the model’s strong performance, with a very high rate of correct entity identification. The detailed comparison with manual annotations provides valuable insights into the model’s accuracy and areas where it may detect additional entities not previously considered, enhancing the overall understanding of its practical application in clinical report analysis.

## 5 Conclusions

In conclusion, the evaluation of the NER model on clinical reports for breast and lung cancer has demonstrated its effectiveness in accurately identifying critical clinical entities. The model performed particularly well with entities that were well-represented in the dataset, such as MET and PAT, highlighting its strength in handling commonly occurring clinical data.

However, challenges were encountered with less frequent entities, such as EVOL, indicating areas where the model’s performance can be further refined. These difficulties underscore the need for continued improvements, particularly in the detection of underrepresented entities. The integration of a text pre-processing layer proved essential in enhancing the model’s accuracy, emphasizing the critical role of pre-processing in optimizing NER performance.

The findings suggest that the model is well-suited for clinical applications, providing robust performance in extracting key information from clinical reports. Nevertheless, further refinement is necessary to improve detection accuracy for less frequent labels, specifically through enhancing the model’s sensitivity and specificity.

Overall, this study highlights the potential of fine-tuning NER models to significantly enhance the accuracy and efficiency of information extraction from clinical reports. The insights gained provide a solid foundation for the continued development and application of NER technologies in clinical settings, with promising implications for both research and practical healthcare applications.

## 6 List of abbreviations

-   •
    
    NLP: Natural Language Processing
    
-   •
    
    EHR: Electronic Health Records
    
-   •
    
    NER: Named Entity Recognition
    
-   •
    
    IIS La Fe: Institute Hospital La Fe
    
-   •
    
    RWE: Real-World Evidence
    
-   •
    
    EMR: Electronic Medical Records
    
-   •
    
    CRF: Conditional Random Fields
    
-   •
    
    NSCLC: Non-Small Cell Lung Cancer
    
-   •
    
    GCP: Good Clinical Practice
    
-   •
    
    RoBERTa: Robustly Optimized BERT Pretraining Approach
    

\\bmhead

Data Availability

The datasets generated and analyzed during the current study are not publicly available due to lack of consent for public sharing. However, are available from the corresponding author on reasonable request.

\\bmhead

Authors’ contributions J. Moreno-Casanova designed the computational framework, carried out the simulations and analysis and wrote the manuscript. J.M. Auñon contributed in the design of the solution. A. Martínez-Pérez and M.E. Pérez-Martínez participated in the identification of the digital patient cohort, the extraction of pseudonymized clinical records, the tagging of the training set, and the writing and review of the manuscript. M.E. Gas-López contributed to the writing and review of the manuscript.

\\bmhead

Acknowledgements

This work was supported by grant from R&D Missions in the Artificial Intelligence program, which is part of the Spain Digital 2025 Agenda and the National Artificial Intelligence Strategy and financed by the European Union through Next Generation EU funds (project TARTAGLIA, exp.MIA.2021.M02.0005). The financial support of GMV is also gratefully acknowledged, along with its continued commitment to research and development.

\\bmhead

Authors’ information (optional) Not applicable

## References

-   \\bibcommenthead
-   Huang et al. \[2023\] Huang, S., Yang, J., Shen, N., Xu, Q., Zhao, Q.: Artificial intelligence in lung cancer diagnosis and prognosis: Current application and future perspective. Seminars in Cancer Biology 89, 30–37 (2023) [https://doi.org/10.1016/j.semcancer.2023.01.006](https://doi.org/10.1016/j.semcancer.2023.01.006)
-   Nandish et al. \[2022\] Nandish, S., J, P.R., M, N.N.: Natural language processing approaches for automated multilevel and multiclass classification of breast lesions on free-text cytopathology reports. JCO Clinical Cancer Informatics 6, 30–37 (2022) [https://doi.org/10.1200/CCI.22.00036](https://doi.org/10.1200/CCI.22.00036)
-   GMV \[2022\] GMV: uQuery Tecnologías del Lenguaje Ante Los Nuevos Retos de la Comunicación Digital. Consultado el: 6 de noviembre de 2024. [https://www.gmv.com/es-es/productos/financiero/uquery](https://www.gmv.com/es-es/productos/financiero/uquery)
-   Nakayama et al. \[2018\] Nakayama, H., Kubo, T., Kamura, J., Taniguchi, Y., Liang, X.: doccano: Text Annotation Tool for Human. Software available from https://github.com/doccano/doccano (2018). [https://github.com/doccano/doccano](https://github.com/doccano/doccano)
-   Fang et al. \[2022\] Fang, A., Hu, J., Zhao, W., Feng, M., Fu, J., Feng, S., Lou, P., Ren, H., Chen, X.: Extracting clinical named entity for pituitary adenomas from chinese electronic medical records. BMC Medical Informatics and Decision Making, 22–72 (2022) [https://doi.org/10.1186/s12911-022-01810-z](https://doi.org/10.1186/s12911-022-01810-z)
-   Zhang et al. \[2019\] Zhang, X., Zhang, Y., Zhang, Q., Ren, Y., Qiu, T., Ma, J., Sun, Q.: Extracting comprehensive clinical information for breast cancer using deep learning methods. International journal of medical informatics (2019) [https://doi.org/10.1016/j.ijmedinf.2019.103985](https://doi.org/10.1016/j.ijmedinf.2019.103985)
-   Obeid et al. \[2019\] Obeid, J.S., Weeda, E.R., Matuskowitz, A.J., Gagnon, K., Crawford, T., Carr, C.M., Frey, L.J.: Automated detection of altered mental status in emergency department clinical notes: a deep learning approach. BMC Medical Informatics and Decision Making (2019) [https://doi.org/10.1186/s12911-019-0894-9](https://doi.org/10.1186/s12911-019-0894-9)
-   Paolo et al. \[2024\] Paolo, D., Bria, A., Greco, C., Russano, M., Ramella, S., Soda, P., Sicilia, R.: Exploring negated entites for named entity recognition in italian lung cancer clinical reports. Studies in health technology and informatics 314, 98–102 (2024) [https://doi.org/10.3233/SHTI240066](https://doi.org/10.3233/SHTI240066)
-   Carrino et al. \[2022\] Carrino, C.P., Llop, J., Pàmies, M., Gutiérrez-Fandiño, A., Armengol-Estapé, J., Silveira-Ocampo, J., Valencia, A., Gonzalez-Agirre, A., Villegas, M.: Pretrained biomedical language models for clinical NLP in Spanish. In: Proceedings of the 21st Workshop on Biomedical Language Processing, pp. 193–199. Association for Computational Linguistics, Dublin, Ireland (2022). [https://doi.org/10.18653/v1/2022.bionlp-1.19](https://doi.org/10.18653/v1/2022.bionlp-1.19) . [https://aclanthology.org/2022.bionlp-1.19](https://aclanthology.org/2022.bionlp-1.19)
-   Liu et al. \[2019\] Liu, Y., Ott, M., Goyal, N., Du, J., Joshi, M., Chen, D., Levy, O., Lewis, M., Zettlemoyer, L., Stoyanov, V.: Roberta: A robustly optimized bert pretraining approach. Computation and Language (cs.CL) (2019) [https://doi.org/10.48550/arXiv.1907.11692](https://doi.org/10.48550/arXiv.1907.11692)
-   Hicks et al. \[2022\] Hicks, S.A., Strümke, I., Thambawita, V., Hammou, M., Riegler, M.A., Halvorsen, P., Parasa, S.: On evaluation metrics for medical applications of artificial intelligence. nature (2022) [https://doi.org/10.1038/s41598-022-09954-8](https://doi.org/10.1038/s41598-022-09954-8)
