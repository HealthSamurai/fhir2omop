# CEHR-GPT: Generating Electronic Health Records with Chronological Patient Timelines

- arXiv: [2402.04400v1](https://arxiv.org/abs/2402.04400v2)
- Published: 2024-02-06
- Source: `https://arxiv.org/html/2402.04400v1`

---
# CEHR-GPT: Generating Electronic Health Records with Chronological Patient Timelines

Chao Pang111indicates equal contribution Department of Biomedical Informatics, Columbia University Irving Medical Center Observational Health Data Sciences and Informatics Xinzhuo Jiang\*{}^{\*}start\_FLOATSUPERSCRIPT \* end\_FLOATSUPERSCRIPT Department of Biomedical Informatics, Columbia University Irving Medical Center Observational Health Data Sciences and Informatics Nishanth Parameshwar Pavinkurve Department of Biomedical Informatics, Columbia University Irving Medical Center Observational Health Data Sciences and Informatics Krishna S. Kalluri Department of Biomedical Informatics, Columbia University Irving Medical Center Observational Health Data Sciences and Informatics Elise L. Minto Department of Biomedical Informatics, Columbia University Irving Medical Center Observational Health Data Sciences and Informatics Jason Patterson Department of Biomedical Informatics, Columbia University Irving Medical Center Observational Health Data Sciences and Informatics Linying Zhang Institute for Informatics, Data Science, and Biostatistics. Washington University in St Louis Observational Health Data Sciences and Informatics George Hripcsak Department of Biomedical Informatics, Columbia University Irving Medical Center Medical Informatics Services, New York-Presbyterian Hospital Observational Health Data Sciences and Informatics Noémie Elhadad Department of Biomedical Informatics, Columbia University Irving Medical Center Medical Informatics Services, New York-Presbyterian Hospital Observational Health Data Sciences and Informatics Karthik Natarajan Department of Biomedical Informatics, Columbia University Irving Medical Center Medical Informatics Services, New York-Presbyterian Hospital Observational Health Data Sciences and Informatics

## Abstract

Synthetic Electronic Health Records (EHR) have emerged as a pivotal tool in advancing healthcare applications and machine learning models, particularly for researchers without direct access to healthcare data. Although existing methods, like rule-based approaches and generative adversarial networks (GANs), generate synthetic data that resembles real-world EHR data, these methods often use a tabular format, disregarding temporal dependencies in patient histories and limiting data replication. Recently, there has been a growing interest in leveraging Generative Pre-trained Transformers (GPT) for EHR data. This enables applications like disease progression analysis, population estimation, counterfactual reasoning, and synthetic data generation. In this work, we focus on synthetic data generation and demonstrate the capability of training a GPT model using a particular patient representation derived from CEHR-BERT, enabling us to generate patient sequences that can be seamlessly converted to the Observational Medical Outcomes Partnership (OMOP) data format.

## Keywords

Generative Pre-trained Transformer, Synthetic Electronic Health Records, Patient Representation, Observational Medical Outcomes Partnership - Common Data Model, Observational Health Data Sciences and Informatics

## 1 Introduction

Access to electronic health records (EHRs) is fundamental to healthcare research, drug surveillance, clinical machine learning, and system development. However, the use of real-world EHR data comes with considerable challenges such as privacy and security issues, institutional consent, and restrictions on data sharing. Synthetic data emerges as a promising solution, offering a more expedient and secure pathway to healthcare information, which could accelerate progress across various sectors, including academic research, clinical settings, and the pharmaceutical industry \[[1](https://arxiv.org/html/2402.04400v1#bib.bib1)\].

Synthetic data is not real data, that is, it doesn’t relate to any specific individual. However, it mimics the statistical characteristics and journeys of specific patient populations. Synthetic data enables a broader range of researchers to answer their questions of interest without going through the cumbersome process of accessing real data and worrying about patient privacy \[[2](https://arxiv.org/html/2402.04400v1#bib.bib2)\]. In recent years, many machine learning, specifically deep learning and generative artificial intelligence (AI) models, have been developed to derive synthetic data from real EHR data. \[[3](https://arxiv.org/html/2402.04400v1#bib.bib3)\] However, most existing methods for synthetic EHR data generation fail to adequately capture the temporal dependencies that are often critical in medical scenarios. These temporal aspects, such as medication schedules, symptom progression, and lab result timelines, are vital for a comprehensive understanding of patient health trajectories and for developing effective treatment strategies. An ideal synthetic dataset derived from institutional data should maintain the inherent correlations among time-series features, thus enabling researchers to externally validate machine learning models in different populations. Crucially, the synthetic dataset must preserve accurate patient timelines, as predictive tasks are highly susceptible to temporal variations. A synthetic dataset is considered to exhibit comparable machine learning utility to the original data if it meets two key criteria: 1) it demonstrates similar outcome prevalence to the source data; 2) machine learning models trained on the synthetic data achieve performance metrics akin to those trained with the original data.

The majority of the existing research focuses on developing new deep learning models in generative EHR research but without adequate emphasis on retaining accurate temporal information \[[4](https://arxiv.org/html/2402.04400v1#bib.bib4), [5](https://arxiv.org/html/2402.04400v1#bib.bib5), [6](https://arxiv.org/html/2402.04400v1#bib.bib6)\]. Unfortunately, synthetic EHR datasets developed as such will not support use cases that require the accurate construction of a patient timeline e.g., 30-day readmission, one-year risk of heart failure, and disease progression. This limits existing work to only perform simple code prediction in their evaluations instead of comprehensive phenotype predictions. Another challenge in using synthetic EHR data in practice is its difficulty with dissemination due to a lack of standards. Synthetic patient sequences cannot be widely adopted for analyses without use of a common data model, however, none of the existing works have included such a component in their frameworks to present the synthetic data in an easy-to-consume fashion.

In our view, time-series synthetic data should not only capture the underlying characteristics of heterogeneous EHRs but also satisfy the following temporal requirements, 1) a matching distribution of the starting age; 2) a matching distribution of the starting year; 3) a matching distribution of the inpatient duration; 4) a matching distribution of time intervals between neighboring visits. Furthermore, synthetic EHR data should be stored in common data models such as the Observational Medical Outcomes Partnership (OMOP) Common Data Model, which is used in many large data networks, \[[7](https://arxiv.org/html/2402.04400v1#bib.bib7)\] for easy dissemination and consumption. Although creating such a time-series EHR dataset seems to be a challenging task, we think that this problem can be solved through a patient representation approach. The key is to focus on designing a good patient representation rather than creating a sophisticated architecture to model time and medical events simultaneously. In this paper, we present the CEHR-GPT framework for building an end-to-end workflow to generate time-series synthetic EHR data. Our contributions are summarized below,

-   •
    
    We design a novel patient representation that not only keeps track of the visit types and discharge facility for inpatient visits but also preserves all temporal information including patients’ starting year, starting age, time intervals between visits, and inpatient visit spans. To the best of our knowledge, this is the first time that temporal information is fully retained.
    
-   •
    
    We treat patient sequence generation as a language modeling problem, which allowed us to use the state-of-the-art language model Generative Pre-trained Transformers (GPT) to learn the distribution of patient sequences to generate new synthetic sequences \[[8](https://arxiv.org/html/2402.04400v1#bib.bib8), [9](https://arxiv.org/html/2402.04400v1#bib.bib9)\].
    
-   •
    
    We converted synthetic sequences to the common data format OMOP with almost no loss of temporal information. Synthetic OMOP can be easily evaluated using the OHDSI tools and disseminated to others.
    
-   •
    
    We evaluated the synthetic EHR data on three levels, dimension-wise distribution (marginal distribution), co-occurrence relationship, and machine learning model performance metrics.
    

## 2 Related work

With the adoption of Generative Adversarial Networks (GANs) \[[10](https://arxiv.org/html/2402.04400v1#bib.bib10)\], researchers have found creative ways to generate synthetic EHR data. Since 2017, several groups have applied GANs to tabular EHRs and developed several evaluation and privacy metrics to quantify the performance of GANs \[[3](https://arxiv.org/html/2402.04400v1#bib.bib3)\]. Despite the success, one limitation is that the tabular format fails to capture the temporal nature of EHR data because they are constructed from patient histories using a bag-of-words approach. It was not until 2020 that researchers started developing new GAN architectures to tackle the time series data. Dual adversarial autoencoder (DAAE) \[[6](https://arxiv.org/html/2402.04400v1#bib.bib6)\] used a combination of a variational autoencoder (VAE) and two GAN components, where the inner GAN was trained to replicate the encoded representation generated by the encoder, and the outer GAN was trained to generate realistic-looking patient sequences in addition to the reconstruction error. Another model called EHR-M-GAN \[[5](https://arxiv.org/html/2402.04400v1#bib.bib5)\] employed a similar autoencoder architecture with two main differences 1) they used a dual-VAE framework to handle the continuous and discrete valued features, where the continuous and discrete representations were generated by encoders first and then collectively used for decoding; 2) in the GAN generator, they used two parallel recurrent neural networks (one for sampling continuous noise and one for discrete noise) with a so-called Bilateral LSTM cell to allow the continuous and discrete noise vectors to interact with each other to generate better sampling vectors. Although these GANs took the temporal order of events into consideration, they did not generate timestamps for visits or medical events, therefore limiting the use of the synthetic data.

Improving upon the previous works, a two-stage learning algorithm (dependency learning and conditional simulation) named SynTEG was proposed to generate timestamped synthetic data \[[11](https://arxiv.org/html/2402.04400v1#bib.bib11)\]. In dependency learning, transformer encoders learned visit representations, which were used to feed into an recurrent neural network (RNN) model to learn the dependencies between visits. Two self-supervising learning tasks were used for training – prediction of the timestamp and diagnoses at the next visit. In the conditional simulation, the learned visit representations generated from the previous step were used to train a conditional GAN to generate the diagnosis codes at each visit. This approach achieved superior performance in the time-sensitive evaluations over the previous methods. However, there are still ongoing challenges that have not been addressed in their work, 1) other EHR data was not utilized because only diagnosis codes were included in training; 2) the visits were assumed to start and end on the same day, which would fail to model in-patient visits that normally span days; therefore, the constructed patient timeline would be inaccurate; 3) the synthetic data didn’t include visit types and discharge facilities.

Until now, almost all the existing approaches used some variation of GAN for learning the data distribution, but unfortunately, GANs are notoriously difficult to train and easily subject to mode collapse. Despite the recent advancements in optimization techniques such as Wasserstein-GAN \[[12](https://arxiv.org/html/2402.04400v1#bib.bib12)\], it would require a significant amount of time to tune hyperparameters to properly train GANs. As the previous works have demonstrated \[[13](https://arxiv.org/html/2402.04400v1#bib.bib13), [14](https://arxiv.org/html/2402.04400v1#bib.bib14), [15](https://arxiv.org/html/2402.04400v1#bib.bib15)\], patient sequence generation could be conceptually represented as a language modeling problem. Foresight \[[16](https://arxiv.org/html/2402.04400v1#bib.bib16)\] adapted GPT to forecast patient trajectories. Their methodused a name entity recognition (NER) tool to extract medical concepts from discharge summaries, based on which a patient sequence was constructed chronologically, and then they trained a standard GPT model using all patient sequences constructed from the previous step. To forecast future events, they fed a patient history to prompt the model and employed a Monte Carlo sampling strategy to calculate the probability of developing certain conditions. One limitation of this work was that the model could not predict when a certain condition would happen due to a lack of temporal information in their patient sequence. Nevertheless, their work demonstrated the potential of using GPT for modeling patient sequences. We aim to address this limitations in our work.

## 3 Methods

In Figure [1](https://arxiv.org/html/2402.04400v1#S3.F1 "Figure 1 ‣ 3 Methods ‣ CEHR-GPT: Generating Electronic Health Records with Chronological Patient Timelines"), we present a framework for generating synthetic EHR data from an OMOP source. To retain the temporal dependencies, we opted to work directly with time-series patient sequences instead of using a bag-of-words (BOW) representation by building on our previous work \[[13](https://arxiv.org/html/2402.04400v1#bib.bib13)\]. We first encoded the OMOP data into patient sequences using a specific patient representation, described later in this section. Secondly, we trained a generative model on the converted patient sequences and utilized it to generate new synthetic patient sequences.

 ![\[Uncaptioned image\]](extracted/5229717/overview.png)Figure 1: Overall architecture. The OMOP data is first converted to patient sequences by an OMOP encoder based on the patient representation that preserves demographics, visit types, and temporal intervals between visits. Then a generative model is trained to learn the sequence distribution in order to generate new sequences. Next, the generated sequences are converted back to the OMOP format using an OMOP decoder.

Finally, we fed the synthetic patient sequences into an OMOP decoder to create a synthetic OMOP dataset. Furthermore, an evaluation procedure was developed to assess the similarity between the synthetic OMOP and the source OMOP data.

### 3.1 Patient Representation

We designed a patient representation in CEHR-BERT \[[13](https://arxiv.org/html/2402.04400v1#bib.bib13)\] that captures medically relevant events and their timelines while exhibiting certain characteristics of a sentence. In order to fully leverage Large Language Models (LLM) on patient sequences, we further extended this patient representation to include demographic information, patient history, and temporal dependencies as shown in Figure [2](https://arxiv.org/html/2402.04400v1#S3.F2 "Figure 2 ‣ 3.1 Patient Representation ‣ 3 Methods ‣ CEHR-GPT: Generating Electronic Health Records with Chronological Patient Timelines"). The start of the sequence defines the demographic prompt containing EHR start year, age, gender, and race. It is followed by visit blocks separated by artificial time tokens (ATT) representing time intervals in days, e.g., D1subscript𝐷1D\_{1}italic\_D start\_POSTSUBSCRIPT 1 end\_POSTSUBSCRIPT represents an interval of 1 day. For time intervals surpassing 1080 days, we grouped these into a single Long Term (LT) token, a decision guided by the low occurrence rate in this time frame. Each visit block starts with a visit type token (VTT) to signify the type of visit and is then followed by domain records arranged in chronological order. In the case of inpatient visits, a distinct inpatient ATT (IATT) was inserted between neighboring inpatient spans, defined as the groups of records that occurred on the same day. These are distinct from ATT and are used for capturing the time between multiple events characterized by concepts within the same visit. In addition, a discharge facility code (e.g. discharge home and long-term care) was inserted at the end of the inpatient visit. The use of IATT, which is distinct from ATT, was necessary since they are attributed to two different contexts, and resulted in better performance than using the same ATT across both contexts.

This patient representation allows us to convert from any common data model (e.g. OMOP) to patient sequences and vice versa without any loss of temporal information. To formulate this property, let’s denote Disubscript𝐷𝑖D\_{i}italic\_D start\_POSTSUBSCRIPT italic\_i end\_POSTSUBSCRIPT to be data associated with the i𝑖iitalic\_ith patient in the source format, Pisubscript𝑃𝑖P\_{i}italic\_P start\_POSTSUBSCRIPT italic\_i end\_POSTSUBSCRIPT to be the patient sequence converted from Disubscript𝐷𝑖D\_{i}italic\_D start\_POSTSUBSCRIPT italic\_i end\_POSTSUBSCRIPT, and F𝐹Fitalic\_F to be the function that converts source data to patient sequences, represented as Pi\=F⁢(Di)subscript𝑃𝑖𝐹subscript𝐷𝑖P\_{i}=F(D\_{i})italic\_P start\_POSTSUBSCRIPT italic\_i end\_POSTSUBSCRIPT = italic\_F ( italic\_D start\_POSTSUBSCRIPT italic\_i end\_POSTSUBSCRIPT ). Let’s then denote Di′superscriptsubscript𝐷𝑖′D\_{i}^{\\prime}italic\_D start\_POSTSUBSCRIPT italic\_i end\_POSTSUBSCRIPT start\_POSTSUPERSCRIPT ′ end\_POSTSUPERSCRIPT to be the reconstructed source data and F′superscript𝐹′F^{\\prime}italic\_F start\_POSTSUPERSCRIPT ′ end\_POSTSUPERSCRIPT to be the inverse function that converts patient sequences back to original source format. This indicates Di′\=F′⁢(Pi)superscriptsubscript𝐷𝑖′superscript𝐹′subscript𝑃𝑖D\_{i}^{\\prime}=F^{\\prime}(P\_{i})italic\_D start\_POSTSUBSCRIPT italic\_i end\_POSTSUBSCRIPT start\_POSTSUPERSCRIPT ′ end\_POSTSUPERSCRIPT = italic\_F start\_POSTSUPERSCRIPT ′ end\_POSTSUPERSCRIPT ( italic\_P start\_POSTSUBSCRIPT italic\_i end\_POSTSUBSCRIPT ). Finally, let’s denote T𝑇Titalic\_T to be a function that extracts all the dates for a set of patient records. The patient representation is said to preserve temporal information perfectly if and only if the following statement is true for every single patient, T⁢(Di)\=T⁢(Di′)+Ci𝑇subscript𝐷𝑖𝑇superscriptsubscript𝐷𝑖′subscript𝐶𝑖T(D\_{i})=T(D\_{i}^{\\prime})+C\_{i}italic\_T ( italic\_D start\_POSTSUBSCRIPT italic\_i end\_POSTSUBSCRIPT ) = italic\_T ( italic\_D start\_POSTSUBSCRIPT italic\_i end\_POSTSUBSCRIPT start\_POSTSUPERSCRIPT ′ end\_POSTSUPERSCRIPT ) + italic\_C start\_POSTSUBSCRIPT italic\_i end\_POSTSUBSCRIPT, where Cisubscript𝐶𝑖C\_{i}italic\_C start\_POSTSUBSCRIPT italic\_i end\_POSTSUBSCRIPT is a constant that represents a consistent time shift e.g., Ci\=4subscript𝐶𝑖4C\_{i}=4italic\_C start\_POSTSUBSCRIPT italic\_i end\_POSTSUBSCRIPT = 4 days.

![Refer to caption](extracted/5229717/patient_representation.png)

Figure 2: The patient representation preserves demographics, visit types, and temporal intervals between visits and inpatient duration. It’s designed to have the demographic prompt at the beginning including year at the first visit, age at the first visit, gender and race tokens, then followed by a series of visit blocks to represent the complete patient timeline. An artificial time token (ATT) is inserted between the neighboring visit blocks to keep track of the time intervals in days. In each visit block, all the essential information is retained including the visit type and domain records. In the case of inpatient visits, the inpatient ATT tokens (representing time intervals in days) are inserted between groups of concepts that occur on the same day, in addition, a discharge token is provided at the end of the visit block.

### 3.2 OMOP Encoder

To create a patient sequence, we began by generating a demographic prompt using data from the OMOP person and visit tables. This prompt included essential demographic information such as the patient’s age at their initial visit, the year of their first visit, their gender, and their race. Subsequently, we constructed a series of visit blocks to represent the patient’s entire medical history. We inserted an ATT token between these visit blocks to signify the time intervals between them. Within each visit block, we gathered all relevant records from OMOP domain tables (e.g., condition) and arranged them chronologically based on their respective timestamps. In cases where there are timestamp ties, we sorted the concepts. Additionally, three artificial tokens (VS, VE, and VTT) were added at the beginning and end of each visit block to denote the start, end, and type of the visit, as illustrated in Figure [2](https://arxiv.org/html/2402.04400v1#S3.F2 "Figure 2 ‣ 3.1 Patient Representation ‣ 3 Methods ‣ CEHR-GPT: Generating Electronic Health Records with Chronological Patient Timelines"). For inpatient visit blocks, extra processing steps were necessary. Initially, we grouped records by their timestamps to identify all inpatient spans, arranging them in chronological order. Next, we inserted IATT between these spans, aligning them with the respective time intervals. Finally, the discharge facility code was extracted from the OMOP visit table and appended to the end of the block.

### 3.3 Generative Model

We used a GPT model with standard transformer decoders, where the input layer utilized concept embedding and trainable positional embedding. The model was trained using the Next Word Prediction learning objective. When generating a patient sequence, we randomly sampled a demographic prompt from our source sequences, which served as the input to the GPT model. Using these prompts, the entire patient history was generated autoregressively by sampling tokens from the predictive distribution at the final layer.

### 3.4 OMOP Decoder

The patient sequence was converted back to the OMOP format using the OMOP decoder. The start-year prompt determined the EHR history’s beginning, using January 1st as the default. Demographic data was stored in the person table, while concepts were transformed into condition, drug, and procedure tables. A date cursor was used to represent the “current time” as we were processing each patient sequence, it was initially set to the star year and was updated whenever an ATT token was encountered. We first parsed out the number of days represented by the ATT token, and then moved the data cursor by the same number of days to the future. During the sequence processing, the VS token marked the start of a new visit block. We, therefore, extracted the token corresponding to the visit type (the token immediately followed by VS) and created a new visit record with the corresponding type.

All the tokens subsumed by this visit block were converted to condition, drug, and procedure records and linked to the current visit. For outpatient visits, we assumed that all data points were generated on the same day; therefore, we set the start and end dates of the visit to the current value of the date cursor. Similarly, all the domain records were set to the date cursor as well.

When processing inpatient visits, the date cursor was updated inside the visit block based on the time intervals represented by IATT tokens between inpatient spans. Domain records were generated with the current value of the date cursor. Towards the end of the inpatient visit block, we extracted the last token (the token right before VE) corresponding to a discharge facility and updated the visit end date using the current value of the date cursor (as the date cursor was frequently updated inside an inpatient visit block). This allowed us to preserve the complete information about inpatient visits. If generated sequences do not follow patterns presented in the patient representation, they will be discarded to ensure the quality of the synthetic data.

## 4 Experiments and Results

### 4.1 Data and Preprocessing

The source patient sequences were generated from the OMOP database derived from Columbia University Irving Medical Center-New York Presbyterian Hospital EHR data, which includes 3.7 million unique patients’ medical histories including condition, medication, and procedure. Unknown concepts (i.e., c⁢o⁢n⁢c⁢e⁢p⁢t⁢\_⁢i⁢d\=0𝑐𝑜𝑛𝑐𝑒𝑝𝑡\_𝑖𝑑0concept\\\_id=0italic\_c italic\_o italic\_n italic\_c italic\_e italic\_p italic\_t \_ italic\_i italic\_d = 0) were removed from all domains except for the visit type when constructing the patient sequences using the proposed patient representation. Patients with less than 20 tokens were removed from the training dataset, and approximately 2.3 million patients were included for training whereas 75,000 patients were held out for privacy evaluations. For the GPT model, we used a context window of 512, 16 transformer decoders, 8 attention heads with a dropout rate of 0.1, and 128 dimensions for both the embedding and hidden units. All patients with longer than 512 tokens were post-truncated to fit the context window. The statistics of training data was summarized in Table [1](https://arxiv.org/html/2402.04400v1#S4.T1 "Table 1 ‣ 4.1 Data and Preprocessing ‣ 4 Experiments and Results ‣ CEHR-GPT: Generating Electronic Health Records with Chronological Patient Timelines"). We trained the model for 2 epochs on 2 Nvidia 2080 TI GPUs with a batch size of 32 and a learning rate of 0.0002. The model checkpoint was created every 10,000 steps.

No. of visits per patient

Sequence length per patient

mean

16

148

std

19

154

min

2

20

25%

4

38

50%

8

78

75%

21

198

max

102

512

Table 1: Summary statistics of the CUIMC-NYP OMOP training data

During the first epoch, we used a standard data generator strategy, where every training example was fed to the model; however, we switched to a random sampling strategy to draw training examples during the second epoch. For synthetic data generation, we used the 10th model snapshot because early experiments showed its superior performance compared to other snapshots. Furthermore, we used several sampling hyper-parameters including top k=300, top k=200, top k=100, top p=90%, top=95%, and top=100% to generate different synthetic OMOP datasets. Using specific top p/k values is a common technique in language models for data generation. For instance, the top k approach limits the selection of the k most probable tokens in the prediction distribution during sampling. On the other hand, the top p method selects a set of most likely tokens whose combined probability reaches p% (e.g. 90%) in the predictive distribution. For each sampling strategy, 1M synthetic sequences were generated and converted to OMOP. On average, 98% of the generated sequences passed the validation and were converted to OMOP.

### 4.2 Evaluations

We followed the evaluation procedures proposed by \[[17](https://arxiv.org/html/2402.04400v1#bib.bib17)\] to compute the data utility metrics including dimension-wise distribution, co-occurrence relationship, and machine learning model performance. Some of the metrics were originally designed for tabular EHR data; therefore, we adapted them to the time-series setting. When using Kullback-Leibler (KL) divergence to evaluate source and synthetic datasets, we use concept probabilities defined as,

Pp⁢r⁢o⁢b⁢(c)\=∑in𝟙⁢\[c∈hi\]∑in∑jm𝟙⁢\[cj∈hi\]subscript𝑃𝑝𝑟𝑜𝑏𝑐superscriptsubscript𝑖𝑛1delimited-\[\]𝑐subscriptℎ𝑖superscriptsubscript𝑖𝑛superscriptsubscript𝑗𝑚1delimited-\[\]subscript𝑐𝑗subscriptℎ𝑖P\_{prob}(c)=\\frac{\\sum\_{i}^{n}\\mathbbm{1}\\Big{\[}c\\in h\_{i}\\Big{\]}}{\\sum\_{i}^{n% }\\sum\_{j}^{m}\\mathbbm{1}\\Big{\[}c\_{j}\\in h\_{i}\\Big{\]}}italic\_P start\_POSTSUBSCRIPT italic\_p italic\_r italic\_o italic\_b end\_POSTSUBSCRIPT ( italic\_c ) = divide start\_ARG ∑ start\_POSTSUBSCRIPT italic\_i end\_POSTSUBSCRIPT start\_POSTSUPERSCRIPT italic\_n end\_POSTSUPERSCRIPT blackboard\_1 \[ italic\_c ∈ italic\_h start\_POSTSUBSCRIPT italic\_i end\_POSTSUBSCRIPT \] end\_ARG start\_ARG ∑ start\_POSTSUBSCRIPT italic\_i end\_POSTSUBSCRIPT start\_POSTSUPERSCRIPT italic\_n end\_POSTSUPERSCRIPT ∑ start\_POSTSUBSCRIPT italic\_j end\_POSTSUBSCRIPT start\_POSTSUPERSCRIPT italic\_m end\_POSTSUPERSCRIPT blackboard\_1 \[ italic\_c start\_POSTSUBSCRIPT italic\_j end\_POSTSUBSCRIPT ∈ italic\_h start\_POSTSUBSCRIPT italic\_i end\_POSTSUBSCRIPT \] end\_ARG

where c𝑐citalic\_c denotes the target concept, hisubscriptℎ𝑖h\_{i}italic\_h start\_POSTSUBSCRIPT italic\_i end\_POSTSUBSCRIPT denotes the i⁢t⁢h𝑖𝑡ℎithitalic\_i italic\_t italic\_h patient history, n𝑛nitalic\_n and m𝑚mitalic\_m denote the total number of patients and concepts respectively. Due to the small probability values, we opted to use the prevalence instead for data visualization using a slightly modified formula below,

Pp⁢r⁢e⁢v⁢(c)\=∑in𝟙⁢\[c∈hi\]nsubscript𝑃𝑝𝑟𝑒𝑣𝑐superscriptsubscript𝑖𝑛1delimited-\[\]𝑐subscriptℎ𝑖𝑛P\_{prev}(c)=\\frac{\\sum\_{i}^{n}\\mathbbm{1}\\Big{\[}c\\in h\_{i}\\Big{\]}}{n}italic\_P start\_POSTSUBSCRIPT italic\_p italic\_r italic\_e italic\_v end\_POSTSUBSCRIPT ( italic\_c ) = divide start\_ARG ∑ start\_POSTSUBSCRIPT italic\_i end\_POSTSUBSCRIPT start\_POSTSUPERSCRIPT italic\_n end\_POSTSUPERSCRIPT blackboard\_1 \[ italic\_c ∈ italic\_h start\_POSTSUBSCRIPT italic\_i end\_POSTSUBSCRIPT \] end\_ARG start\_ARG italic\_n end\_ARG

The only difference between the prevalence and the probability is the normalization constant used as the denominator.

For baseline comparison, we added three variants of GPT models trained on slightly different patient representations. The first baseline model was trained on the adjusted CEHR-BERT representation, which differs from the proposed patient representation by 1) CEHR-BERT ATT tokens contain a mix of day/week/month/year tokens to represent time intervals while CEHR-GPT only used the day tokens and 2) the IATT tokens and discharge facility tokens were not used in the CEHR-BERT representation. The second baseline model used the proposed patient representation with IATT tokens removed. We will refer to this baseline as GPT-OUTPAT. The last baseline GPT was trained on the patient representation widely used in time-series EHR research, where the concepts were simply ordered chronologically and put in a sequence without any additional artificial tokens. To use such sequences for comparison, we assumed that all medical events in the patient sequence belonged to a single visit. This baseline model will be referred to as GPT-Vanilla. We only used the top\_p=95% sampling strategy to generate synthetic OMOPs for these baseline models. The comparison between these patient representations can be seen in Supplementary Figure [9](https://arxiv.org/html/2402.04400v1#S7.F9 "Figure 9 ‣ 7 Supplementary Materials ‣ CEHR-GPT: Generating Electronic Health Records with Chronological Patient Timelines").

#### 4.2.1 Dimension-wise Distribution

KL divergence was assessed to compare the concept probability distributions between synthetic and source datasets among the entire population. In Figure [3](https://arxiv.org/html/2402.04400v1#S4.F3 "Figure 3 ‣ 4.2.1 Dimension-wise Distribution ‣ 4.2 Evaluations ‣ 4 Experiments and Results ‣ CEHR-GPT: Generating Electronic Health Records with Chronological Patient Timelines"), synthetic datasets generated by different patient representations and sampling strategies were evaluated against real patient data. The results showed that baseline models CEHR-BERT, GPT-Vanilla and GPT-OUTPAT with sampling strategy using the threshold of top\_p\=95%absentpercent95\=95\\%\= 95 % diverged the least from real concept probability distributions followed by GPT models trained with top\_p\=100%absentpercent100\=100\\%\= 100 % and top\_p\=95%absentpercent95\=95\\%\= 95 %. GPT models with threshold of top\_k\=300absent300\=300\= 300 and top\_k\=200absent200\=200\= 200 with relatively similar divergence. However, GPT models with threshold of top\_k\=100absent100\=100\= 100 sampling strategy had the largest KL divergence.

 ![\[Uncaptioned image\]](extracted/5229717/concept_kl_divergence.png)Figure 3: KL divergence for comparing concept probability distribution between synthetic data and real data. The probabilities of concepts were calculated on the scale of the entire population.

Furthermore, we conducted a qualitative analysis using the synthetic data top\_p=95% to gain a more comprehensive understanding. The dimension-wise distributions between the synthetic and source datasets were compared at three distinct levels: the entire population, specific sub-groups (e.g., female population), and particular cohorts (e.g., hospitalization cases). Figure [4](https://arxiv.org/html/2402.04400v1#S4.F4 "Figure 4 ‣ 4.2.1 Dimension-wise Distribution ‣ 4.2 Evaluations ‣ 4 Experiments and Results ‣ CEHR-GPT: Generating Electronic Health Records with Chronological Patient Timelines") illustrates the concept prevalence comparison between the original OMOP dataset and the generated OMOP dataset, using a threshold of top\_p\=95%absentpercent95\=95\\%\= 95 %. In the high-frequency regions, most data points cluster closely around the diagonal line, indicating a strong agreement between the source and synthetic data. Conversely, data points appear more dispersed for low-frequency concepts. Notably, in the subplot representing female conditions (located in the first column, second row), there is an unusual cluster of concepts positioned above the diagonal line. Further examination revealed that these concepts were male-specific and should not appear in the female population. Although there are a few instances of such cases in the source data, GPT amplified such cases in synthetic data.

 ![\[Uncaptioned image\]](extracted/5229717/concept_prevalence.png)Figure 4: Concept prevalence comparison between the source OMOP and generated OMOP using top p\=95%𝑝percent95p=95\\%italic\_p = 95 % in the log scale stratified by domain in columns and by population in rows, where x-axis and y-axis represent the source and the synthetic data respectively, and each dot represents a concept

In addition, we conducted a detailed comparison of the visit tables between the two OMOP datasets. Our specific focus was on performing demographic breakdowns and analyses for gender, race, and age group. The supplementary Figures [10](https://arxiv.org/html/2402.04400v1#S7.F10 "Figure 10 ‣ 7 Supplementary Materials ‣ CEHR-GPT: Generating Electronic Health Records with Chronological Patient Timelines"), [12](https://arxiv.org/html/2402.04400v1#S7.F12 "Figure 12 ‣ 7 Supplementary Materials ‣ CEHR-GPT: Generating Electronic Health Records with Chronological Patient Timelines"), [11](https://arxiv.org/html/2402.04400v1#S7.F11 "Figure 11 ‣ 7 Supplementary Materials ‣ CEHR-GPT: Generating Electronic Health Records with Chronological Patient Timelines") highlight the top 10 most prevalent visits for each demographic breakdown, showcasing that the trends in both the source and generated visit tables exhibited notable similarities.

#### 4.2.2 Co-occurrence Relationship

To measure how closely the generated datasets resemble the source, we computed the KL divergence between their co-occurrence matrices. The matrix was constructed temporally with the following logic: 1) for each concept in the patient sequence, only the future concepts were taken into consideration for creating concept pairs; 2) each patient could only contribute to the same concept pair once; 3) the matrix was normalized into a proper probability distribution by dividing the occurrences of each concept pair by the overall number of pairs. Additionally, we set benchmarks for our analysis: a lower-bound and an upper-bound. The lower bound was determined by applying the KL divergence method to two random samples from the source data. The upper bound was established by creating a theoretical co-occurrence matrix under the assumption that all concepts in the source data were independent. The KL divergence was then applied to this hypothetical matrix to calculate the upper bound. Figure [5](https://arxiv.org/html/2402.04400v1#S4.F5 "Figure 5 ‣ 4.2.2 Co-occurrence Relationship ‣ 4.2 Evaluations ‣ 4 Experiments and Results ‣ CEHR-GPT: Generating Electronic Health Records with Chronological Patient Timelines") illustrates that the datasets with CEHR-BERT and top\_k=300 most closely approach the lower bound, with the top\_p=95% and GPT-OUTPAT baselines coming next. Datasets with top\_k=100 and top\_k=200 had marginally higher KL divergence values, while the top\_p=100%, the GPT-Vanilla datasets exhibited the largest KL divergence.

To thoroughly examine the similarities between the original and the synthetic data, we carried out a qualitative analysis using one of the synthetic datasets. This involved comparing the most frequent pairs of co-occurring concepts within each category, such as condition-condition (interpreted as one condition concept followed by another condition).

 ![\[Uncaptioned image\]](extracted/5229717/cooccurrence_cleveland.png)Figure 5: KL divergence associated with different synthetic data. The closer to the lower bound in the bottom left corner, the better the synthetic data.

 ![\[Uncaptioned image\]](extracted/5229717/concept_conditional_prevalence.png)Figure 6: Top 100 co-occurring concept pairs for each co-occurrence category e.g. condition-condition interpreted as a condition concept followed by another condition concept. The x and y axes represent the synthetic and source data respectively

The results, illustrated in Figure [6](https://arxiv.org/html/2402.04400v1#S4.F6 "Figure 6 ‣ 4.2.2 Co-occurrence Relationship ‣ 4.2 Evaluations ‣ 4 Experiments and Results ‣ CEHR-GPT: Generating Electronic Health Records with Chronological Patient Timelines"), display the top 100 pairs for each type of co-occurrence relationship. The analysis revealed that the synthetic data accurately mirrored the co-occurrence patterns in most categories, with the exception of the categories ending with a drug concept (as shown in the second column of Figure [6](https://arxiv.org/html/2402.04400v1#S4.F6 "Figure 6 ‣ 4.2.2 Co-occurrence Relationship ‣ 4.2 Evaluations ‣ 4 Experiments and Results ‣ CEHR-GPT: Generating Electronic Health Records with Chronological Patient Timelines")), where the data points were more scattered. Notably, a majority of the points in condition-condition and procedure-procedure pairs aligned along the diagonal line.

 ![\[Uncaptioned image\]](extracted/5229717/diabetes_comparison.png)Figure 7: Comparison of temporal co-occurrence networks around Type 2 Diabetes Mellitus (T2DM) for real (left) and synthetic data (right). Networks were constructed with T2DM’s (large circle) top 5 co-occurring condition concepts and their own top 5 co-occurring condition concepts. The metrics Prevalence (top) and Pointwise Mutual Information-3 (PMI33{}^{3}start\_FLOATSUPERSCRIPT 3 end\_FLOATSUPERSCRIPT) (bottom) were used to quantify co-occurrence. Gold edges indicate edges that are shared by both real and synthetic data, edge thickness indicates the strength of co-occurrence, and arrow direction indicates the direction of the temporal association.

For an in-depth analysis, we focused on examining the co-occurrence relationships associated with Type 2 Diabetes Mellitus (T2DM). Figure [7](https://arxiv.org/html/2402.04400v1#S4.F7 "Figure 7 ‣ 4.2.2 Co-occurrence Relationship ‣ 4.2 Evaluations ‣ 4 Experiments and Results ‣ CEHR-GPT: Generating Electronic Health Records with Chronological Patient Timelines") qualitatively compares the real and top\_p=95% synthetic data networks of condition concepts that co-occur around T2DM. The degree of co-occurrence is calculated with prevalence, which evaluates the frequency of concept co-occurrence, and Pointwise Mutual Information-3 (PMI33{}^{3}start\_FLOATSUPERSCRIPT 3 end\_FLOATSUPERSCRIPT), which evaluates the probabilistic association of concepts. There is much overlap between the real and synthetic networks when prevalence is used to construct them, but connections are more disparate when PMI33{}^{3}start\_FLOATSUPERSCRIPT 3 end\_FLOATSUPERSCRIPT is used.

#### 4.2.3 Predictive performance

For this analysis, we constructed five prediction tasks using the method described in \[[13](https://arxiv.org/html/2402.04400v1#bib.bib13)\] and the Book of OHDSI \[[18](https://arxiv.org/html/2402.04400v1#bib.bib18)\]. Table [2](https://arxiv.org/html/2402.04400v1#S4.T2 "Table 2 ‣ 4.2.3 Predictive performance ‣ 4.2 Evaluations ‣ 4 Experiments and Results ‣ CEHR-GPT: Generating Electronic Health Records with Chronological Patient Timelines") shows the cohort and the corresponding definition.

Cohort

Definition

HF readmission

HF patients who have a 30-day all-cause readmission. Observation window: 360 days, Prediction windows 30 days

Hospitalization

2-year risk of hospitalization starting from the 3rd year since the initial entry into the EHR system. Observation window: 540 days, hold-off window: 180 days, prediction windows: 720 days

COPD readmission

COPD patients who have a 30-day all-cause readmission. Observation window: 360 days, prediction windows: 30 days

Afib ischemic stroke

Afib patients with 1-year risk since the initial diagnosis of afib ischemic stroke. Observation window: 720 days, prediction windows: 360 days

CAD CABG

Patients initially diagnosed with Coronary Arterial Disease (CAD) without any prior stent graft will receive the Coronary artery bypass surgery (CABG) treatment. Observation window: 720 days, prediction windows: 360 days

Table 2: Cohort definitions

To extract features, we first rolled up the medical concepts using ontological hierarchies to reduce dimensionality \[see supplementary materials\] and used the bag-of-word (BOW) approach, where we counted the frequency of each concept in a given observation window. For each task, we split the cohort data (both synthetic and real) into training and testing sets with a split ratio of 85:15. We ran logistic regression using Sklearn’s implementation with the default configuration. Finally, the area under the receiver operating characteristics curve (AUC) was calculated using the test set. In addition, we reported PR-AUC (precision-recall) due to the class imbalance often present in EHR data. Table [3](https://arxiv.org/html/2402.04400v1#S4.T3 "Table 3 ‣ 4.2.3 Predictive performance ‣ 4.2 Evaluations ‣ 4 Experiments and Results ‣ CEHR-GPT: Generating Electronic Health Records with Chronological Patient Timelines") shows the prevalence of the positive cases, ROC-AUC, and PR-AUC for each synthetic data. The metrics associated with the baseline CEHR-BERT are reported in the Supplementary Materials Table [7](https://arxiv.org/html/2402.04400v1#S7.T7 "Table 7 ‣ 7 Supplementary Materials ‣ CEHR-GPT: Generating Electronic Health Records with Chronological Patient Timelines"). For easy comparison of synthetic datasets, we defined a consolidated distance metric as the weighted average of the relative differences of the three aforementioned metrics,

d⁢i⁢s⁢t\=|δP⁢r⁢e|×0.5P⁢r⁢et⁢r⁢u⁢e+|δA⁢U⁢C|×0.25A⁢U⁢Ct⁢r⁢u⁢e+|δP⁢R|×0.25P⁢Rt⁢r⁢u⁢e𝑑𝑖𝑠𝑡subscript𝛿𝑃𝑟𝑒0.5𝑃𝑟subscript𝑒𝑡𝑟𝑢𝑒subscript𝛿𝐴𝑈𝐶0.25𝐴𝑈subscript𝐶𝑡𝑟𝑢𝑒subscript𝛿𝑃𝑅0.25𝑃subscript𝑅𝑡𝑟𝑢𝑒dist=\\frac{|\\delta\_{Pre}|\\times 0.5}{Pre\_{true}}+\\frac{|\\delta\_{AUC}|\\times 0.% 25}{AUC\_{true}}+\\frac{|\\delta\_{PR}|\\times 0.25}{PR\_{true}}italic\_d italic\_i italic\_s italic\_t = divide start\_ARG | italic\_δ start\_POSTSUBSCRIPT italic\_P italic\_r italic\_e end\_POSTSUBSCRIPT | × 0.5 end\_ARG start\_ARG italic\_P italic\_r italic\_e start\_POSTSUBSCRIPT italic\_t italic\_r italic\_u italic\_e end\_POSTSUBSCRIPT end\_ARG + divide start\_ARG | italic\_δ start\_POSTSUBSCRIPT italic\_A italic\_U italic\_C end\_POSTSUBSCRIPT | × 0.25 end\_ARG start\_ARG italic\_A italic\_U italic\_C start\_POSTSUBSCRIPT italic\_t italic\_r italic\_u italic\_e end\_POSTSUBSCRIPT end\_ARG + divide start\_ARG | italic\_δ start\_POSTSUBSCRIPT italic\_P italic\_R end\_POSTSUBSCRIPT | × 0.25 end\_ARG start\_ARG italic\_P italic\_R start\_POSTSUBSCRIPT italic\_t italic\_r italic\_u italic\_e end\_POSTSUBSCRIPT end\_ARG

where δP⁢r⁢esubscript𝛿𝑃𝑟𝑒\\delta\_{Pre}italic\_δ start\_POSTSUBSCRIPT italic\_P italic\_r italic\_e end\_POSTSUBSCRIPT, δA⁢U⁢Csubscript𝛿𝐴𝑈𝐶\\delta\_{AUC}italic\_δ start\_POSTSUBSCRIPT italic\_A italic\_U italic\_C end\_POSTSUBSCRIPT, and δP⁢Rsubscript𝛿𝑃𝑅\\delta\_{PR}italic\_δ start\_POSTSUBSCRIPT italic\_P italic\_R end\_POSTSUBSCRIPT represent the differences in prevalence, ROC-AUC, and PR-AUC between the source and the synthetic data; P⁢r⁢et⁢r⁢u⁢e𝑃𝑟subscript𝑒𝑡𝑟𝑢𝑒Pre\_{true}italic\_P italic\_r italic\_e start\_POSTSUBSCRIPT italic\_t italic\_r italic\_u italic\_e end\_POSTSUBSCRIPT, A⁢U⁢Ct⁢r⁢u⁢e𝐴𝑈subscript𝐶𝑡𝑟𝑢𝑒AUC\_{true}italic\_A italic\_U italic\_C start\_POSTSUBSCRIPT italic\_t italic\_r italic\_u italic\_e end\_POSTSUBSCRIPT, and P⁢Rt⁢r⁢u⁢e𝑃subscript𝑅𝑡𝑟𝑢𝑒PR\_{true}italic\_P italic\_R start\_POSTSUBSCRIPT italic\_t italic\_r italic\_u italic\_e end\_POSTSUBSCRIPT denote the ground truth metrics generated from the source data.

Figure [8](https://arxiv.org/html/2402.04400v1#S4.F8 "Figure 8 ‣ 4.2.3 Predictive performance ‣ 4.2 Evaluations ‣ 4 Experiments and Results ‣ CEHR-GPT: Generating Electronic Health Records with Chronological Patient Timelines") presents the distance metrics for various synthetic datasets across different cohorts. The dataset created with top\_k=300 displayed the best performance in HF and COPD Readmission but was less effective in other cohorts. The top\_p=95% dataset maintained consistent performance levels, ranking as the best in Hospitalization and Afib ischemic stroke, and as second-best in HF and COPD readmission. In comparison, the GPT-OUTPAT baseline dataset exhibited a slightly higher divergence across the Hospitalization, Afib Ischemic Stroke, and CAD CABG groups. However, the CEHR-BERT baseline showed similar patterns in most cohorts, with a notably lower divergence in CAD CABG. It is noted that both GPT-OUTPAT and CEHR-BERT were not included in the HF Readmission and COPD Readmission analyses due to the absence of synthetic patients meeting the selection criteria for these cohorts. Other synthetic datasets, specifically those generated with top\_p=100% and top\_k=200 lagged behind in performance. Interestingly, top\_k=100 showed a unique pattern, being the closest in the distance for the CAD CABG cohort but underperforming in the others.

 ![\[Uncaptioned image\]](extracted/5229717/ml_combined_metrics.png)Figure 8: The consolidated distance metrics for different synthetic datasets stratified by cohort. GPT-Vanilla and CEHR-BERT were omitted as the cohorts couldn’t be constructed due to the loss of temporal information. GPT-OUTPAT was omitted from HF readmission and COPD readmission as the cohorts for the same reason.

Cohort

Real

p=95%

p=100%

k=100

k=200

k=300

GPT-OUTPAT

HF readmission

Pre = 25.7 AUC = 65.7 PR = 39.3

Pre = 27.6 AUC = 69.2 PR = 45.7

Pre =27.7 AUC = 52.4 PR = 29.0

Pre = 30.7 AUC = 68.1 PR = 47.8

Pre = 29.3 AUC = 54.0 PR = 32.9

Pre = 26.5 AUC = 61.1 PR = 33.8

Pre =100.0 AUC = NA PR = NA

Hospitalization

Pre = 5.6 AUC = 75.3 PR = 19.5

Pre = 5.2 AUC = 77.1 PR = 21.4

Pre = 7.4 AUC = 71.3 PR = 20.2

Pre = 2.8 AUC = 87.0 PR = 22.1

Pre = 5.2 AUC = 84.2 PR = 20.8

Pre = 6.3 AUC = 78.7 PR = 24.6

Pre = 5.2 AUC = 70.2 PR = 14.3

COPD readmission

Pre = 34.5 AUC = 74.2 PR = 83.8

Pre = 37.8 AUC = 76.4 PR = 84.4

Pre = 47.2 AUC = 74.1 PR = 67.2

Pre = 26.4 AUC = 75.9 PR = 90.3

Pre = 28.3 AUC = 70.1 PR = 82.8

Pre = 34.5 AUC = 68.8 PR = 80.2

Pre = NA AUC = NA PR = NA

Afib ischemic stroke

Pre = 8.7 AUC = 84.0 PR = 48.5

Pre = 10.2 AUC = 78.9 PR = 41.2

Pre = 10.4 AUC = 70.7 PR = 39.1

Pre = 16.6 AUC = 77.1 PR = 50.5

Pre = 15.8 AUC =68.9 PR = 36.6

Pre = 10.8 AUC = 76.8 PR = 38.5

Pre = 9.7 AUC = 67.2 PR = 27.2

CAD CABG

Pre = 7.1 AUC = 88.4 PR = 55.9

Pre = 4.1 AUC = 81.5 PR = 25.2

Pre = 4.4 AUC = 52.9 PR = 4.3

Pre = 7.2 AUC = 84.7 PR = 31.3

Pre = 4.9 AUC = 73.5 PR = 24.3

Pre = 4.0 AUC = 79.0 PR = 24.1

Pre = 3.5 AUC = 81.5 PR = 44.4

Table 3: Logistic regression model performance across different datasets. In each cell, three numbers were reported including the prevalence of the positive cases, ROC-AUC, and PR-AUC

### 4.3 Privacy Evaluations

We adopted the privacy evaluation framework outlined in \[[17](https://arxiv.org/html/2402.04400v1#bib.bib17)\], focusing on quantifying the risk of privacy breaches through attribute and member inference attacks. The attribute inference risk assesses the likelihood of inferring sensitive attributes from a synthetic dataset by utilizing targeted patients’ demographic information and common diagnoses found in real datasets available to the adversary. In a membership inference attack, the adversary tries to determine if the target record was in the training set given all or partial attributes.

#### 4.3.1 Membership Inference Attack

We simulated two different attack scenarios, namely the dataset attack and the model attack. In a dataset attack, attackers only have access to the synthetic dataset, whereas they can query the model itself in a model attack. Their goal is to find a way to infer whether or not a real patient record was used for training \[[19](https://arxiv.org/html/2402.04400v1#bib.bib19)\]. For example, the model might output a high probability associated with the training data points and a low probability for the non-training ones, similarly, the synthetic data might be more similar to the training data than the non-training ones.

The attack dataset was constructed based on the following procedure 1) we created the negative examples by taking the 75000 holdout set and labeling them as negative; 2) we created the positive examples by randomly selecting 75000 patients from the training set and assigning them as positive. In the dataset attack, for each attack data point, we found the best match from the synthetic data using a hamming distance metric, which sums up the absolute differences in age, number of visits, and concepts \[[19](https://arxiv.org/html/2402.04400v1#bib.bib19)\], finally, the median distance was used as a threshold, below which patients were predicted as positive and negative otherwise. In the model attack, we computed the average loss of each patient sequence by feeding the attack dataset to the model directly, similarly, the median loss was used to infer the positive/negative cases, where the positive cases were assigned to those below the threshold and positive otherwise. Finally, we calculated recall/precision/f1/accuracy using the ground truth labels against those inferred predictions. Table [4](https://arxiv.org/html/2402.04400v1#S4.T4 "Table 4 ‣ 4.3.1 Membership Inference Attack ‣ 4.3 Privacy Evaluations ‣ 4 Experiments and Results ‣ CEHR-GPT: Generating Electronic Health Records with Chronological Patient Timelines") shows that the accuracy of both attacks is slightly less than 50%, indicating that the performance of such attacks is worse than a random guess.

Accuracy

Recall

Precision

F1

Model Attack

0.4955

0.4955

0.4942

0.4949

Data Attack

0.4941

0.4996

0.4959

0.4978

Table 4: Membership Inference Attack metrics

#### 4.3.2 Attribute Inference Attack

In attribute inference attack, we assumed the attacker has access to a group of target patients along with their demographic data, including age, gender, race, the year of their initial clinical visit, and prevalent clinical conditions like hypertension, abdominal pain, chest pain, etc. With these features, the attacker identifies the patient in the synthetic dataset with the closest attribute resemblance to the target individual. Then the attacker aims to use the sensitive attributes of matched patient from synthetic dataset to infer the corresponding sensitive attributes of the target patient.

To quantitatively evaluate the attribute inference risk, we randomly sampled 150,000 patients from the real patient dataset as a target group. The search group compromised 1 million generated synthetic patients. To find most similar patients from the search group, we created a set of common attributes including the demographic data along with the top 1% of the most prevalent condition concepts, represented as one-hot encoded features. Then a k-nearest neighbors (KNN with k = 1) algorithm was applied to each target patient and a synthetic patient with the smallest euclidean distance was found. Finally we extracted the sensitive attributes (condition concepts not in the top 1% tier) from matched target and synthetic patients. F1 scores were computed for the sensitive attributes of each matched patient pair and aggregated across all matched patients.

A baseline analysis was performed substituting real patients for synthetic patients. A result lower than the baseline suggests that the likelihood of finding a synthetic data similar to a real patient is lower than finding a real patient similar to a real patient who share sensitive attributes. This implies a lower attribute inference risk which could be acceptable. Our training set was randomly divided into two halves, with 1 million real patients assigned as the target group, and the remaining 1 million as the search group. The matching process was consistently applied and an aggregated F1 score was computed. Table [5](https://arxiv.org/html/2402.04400v1#S4.T5 "Table 5 ‣ 4.3.2 Attribute Inference Attack ‣ 4.3 Privacy Evaluations ‣ 4 Experiments and Results ‣ CEHR-GPT: Generating Electronic Health Records with Chronological Patient Timelines") shows that the F1 score of synthetic vs real is less than real vs real scenario. But it’s still higher than other models who didn’t capture the real patterns as effectively. \[[19](https://arxiv.org/html/2402.04400v1#bib.bib19)\]

Recall

Precision

F1

Synthetic vs Real

0.0350

0.0343

0.0271

Real vs Real

0.0612

0.0468

0.0421

Table 5: Attribute Inference Attack metrics

## 5 Discussion

To the best of our knowledge, this is the first attempt to utilize GPT for generating time-series heterogeneous EHR data, while preserving patient privacy. Our main contribution lies in designing a novel patient representation that preserves a complete timeline of the patient’s history, along with crucial visit details, thereby enabling GPT to create realistic patient sequences. Importantly, this representation facilitates seamless conversion back to the OMOP format, simplifying dissemination and analysis. This patient representation could serve as an effective messenger for transferring information across various standard data models. At present, our system is tailored to the OMOP format. However, it is designed with adaptability in mind, enabling us to seamlessly integrate new encoder/decoder pairs. This flexibility would facilitate the conversion of patient sequences to other widely-used data models, such as i2b2\[[20](https://arxiv.org/html/2402.04400v1#bib.bib20)\].

The study undertakes a three-tiered evaluation approach, systematically comparing synthetic and real datasets based on their marginal (column-wise distribution), conditional (co-occurrence relationship), and joint distributions (predictive performance). Concurrently, as the evaluation progresses through these three levels, there is a corresponding escalation in the complexity and challenge of the tasks involved. The outcomes of the KL divergence analysis revealed a nuanced relationship between the top k/p sampling strategies and the performance across the evaluation levels. Specifically, an increase in top k/p values enhanced performance in level 1 concept prevalence. However, an excessively high or low top k/p value adversely affects both level 2 co-occurrence metrics and level 3 machine learning predictions. This pattern suggests that including more tokens in the predictive distribution introduces greater uncertainty and a wider array of potential patient trajectory variations in the data generation process, thereby escalating the difficulty of achieving comparable performance outcomes.

The sampling strategies of top\_p=95% and top\_k=300 seem to be most effective for generating the synthetic data. For instance, the synthetic data created with top\_p=95% demonstrates the second smallest divergence in both dimension-wise distribution and co-occurrence relationship. Simultaneously, the corresponding synthetic cohorts successfully replicated the performance metrics in all predictive tasks, with the exception of CAD CABG. Finally, the significance of this patient representation transcends synthetic data generation; we believe it has the potential to establish the groundwork for integrating time into patient representations across diverse EHR-based deep-learning models.

### 5.1 Loss of Temporal Information

The reason that CEHR-GPT replicated the performance metrics of the prediction tasks can be attributed to the use of time tokens in its underlying patient representation. The majority of the prediction problems are phrased as “For a group of target patients who share similar characteristics, who would experience a particular medical event in one year from the index event?” in EHR research, therefore maintaining a complete patient timeline is crucial for time-sensitive cohort constructions \[[18](https://arxiv.org/html/2402.04400v1#bib.bib18)\].

We claimed that the proposed patient representation had almost zero loss of temporal information, although this makes intuitive sense, there does not exist a formal metric to quantify this. To bridge this gap, we conceived a new metric named loss of temporal information (LOTI) to estimate the shrinkage of the patient timeline due to the use of the patient representation in an EHR dataset. Let’s denote T𝑇Titalic\_T to be the time interval measured in days, ATT to be an artificial time token that represents a time interval (W0subscript𝑊0W\_{0}italic\_W start\_POSTSUBSCRIPT 0 end\_POSTSUBSCRIPT), F𝐹Fitalic\_F to be a function that maps T𝑇Titalic\_T to an ATT token (four days to W0subscript𝑊0W\_{0}italic\_W start\_POSTSUBSCRIPT 0 end\_POSTSUBSCRIPT). In addition, let G𝐺Gitalic\_G be the inverse function of F𝐹Fitalic\_F that converts an ATT to T𝑇Titalic\_T, moreover, we impose the constraint on G such that it takes the lower bound of ATT e.g., W0⟹0subscript𝑊00W\_{0}\\implies 0italic\_W start\_POSTSUBSCRIPT 0 end\_POSTSUBSCRIPT ⟹ 0 days. Formally, we define LOTI as the expected difference between the original time interval T𝑇Titalic\_T and the reconstructed time interval G⁢(F⁢(T))𝐺𝐹𝑇G(F(T))italic\_G ( italic\_F ( italic\_T ) ) as the following,

L⁢O⁢T⁢I\=Ep⁢(T)⁢\[T−G⁢(F⁢(T))\]𝐿𝑂𝑇𝐼subscript𝐸𝑝𝑇delimited-\[\]𝑇𝐺𝐹𝑇LOTI=E\_{p(T)}\\Big{\[}T-G\\big{(}F(T)\\big{)}\\Big{\]}italic\_L italic\_O italic\_T italic\_I = italic\_E start\_POSTSUBSCRIPT italic\_p ( italic\_T ) end\_POSTSUBSCRIPT \[ italic\_T - italic\_G ( italic\_F ( italic\_T ) ) \]

where P⁢(T)𝑃𝑇P(T)italic\_P ( italic\_T ) is the probability of T𝑇Titalic\_T observed in the training data defined as,

P⁢(T)\=Freq of TΣ⁢TFreq of T𝑃𝑇Freq of TΣTFreq of TP(T)=\\frac{\\textit{Freq of T}}{\\Sigma\\textsuperscript{T}\\textit{Freq of T}}italic\_P ( italic\_T ) = divide start\_ARG Freq of T end\_ARG start\_ARG roman\_Σ italic\_Freq italic\_of italic\_T end\_ARG

We computed LOTI for the patient representations utilized in CEHR-GPT and baseline models, shown in Figure [9](https://arxiv.org/html/2402.04400v1#S7.F9 "Figure 9 ‣ 7 Supplementary Materials ‣ CEHR-GPT: Generating Electronic Health Records with Chronological Patient Timelines"). As Table [6](https://arxiv.org/html/2402.04400v1#S5.T6 "Table 6 ‣ 5.1 Loss of Temporal Information ‣ 5 Discussion ‣ CEHR-GPT: Generating Electronic Health Records with Chronological Patient Timelines") shows, CEHR-GPT has the least LOTI compared to the other patient representations while GPT-OUTPAT has a slightly higher time shrinkage because the inpatient duration was not retained. CEHR-BERT has a relatively large LOTI compared to the previous two representations due to the use of coarse ATT tokens. Finally, GPT-Vanilla has the most LOTI, which is equal to the expected length of the timeline in the source population due to the complete collapse of the timeline.

Representation

Between visit ATT token

Between inpatient span ATT token

LOTI

CEHR-GPT

Day token for T≤1080𝑇1080T\\leq 1080italic\_T ≤ 1080 LT token for T\>1080𝑇1080T>1080italic\_T > 1080

Day token

7.739

GPT-OUTPAT

Day token for T≤1080𝑇1080T\\leq 1080italic\_T ≤ 1080 LT token for T\>1080𝑇1080T>1080italic\_T > 1080

N/A

7.962

CEHR-BERT

Day token for T<7𝑇7T<7italic\_T < 7 Week token for 7≤T<307𝑇307\\leq T<307 ≤ italic\_T < 30 Month token for 30≤T<36030𝑇36030\\leq T<36030 ≤ italic\_T < 360 LT token T≥360𝑇360T\\geq 360italic\_T ≥ 360

N/A

31.482

GPT-Vanilla

N/A

N/A

111.164

Table 6: Loss of Temporal Information for Different Patient Representations

### 5.2 Time Invariance and Sensitivity

Across all synthetic datasets, the dimension-wise distribution (marginal distribution) and co-occurrence relationship were well preserved, regardless of the patient timeline’s integrity within the models used. Even with a high LOTI, baseline models such as CEHR-BERT accurately mirrored both marginal distribution and co-occurrence relationship, yielding results similar to those from CEHR-GPT. This implies that these two measures may be largely time-invariant, unaffected by any shrinkage in the patient timeline. The rationale behind this is rooted in their construction methods, which either disregard or marginalize the temporal factor. Marginal distribution was constructed by counting the unique number of patients associated with the target concept, which was then normalized by a constant. The construction disregarded temporality, as the placement of a concept on the timeline was not a factor of consideration. The co-occurrence matrix was created using time initially but was marginalized after all co-occurring pairs were collected from the patient population.

On the contrary, the predictive performance is extremely sensitive to any change made to the patient timeline as the cohort construction requires the integrity of the patient timeline. For example, HF readmission requires a 30-day prediction window from the index event (defined as the hospitalization episode with a heart failure diagnosis). Any shrinkage to the patient timeline will disrupt the construction of this cohort. The synthetic HF readmission cohort produced by CEHR-BERT showed a readmission rate of 100% due to the shrinkage of the timeline in this patient representation; whereas, the actual expected rate of readmission should be approximately 25%. Compared to CEHR-GPT, GPT-OUTPAT encoded time intervals between visits but did not preserve the duration of inpatient visits, therefore having a slightly higher LOTI. As a consequence, it showed reasonable performance in the cohorts (Hospitalization and Afib ischemic stroke), which had a 360-day prediction window and were thus less impacted by timeline shrinkage. However, in the case of HF Readmission (where a 100% readmission rate was observed) and COPD Readmission (which identified no patients), GPT-OUTPAT was less successful. These cohorts used a short 30-day prediction window, making them highly sensitive to any distortions in the timeline, which likely led to synthetic patients not meeting the cohort selection criteria. Interestingly, the CAD CABG cohort presents a notable deviation from the general trend, where the CEHR-GPT dataset with top\_k=100 outperformed both the top\_p=95% and top\_k=300 configurations. Additionally, the CEHR-BERT synthetic data accurately replicated the machine learning performance metrics as well. This indicates that the CAD CABG cohort was less affected by time shrinkage.

Therefore, selecting the appropriate patient representation is pivotal in maintaining specific properties of the source data when generating synthetic data. The choice hinges on the intended application of synthetic data, ensuring that critical features and patterns inherent to the patient information are accurately reflected and retained.

### 5.3 Time Sensitive Forecasting

Because the patient representation encodes all the temporal information in the sequence, the trained GPT model could be used potentially for time-sensitive forecasting. We could prompt the trained GPT model with a patient history and estimate the time of the next visit via a Monte Carlo Sampling approach shown in the following equation,

P⁢(δt|h)≈∑i\=1n𝟙⁢\[Mg⁢p⁢t⁢(h)\=δt\]n𝑃conditionalsubscript𝛿𝑡ℎsubscriptsuperscript𝑛𝑖11delimited-\[\]subscript𝑀𝑔𝑝𝑡ℎsubscript𝛿𝑡𝑛P(\\delta\_{t}|h)\\approx\\frac{\\sum^{n}\_{i=1}\\mathbbm{1}\\Big{\[}M\_{gpt}(h)=\\delta\_% {t}\\Big{\]}}{n}italic\_P ( italic\_δ start\_POSTSUBSCRIPT italic\_t end\_POSTSUBSCRIPT | italic\_h ) ≈ divide start\_ARG ∑ start\_POSTSUPERSCRIPT italic\_n end\_POSTSUPERSCRIPT start\_POSTSUBSCRIPT italic\_i = 1 end\_POSTSUBSCRIPT blackboard\_1 \[ italic\_M start\_POSTSUBSCRIPT italic\_g italic\_p italic\_t end\_POSTSUBSCRIPT ( italic\_h ) = italic\_δ start\_POSTSUBSCRIPT italic\_t end\_POSTSUBSCRIPT \] end\_ARG start\_ARG italic\_n end\_ARG

where Mg⁢p⁢tsubscript𝑀𝑔𝑝𝑡M\_{gpt}italic\_M start\_POSTSUBSCRIPT italic\_g italic\_p italic\_t end\_POSTSUBSCRIPT denotes the GPT model, hℎhitalic\_h denotes a patient history, δtsubscript𝛿𝑡\\delta\_{t}italic\_δ start\_POSTSUBSCRIPT italic\_t end\_POSTSUBSCRIPT denotes any time interval, and n𝑛nitalic\_n represents the number of samples. Then we can use the expectation E⁢(δt)𝐸subscript𝛿𝑡E\\big{(}\\delta\_{t}\\big{)}italic\_E ( italic\_δ start\_POSTSUBSCRIPT italic\_t end\_POSTSUBSCRIPT ) as the predicted time interval. In addition, we can quantify the confidence by calculating the standard deviation e.g. s⁢d⁢(δt)𝑠𝑑subscript𝛿𝑡sd(\\delta\_{t})italic\_s italic\_d ( italic\_δ start\_POSTSUBSCRIPT italic\_t end\_POSTSUBSCRIPT ). Similarly, we can predict the visit type (v𝑣vitalic\_v) using the same Monte Carlo approach.

P⁢(v|E⁢(δt),h)≈∑i\=1n𝟙⁢\[Mg⁢p⁢t⁢(E⁢(δt),h)\=v\]n𝑃conditional𝑣𝐸subscript𝛿𝑡ℎsubscriptsuperscript𝑛𝑖11delimited-\[\]subscript𝑀𝑔𝑝𝑡𝐸subscript𝛿𝑡ℎ𝑣𝑛P(v|E\\big{(}\\delta\_{t}\\big{)},h)\\approx\\frac{\\sum^{n}\_{i=1}\\mathbbm{1}\\Big{\[}M% \_{gpt}\\Big{(}E\\big{(}\\delta\_{t}\\big{)},h\\Big{)}=v\\Big{\]}}{n}italic\_P ( italic\_v | italic\_E ( italic\_δ start\_POSTSUBSCRIPT italic\_t end\_POSTSUBSCRIPT ) , italic\_h ) ≈ divide start\_ARG ∑ start\_POSTSUPERSCRIPT italic\_n end\_POSTSUPERSCRIPT start\_POSTSUBSCRIPT italic\_i = 1 end\_POSTSUBSCRIPT blackboard\_1 \[ italic\_M start\_POSTSUBSCRIPT italic\_g italic\_p italic\_t end\_POSTSUBSCRIPT ( italic\_E ( italic\_δ start\_POSTSUBSCRIPT italic\_t end\_POSTSUBSCRIPT ) , italic\_h ) = italic\_v \] end\_ARG start\_ARG italic\_n end\_ARG

Finally, we can predict the most likely medical event (c𝑐citalic\_c) given the predicted visit type v𝑣vitalic\_v,

P⁢(c|v,E⁢(δt),h)≈∑i\=1n𝟙⁢\[Mg⁢p⁢t⁢(v,E⁢(δt),h)\=c\]n𝑃conditional𝑐𝑣𝐸subscript𝛿𝑡ℎsubscriptsuperscript𝑛𝑖11delimited-\[\]subscript𝑀𝑔𝑝𝑡𝑣𝐸subscript𝛿𝑡ℎ𝑐𝑛P(c|v,E\\big{(}\\delta\_{t}\\big{)},h)\\approx\\frac{\\sum^{n}\_{i=1}\\mathbbm{1}\\Big{\[% }M\_{gpt}\\Big{(}v,E\\big{(}\\delta\_{t}\\big{)},h\\Big{)}=c\\Big{\]}}{n}italic\_P ( italic\_c | italic\_v , italic\_E ( italic\_δ start\_POSTSUBSCRIPT italic\_t end\_POSTSUBSCRIPT ) , italic\_h ) ≈ divide start\_ARG ∑ start\_POSTSUPERSCRIPT italic\_n end\_POSTSUPERSCRIPT start\_POSTSUBSCRIPT italic\_i = 1 end\_POSTSUBSCRIPT blackboard\_1 \[ italic\_M start\_POSTSUBSCRIPT italic\_g italic\_p italic\_t end\_POSTSUBSCRIPT ( italic\_v , italic\_E ( italic\_δ start\_POSTSUBSCRIPT italic\_t end\_POSTSUBSCRIPT ) , italic\_h ) = italic\_c \] end\_ARG start\_ARG italic\_n end\_ARG

This approach goes beyond conventional prediction methods by not only forecasting future medical events but also determining the timing of the next visit and the specific medical events associated with that visit type. This predictive model could provide a more detailed and actionable timeline for patient care.

### 5.4 Limitations

While synthetic datasets demonstrated a high degree of similarity to source data, they are subject to certain known constraints. Firstly, a selection bias was present in the training data due to the constraints on sequence length, ranging from 20 to 512. This limitation resulted in the partial inclusion of patients with chronic conditions, which typically require a longer context window for accurate representation. While extending the context window of the model could potentially address this issue, it may introduce unforeseen effects. Finding the optimal configuration to accommodate a broader context window would require comprehensive experiments.

Secondly, identifying an optimal sampling strategy for generating synthetic data remains a challenge due to the presence of numerous hyperparameters such as temperature, top\_p, and top\_k. These parameters, when used in conjunction, could yield a wide array of configurations. While the top\_p=95% strategy showed the least divergence from the source data, it was unable to accurately replicate performance metrics for CAD CABG. As an interim solution, we may publish multiple versions of synthetic data, along with their corresponding performance metrics. This approach would allow researchers to select the most suitable dataset for their specific use case.

Thirdly, the GPT model showed a propensity to over-represent prevalent concepts, skewing towards those with higher frequencies in the dataset. An illustration of this is seen in the synthetic data, where 78% of patients had at least one outpatient visit, in contrast to the actual data where this figure was 73%. This discrepancy indicates a bias in the model towards more common occurrences. In addition, the co-occurrence analysis also demonstrated that the synthetic reconstruction faithfully represents the frequent concept pairs in the original data but may be less effective at recovering the finer associations between rare concepts as shown in Figure [7](https://arxiv.org/html/2402.04400v1#S4.F7 "Figure 7 ‣ 4.2.2 Co-occurrence Relationship ‣ 4.2 Evaluations ‣ 4 Experiments and Results ‣ CEHR-GPT: Generating Electronic Health Records with Chronological Patient Timelines"). To address the over-representation of prevalent concepts by the GPT model, future work will look into implementing regularization techniques. One promising approach is adaptive regularization, which can be outlined in several steps: 1) Model Training: Begin by training the GPT model for a predetermined number of steps; 2) Sequence Generation and Analysis: Generate a sample of patient sequences from the trained model and calculate the marginal distribution of the concepts within these sequences; 3) Distribution Comparison and Adjustment Score Calculation: Compare the model-generated distribution to the empirical distribution derived from the actual data. From this comparison, calculate an adjustment score for each concept; 4) Logit Adjustment: Modify the logits for each concept in the model according to the calculated adjustment scores. By implementing this procedure, the influence of each concept on the model’s learning process would be adaptively modified during back-propagation, allowing for an update in the model parameters that takes into account the disparity between the generated and actual data distributions. This should help in reducing the bias towards over-represented concepts.

Furthermore, improving patient representation is an area for further development. Currently, the model’s representation is limited to daily intervals and does not capture more precise measurements like hours or minutes. This limitation is particularly relevant for intensive care unit (ICU) data where time-sensitive decisions are critical. Furthermore, the current model framework assigns the first visit of every synthetic patient to the start of the year, as it only includes a year token to denote the commencement of patient history. To refine the accuracy of patient history commencement, integrating a month token alongside the year token is being considered to properly represent seasonality. This would provide a more accurate reconstruction of the starting point for a patient’s first visit in the generated data.

Lastly, there is a necessity to incorporate the death event within patient sequences. Including this event would allow the synthetic data to more accurately represent mortality, enhancing its utility for predictions related to patient outcomes and lifespan. These enhancements aim to create a more precise and clinically relevant synthetic dataset that better mirrors the complexities of real-world patient trajectories.

## 6 Conclusion

To our knowledge, this is the first attempt to utilize GPT for generating time-series EHR data. Our main contribution lies in the design of a patient representation that captures temporal dependencies among token types, enabling GPT to generate realistic patient sequences. Moreover, this representation allows for easy conversion back to the OMOP format. Comprehensive evaluations showed that the synthetic data effectively captures the intricate patterns present in EHR data.

## References

-   \[1\] Murray, R. E., Ryan, P. B. & Reisinger, S. J. Design and validation of a data simulation model for longitudinal healthcare data. In _AMIA Annual Symposium Proceedings_, vol. 2011, 1176 (American Medical Informatics Association, 2011).
-   \[2\] Ghosheh, G., Li, J. & Zhu, T. A review of generative adversarial networks for electronic health records: applications, evaluation measures and data sources (2022). URL [https://arxiv.org/abs/2203.07018v2](https://arxiv.org/abs/2203.07018v2).
-   \[3\] Choi, E. _et al._ Generating multi-label discrete patient records using generative adversarial networks. In Doshi-Velez, F. _et al._ (eds.) _Proceedings of the 2nd Machine Learning for Healthcare Conference_, vol. 68 of _Proceedings of Machine Learning Research_, 286–305 (PMLR, 2017). URL [https://proceedings.mlr.press/v68/choi17a.html](https://proceedings.mlr.press/v68/choi17a.html).
-   \[4\] Li, Y., Bengio, S. & Du, N. Time-dependent representation for neural event sequence prediction. _6th International Conference on Learning Representations, ICLR 2018 - Workshop Track Proceedings_ (2017). URL [https://arxiv.org/abs/1708.00065v4](https://arxiv.org/abs/1708.00065v4).
-   \[5\] Li, J., Cairns, B. J., Li, J. & Zhu, T. Generating synthetic mixed-type longitudinal electronic health records for artificial intelligent applications. _npj Digital Medicine 2023 6:1_ 6, 1–18 (2023). URL [https://www.nature.com/articles/s41746-023-00834-7](https://www.nature.com/articles/s41746-023-00834-7).
-   \[6\] Lee, D. _et al._ Generating sequential electronic health records using dual adversarial autoencoder. _Journal of the American Medical Informatics Association : JAMIA_ 27, 1411–1419 (2020). URL [https://pubmed.ncbi.nlm.nih.gov/32989459/](https://pubmed.ncbi.nlm.nih.gov/32989459/).
-   \[7\] Hripcsak, G. & Albers, D. J. Next-generation phenotyping of electronic health records. _Journal of the American Medical Informatics Association : JAMIA_ 20, 117–121 (2013). URL [https://pubmed.ncbi.nlm.nih.gov/22955496/](https://pubmed.ncbi.nlm.nih.gov/22955496/).
-   \[8\] Openai, A. R., Openai, K. N., Openai, T. S. & Openai, I. S. Improving language understanding by generative pre-training URL [https://gluebenchmark.com/leaderboard](https://gluebenchmark.com/leaderboard).
-   \[9\] Vaswani, A. _et al._ Attention is all you need .
-   \[10\] Goodfellow, I. _et al._ Generative adversarial networks. _Communications of the ACM_ 63, 139–144 (2014). URL [https://arxiv.org/abs/1406.2661v1](https://arxiv.org/abs/1406.2661v1).
-   \[11\] Zhang, Z., Yan, C., Lasko, T. A., Sun, J. & Malin, B. A. Synteg: a framework for temporal structured electronic health data simulation. _Journal of the American Medical Informatics Association_ 28, 596–604 (2021). URL [https://dx.doi.org/10.1093/jamia/ocaa262](https://dx.doi.org/10.1093/jamia/ocaa262).
-   \[12\] Gulrajani, I., Ahmed, F., Arjovsky, M., Dumoulin, V. & Courville, A. Improved training of wasserstein gans. _Advances in Neural Information Processing Systems_ 2017-Decem, 5768–5778 (2017). URL [https://arxiv.org/abs/1704.00028v3](https://arxiv.org/abs/1704.00028v3).
-   \[13\] Pang, C. _et al._ Cehr-bert: Incorporating temporal information from structured ehr data to improve prediction tasks. In Roy, S. _et al._ (eds.) _Proceedings of Machine Learning for Health_, vol. 158 of _Proceedings of Machine Learning Research_, 239–260 (PMLR, 2021). URL [https://proceedings.mlr.press/v158/pang21a.html](https://proceedings.mlr.press/v158/pang21a.html).
-   \[14\] Li, Y. _et al._ Behrt: Transformer for electronic health records. _Scientific Reports 2020 10:1_ 10, 1–12 (2020). URL [https://www.nature.com/articles/s41598-020-62922-y](https://www.nature.com/articles/s41598-020-62922-y).
-   \[15\] Rasmy, L., Xiang, Y., Xie, Z., Tao, C. & Zhi, D. Med-bert: pretrained contextualized embeddings on large-scale structured electronic health records for disease prediction. _npj Digital Medicine 2021 4:1_ 4, 1–13 (2021). URL [https://www.nature.com/articles/s41746-021-00455-y](https://www.nature.com/articles/s41746-021-00455-y).
-   \[16\] Kraljevic, Z. _et al._ Foresight – generative pretrained transformer (gpt) for modelling of patient timelines using ehrs (2022). URL [https://arxiv.org/abs/2212.08072v2](https://arxiv.org/abs/2212.08072v2).
-   \[17\] Yan, C. _et al._ A multifaceted benchmarking of synthetic electronic health record generation models. _Nature Communications_ 13 (2022). URL [https://doi.org/10.1038%2Fs41467-022-35295-1](https://doi.org/10.1038%2Fs41467-022-35295-1).
-   \[18\] OHDSI. _The Book of OHDSI: Observational Health Data Sciences and Informatics_ (OHDSI, 2019). URL [https://books.google.com/books?id=JxpnzQEACAAJ](https://books.google.com/books?id=JxpnzQEACAAJ).
-   \[19\] Theodorou, B., Xiao, C. & Sun, J. Synthesize high-dimensional longitudinal electronic health records via hierarchical autoregressive language model. _Nature Communications 2023 14:1_ 14, 1–13 (2023). URL [https://www.nature.com/articles/s41467-023-41093-0](https://www.nature.com/articles/s41467-023-41093-0).
-   \[20\] Murphy, S. N. _et al._ Serving the enterprise and beyond with informatics for integrating biology and the bedside (i2b2). _Journal of the American Medical Informatics Association_ 17, 124–130 (2010).

## 7 Supplementary Materials

 ![\[Uncaptioned image\]](extracted/5229717/patient_history_comparison.jpg)Figure 9: The comparison of the patient representations.

Cohort

Real

GPT-OUTPAT

CEHR-BERT

HF readmission

Pre = 25.7 AUC = 65.7 PR = 39.3

Pre =100.0 AUC = NA PR = NA

Pre =100.0 AUC = NA PR = NA

Hospitalization

Pre = 5.6 AUC = 75.3 PR = 19.5

Pre = 5.3 AUC = 70.2 PR = 14.3

Pre = 0.3 AUC = 76.0 PR = 1.0

COPD readmission

Pre = 34.5 AUC = 74.2 PR = 83.8

Pre = NA AUC = NA PR = NA

Pre = NA AUC = NA PR = NA

Afib ischemic stroke

Pre = 8.7 AUC = 84.0 PR = 48.5

Pre = 9.7 AUC = 67.2 PR = 27.2

Pre = 19.5 AUC = 72.4 PR = 60.0

CAD CABG

Pre = 7.1 AUC = 88.4 PR = 55.9

Pre = 3.5 AUC = 81.5 PR = 44.4

Pre = 5.4 AUC = 77.2 PR = 44.1

Table 7: Logistic regression (LR) model performance across baseline synthetic datasets. In each cell, three numbers were reported including the prevalence of the positive cases, ROC-AUC, and PR-AUC. If the prevalence=NA, this indicates that 00 patients were identified in the cohort. AUC=NA and PR=NA indicate the LR model could not be run successfully due to either 100% or 0% prevalence.

 ![\[Uncaptioned image\]](extracted/5229717/visit_age_breakdown.png)Figure 10: The visit prevalence stratified by age group

 ![\[Uncaptioned image\]](extracted/5229717/visit_race_breakdown.png)Figure 11: The visit prevalence stratified by race

 ![\[Uncaptioned image\]](extracted/5229717/visit_gender_breakdown.png)Figure 12: The visit prevalence stratified by gender
