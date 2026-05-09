# Named Clinical Entity Recognition Benchmark

- arXiv: [2410.05046v1](https://arxiv.org/abs/2410.05046v1)
- Published: 2024-10-07
- Source: `https://arxiv.org/html/2410.05046v1`

---
![\[Uncaptioned image\]](x1.png)

###### Abstract

This technical report introduces a Named Clinical Entity Recognition Benchmark for evaluating language models in healthcare, addressing the crucial natural language processing (NLP) task of extracting structured information from clinical narratives to support applications like automated coding, clinical trial cohort identification, and clinical decision support.

The leaderboard provides a standardized platform for assessing diverse language models, including encoder and decoder architectures, on their ability to identify and classify clinical entities across multiple medical domains. A curated collection of openly available clinical datasets is utilized, encompassing entities such as diseases, symptoms, medications, procedures, and laboratory measurements. Importantly, these entities are standardized according to the Observational Medical Outcomes Partnership (OMOP) Common Data Model, ensuring consistency and interoperability across different healthcare systems and datasets, and a comprehensive evaluation of model performance. Performance of models is primarily assessed using the F1-score, and it is complemented by various assessment modes to provide comprehensive insights into model performance. The report also includes a brief analysis of models evaluated to date, highlighting observed trends and limitations.

By establishing this benchmarking framework, the leaderboard aims to promote transparency, facilitate comparative analyses, and drive innovation in clinical entity recognition tasks, addressing the need for robust evaluation methods in healthcare NLP.

Leaderboard available at [https://huggingface.co/m42-health/clinical\_ner\_leaderboard](https://huggingface.co/spaces/m42-health/clinical_ner_leaderboard).

## 1 Introduction

Named Entity Recognition (NER) in the clinical domain is a fundamental task in medical natural language processing (NLP), playing a crucial role in extracting structured information from unstructured clinical narratives. The ability to identify and classify entities such as diseases, symptoms, medications, and procedures within clinical texts is essential for a wide range of downstream applications (Pradhan et al., [2015](https://arxiv.org/html/2410.05046v1#bib.bib23); Stubbs et al., [2015](https://arxiv.org/html/2410.05046v1#bib.bib28)). These applications include clinical decision support systems, where identified entities can trigger relevant alerts and/or recommendations; automated coding for billing and administrative purposes; and cohort identification for clinical trials, enabling rapid patient recruitment based on specific clinical criteria (Savova et al., [2010](https://arxiv.org/html/2410.05046v1#bib.bib24)).

Additionally, as the volume of electronic health records (EHRs) continues to grow, efficient and accurate extraction of clinically relevant information becomes increasingly vital for both patient care and medical research (Hossain et al., [2023](https://arxiv.org/html/2410.05046v1#bib.bib6)). Accurate NER systems can significantly improve the quality of data available for clinical research, facilitate the development of precision medicine approaches, and enhance the overall efficiency of healthcare delivery (Shivade et al., [2014](https://arxiv.org/html/2410.05046v1#bib.bib26); Hossain et al., [2023](https://arxiv.org/html/2410.05046v1#bib.bib6)).

Assessing the performance of NER tasks in the clinical domain, however, presents several challenges (Kundeti et al., [2016](https://arxiv.org/html/2410.05046v1#bib.bib11)). The inherent complexity and variability of medical terminology, coupled with the highly context-dependent nature of clinical language, make it difficult to develop universally effective NER models. Moreover, the quality of annotations in available datasets can vary significantly, affecting the reliability of performance evaluations (Kundeti et al., [2016](https://arxiv.org/html/2410.05046v1#bib.bib11); Menasalvas et al., [2016](https://arxiv.org/html/2410.05046v1#bib.bib17); Wu et al., [2020](https://arxiv.org/html/2410.05046v1#bib.bib32)). The scarcity of large, diverse, and well-annotated clinical datasets further complicates the assessment process, as models may perform inconsistently across different medical subdomains or institution-specific terminologies (Névéol et al., [2018](https://arxiv.org/html/2410.05046v1#bib.bib19); Wu et al., [2020](https://arxiv.org/html/2410.05046v1#bib.bib32); Niero et al., [2023](https://arxiv.org/html/2410.05046v1#bib.bib18)).

Recent advancements in language models, particularly Large Language Models (LLMs), have shown promising results in various NLP tasks, including clinical NER (Sun et al., [2021](https://arxiv.org/html/2410.05046v1#bib.bib29); Chen et al., [2023](https://arxiv.org/html/2410.05046v1#bib.bib1); Zhang et al., [2024](https://arxiv.org/html/2410.05046v1#bib.bib34)). However, the lack of a standardized evaluation framework makes it challenging to compare the performance of these models objectively and consistently across different studies and datasets (Peng et al., [2019](https://arxiv.org/html/2410.05046v1#bib.bib22); Wu et al., [2020](https://arxiv.org/html/2410.05046v1#bib.bib32); Gu et al., [2022](https://arxiv.org/html/2410.05046v1#bib.bib5)).

To address these challenges, we present a comprehensive Named Clinical Entity Recognition (Clinical NER) Leaderboard. This leaderboard provides a standardized platform for evaluating and benchmarking the performance of various language models on clinical NER tasks. By utilizing a curated collection of openly available clinical datasets and implementing consistent evaluation metrics, our leaderboard aims to foster transparency, facilitate comparative analysis, and drive innovation in the field of clinical NER.

The key contributions of this work are summarized as follows:

-   •
    
    Standardized evaluation framework: We introduce a comprehensive Clinical NER Leaderboard, which provides a consistent and transparent platform for evaluating and benchmarking the performance of various language models (encoder, decoder & gliner) on clinical NER tasks.
    
-   •
    
    Curated dataset collection with common standards: The leaderboard makes use of a curated collection of openly-available clinical datasets, where entity standardization was performed using the OMOP Common Data Model standard, which ensuring that the evaluation is robust, consistent, and reflective of the diverse and context-dependent nature of clinical language.
    
-   •
    
    Consistent evaluation metrics: We implement standardized evaluation metrics, allowing for objective and comparable assessments of NER models across different studies and datasets.
    
-   •
    
    Comparative analysis: By providing a centralized and transparent platform, our leaderboard enables researchers to conduct comparative analyses, promoting innovation and driving progress in clinical NER research.
    

These contributions, ultimately, aim to advance the field of clinical NER by addressing existing challenges and promoting the development of more accurate, reliable, and universally applicable models in healthcare applications.

## 2 Related work

Unlike general domains, where benchmarks like GLUE (Wang et al., [2018](https://arxiv.org/html/2410.05046v1#bib.bib30)) and SuperGLUE (Wang et al., [2019](https://arxiv.org/html/2410.05046v1#bib.bib31)) are well-established, the biomedical field lacks equivalent resources (Kanithi et al., [2024](https://arxiv.org/html/2410.05046v1#bib.bib9)). Over the years, the field of biomedical NLP has seen the development and release of numerous datasets, often stemming from shared tasks such as BioCreative (Li et al., [2016b](https://arxiv.org/html/2410.05046v1#bib.bib15)), BioNLP (Demner-Fushman et al., [2024](https://arxiv.org/html/2410.05046v1#bib.bib2)), and SemEval (Ojha et al., [2024](https://arxiv.org/html/2410.05046v1#bib.bib21)). While the focus of these datasets has evolved from simple tasks like NER to other tasks such as relation extraction and question answering, there remains a significant gap in the availability of benchmarks and leaderboards for medical and clinical NLP.

Researchers have extensively explored the use of shared language representations to capture the semantics of biomedical text, often applying these models across a range of tasks in the field (Peng et al., [2019](https://arxiv.org/html/2410.05046v1#bib.bib22)). A common approach involves transfer learning, where models are pretrained on extensive biomedical corpora and then fine-tuned for specific tasks like NER and relation extraction. BioBERT (Lee et al., [2019](https://arxiv.org/html/2410.05046v1#bib.bib13)) and BioELMo (Jin et al., [2019](https://arxiv.org/html/2410.05046v1#bib.bib8)) are notable examples of these approaches. These efforts have typically involved individual models evaluated in isolation, without the benefit of standardized benchmarks or leaderboards to facilitate broader comparison and validation across different approaches in medical and clinical NLP.

BLURB (Biomedical Language Understanding and Reasoning Benchmark) is one of the few benchmarks in the biomedical field, which spans multiple tasks beyond NER (Gu et al., [2022](https://arxiv.org/html/2410.05046v1#bib.bib5)). Peng et al. ([2019](https://arxiv.org/html/2410.05046v1#bib.bib22)) also introduced the Biomedical Language Understanding Evaluation (BLUE) benchmark consisting of six tasks that cover both biomedical and clinical texts with different datasets. While these benchmarks provide a broad coverage of tasks, the methods and metrics used for NER tasks are not clearly detailed, and the number of domains and entities covered in the datasets is limited. Additionally, more recent approaches, such as generative models, are not included in the benchmark, indicating a gap in its ability to fully assess the latest advancements in the field (Chen et al., [2023](https://arxiv.org/html/2410.05046v1#bib.bib1)).

While comprehensive evaluation frameworks like MEDIC (Kanithi et al., [2024](https://arxiv.org/html/2410.05046v1#bib.bib9)) assess a broad range of clinical NLP tasks, in this paper we focus exclusively on NER tasks, allowing for a more detailed examination of how models are assessed and performance metrics computed. By narrowing our scope to NER, we can delve deeper into the intricacies of model evaluation, ensuring that the metrics used provide a comprehensive understanding of a model’s capability to accurately identify and classify entities within the medical and clinical domains. This focused approach also enables us to explore the latest trends in utilizing large language models for diverse NER tasks, providing a platform to compare the performance of different model architectures. Finally, this work also emphasizes the importance of standardizing entities across models and datasets according to widely accepted standards, a critical aspect that has been insufficiently addressed in previous works. Overall, we aim to highlight the strengths and limitations of various models, offering insights into how these models perform in specialized tasks that are crucial for advancing biomedical NLP.

## 3 The Clinical NER Benchmark

To address the challenges in evaluating clinical NER models, we have developed a benchmark that provides a standardized platform for assessing performance. This benchmark consists of the following key components: it contains a common evaluation methodology that employs well-established evaluation metrics, primarily focusing on the F1-score; it employs terminology standardization of the clinical entities included in our evaluation, which ensures consistency and interoperability; and it includes a curated collection of openly available medical benchmark datasets, encompassing a broad spectrum of medical entities. In the subsections below, we first elucidate the problem and then elaborate on the components in the following subsections.

### 3.1 Named-Entity Recognition Task

NER is a crucial task in biomedical NLP that aims to identify and classify medical entities in unstructured clinical text. Mathematically, we can formulate the NER task as follows. Given an input sequence of tokens X\=(x1,x2,…,xn)𝑋subscript𝑥1subscript𝑥2…subscript𝑥𝑛X=(x\_{1},x\_{2},\\ldots,x\_{n})italic\_X = ( italic\_x start\_POSTSUBSCRIPT 1 end\_POSTSUBSCRIPT , italic\_x start\_POSTSUBSCRIPT 2 end\_POSTSUBSCRIPT , … , italic\_x start\_POSTSUBSCRIPT italic\_n end\_POSTSUBSCRIPT ), where each xisubscript𝑥𝑖x\_{i}italic\_x start\_POSTSUBSCRIPT italic\_i end\_POSTSUBSCRIPT represents a token (a word or sub-word) in clinical text, the goal is to assign a corresponding sequence of labels Y\=(y1,y2,…,yn)𝑌subscript𝑦1subscript𝑦2…subscript𝑦𝑛Y=(y\_{1},y\_{2},\\ldots,y\_{n})italic\_Y = ( italic\_y start\_POSTSUBSCRIPT 1 end\_POSTSUBSCRIPT , italic\_y start\_POSTSUBSCRIPT 2 end\_POSTSUBSCRIPT , … , italic\_y start\_POSTSUBSCRIPT italic\_n end\_POSTSUBSCRIPT ), where each yisubscript𝑦𝑖y\_{i}italic\_y start\_POSTSUBSCRIPT italic\_i end\_POSTSUBSCRIPT belongs to a predefined set of clinical entity types E∪{O}𝐸𝑂E\\cup\\{O\\}italic\_E ∪ { italic\_O }, with O𝑂Oitalic\_O representing the “Outside” label for tokens that are not part of any medical entity.

Formally, we can express this as a function f:X→Y:𝑓→𝑋𝑌f:X\\rightarrow Yitalic\_f : italic\_X → italic\_Y, where X𝑋Xitalic\_X is the space of all possible input sequences of text, and Y𝑌Yitalic\_Y is the space of all possible clinical label sequences.

The set of clinical entity types E𝐸Eitalic\_E typically includes categories such as E\={DIS,PROC,DRUG,…}𝐸DISPROCDRUG…E=\\{\\text{DIS},\\text{PROC},\\text{DRUG},\\ldots\\}italic\_E = { DIS , PROC , DRUG , … }, where, for example:

-   •
    
    _DIS_ corresponds to medical conditions or disorders,
    
-   •
    
    _PROC_ includes medical procedures or interventions,
    
-   •
    
    _DRUG_ relates to medications.
    

The NER task can be viewed as a sequence labeling problem, where we aim to maximize the conditional probability P⁢(Y|X)𝑃conditional𝑌𝑋P(Y|X)italic\_P ( italic\_Y | italic\_X ), i.e., arg⁢maxY⁡P⁢(Y|X)subscriptargmax𝑌𝑃conditional𝑌𝑋\\operatorname\*{arg\\,max}\_{Y}P(Y|X)start\_OPERATOR roman\_arg roman\_max end\_OPERATOR start\_POSTSUBSCRIPT italic\_Y end\_POSTSUBSCRIPT italic\_P ( italic\_Y | italic\_X ).

This probability can be modeled using various approaches, such as Conditional Random Fields (CRFs), or neural network architectures like Bidirectional Long Short-Term Memory (BiLSTM) networks or Transformer-based models fine-tuned on clinical corpora (Wu et al., [2020](https://arxiv.org/html/2410.05046v1#bib.bib32)).

To illustrate the clinical NER task, consider the following example:

{mdframed}

\[backgroundcolor=black!4,rightline=true,leftline=true\] Patient presents with acute myocardial infarction  \[DIS\] and is prescribed aspirin  \[DRUG\] until angioplasty  \[PROC\] is performed.

The input sequence X𝑋Xitalic\_X is:

`Patient presents with acute myocardial infarction and is` `prescribed aspirin until angioplasty is performed`

The corresponding label sequence Y𝑌Yitalic\_Y (assuming each word is a token):

`O O O B-DIS I-DIS I-DIS O O` `O B-DRUG O B-PROC O O`

Where _B-\*_ indicates the beginning of an entity, _I-\*_ indicates the continuation (inside) of an entity, and _O_ indicates tokens outside of clinical entities of interest.

This example demonstrates how the clinical NER task assigns labels to each token in the input sequence, identifying “acute myocardial infarction” as a disease, “aspirin” as a drug, and “angioplasty” as a procedure.

### 3.2 Evaluation metrics

The performance of clinical NER models, which aim to optimize P⁢(Y|X)𝑃conditional𝑌𝑋P(Y|X)italic\_P ( italic\_Y | italic\_X ) as shown in equation (3), is evaluated using two types of metrics: token-based and span-based. Both types utilize precision, recall, and F1-score, but they differ in how they define true positives (TP), false positives (FP), and false negatives (FN).

#### 3.2.1 Token-based Metrics

Token-based metrics evaluate the model’s performance at the individual token level. For each token xisubscript𝑥𝑖x\_{i}italic\_x start\_POSTSUBSCRIPT italic\_i end\_POSTSUBSCRIPT in the input sequence X𝑋Xitalic\_X, we compare the predicted label y^isubscript^𝑦𝑖\\hat{y}\_{i}over^ start\_ARG italic\_y end\_ARG start\_POSTSUBSCRIPT italic\_i end\_POSTSUBSCRIPT with the true label yisubscript𝑦𝑖y\_{i}italic\_y start\_POSTSUBSCRIPT italic\_i end\_POSTSUBSCRIPT. Let T⁢Pt𝑇subscript𝑃𝑡TP\_{t}italic\_T italic\_P start\_POSTSUBSCRIPT italic\_t end\_POSTSUBSCRIPT, F⁢Pt𝐹subscript𝑃𝑡FP\_{t}italic\_F italic\_P start\_POSTSUBSCRIPT italic\_t end\_POSTSUBSCRIPT, and F⁢Nt𝐹subscript𝑁𝑡FN\_{t}italic\_F italic\_N start\_POSTSUBSCRIPT italic\_t end\_POSTSUBSCRIPT represent token-level true positives, false positives, and false negatives, respectively. Then:

{fleqn}

PrecisiontsubscriptPrecision𝑡\\displaystyle\\text{Precision}\_{t}Precision start\_POSTSUBSCRIPT italic\_t end\_POSTSUBSCRIPT

\=T⁢PtT⁢Pt+F⁢Ptabsent𝑇subscript𝑃𝑡𝑇subscript𝑃𝑡𝐹subscript𝑃𝑡\\displaystyle=\\frac{TP\_{t}}{TP\_{t}+FP\_{t}}\= divide start\_ARG italic\_T italic\_P start\_POSTSUBSCRIPT italic\_t end\_POSTSUBSCRIPT end\_ARG start\_ARG italic\_T italic\_P start\_POSTSUBSCRIPT italic\_t end\_POSTSUBSCRIPT + italic\_F italic\_P start\_POSTSUBSCRIPT italic\_t end\_POSTSUBSCRIPT end\_ARG

(1)

RecalltsubscriptRecall𝑡\\displaystyle\\text{Recall}\_{t}Recall start\_POSTSUBSCRIPT italic\_t end\_POSTSUBSCRIPT

\=T⁢PtT⁢Pt+F⁢Ntabsent𝑇subscript𝑃𝑡𝑇subscript𝑃𝑡𝐹subscript𝑁𝑡\\displaystyle=\\frac{TP\_{t}}{TP\_{t}+FN\_{t}}\= divide start\_ARG italic\_T italic\_P start\_POSTSUBSCRIPT italic\_t end\_POSTSUBSCRIPT end\_ARG start\_ARG italic\_T italic\_P start\_POSTSUBSCRIPT italic\_t end\_POSTSUBSCRIPT + italic\_F italic\_N start\_POSTSUBSCRIPT italic\_t end\_POSTSUBSCRIPT end\_ARG

(2)

F1-scoretsubscriptF1-score𝑡\\displaystyle\\text{F1-score}\_{t}F1-score start\_POSTSUBSCRIPT italic\_t end\_POSTSUBSCRIPT

\=2⋅Precisiont⋅RecalltPrecisiont+Recalltabsent⋅2⋅subscriptPrecision𝑡subscriptRecall𝑡subscriptPrecision𝑡subscriptRecall𝑡\\displaystyle=2\\cdot\\frac{\\text{Precision}\_{t}\\cdot\\text{Recall}\_{t}}{\\text{% Precision}\_{t}+\\text{Recall}\_{t}}\= 2 ⋅ divide start\_ARG Precision start\_POSTSUBSCRIPT italic\_t end\_POSTSUBSCRIPT ⋅ Recall start\_POSTSUBSCRIPT italic\_t end\_POSTSUBSCRIPT end\_ARG start\_ARG Precision start\_POSTSUBSCRIPT italic\_t end\_POSTSUBSCRIPT + Recall start\_POSTSUBSCRIPT italic\_t end\_POSTSUBSCRIPT end\_ARG

(3)

The above metrics can be calculated either globally or on a per entity type basis, thus giving us two possible metrics:

-   •
    
    Micro Average: The T⁢Pt𝑇subscript𝑃𝑡TP\_{t}italic\_T italic\_P start\_POSTSUBSCRIPT italic\_t end\_POSTSUBSCRIPT, F⁢Pt𝐹subscript𝑃𝑡FP\_{t}italic\_F italic\_P start\_POSTSUBSCRIPT italic\_t end\_POSTSUBSCRIPT, and F⁢Nt𝐹subscript𝑁𝑡FN\_{t}italic\_F italic\_N start\_POSTSUBSCRIPT italic\_t end\_POSTSUBSCRIPT values are calculated globally to get the final precision, recall and F1 values.
    
-   •
    
    Macro Average: The precision, recall and F1 are calculated for each entity type and then averaged without any weightage.
    

With this token-based approach, we have a broad idea of the performance of the model at the token level. However, it may misrepresent the performance at the entity level when the entity includes more than 1 token (which may be more relevant for certain applications). In addition, depending on the annotations of certain datasets, we may not want to penalize a model for a "partial" match with a certain entity.

#### 3.2.2 Span-based Metrics

Span-based metrics evaluate the model’s performance at the entity level, considering full or partial matches. These metrics are particularly important in clinical NER, as they reflect the model’s ability to identify complete medical entities. Let T⁢Ps𝑇subscript𝑃𝑠TP\_{s}italic\_T italic\_P start\_POSTSUBSCRIPT italic\_s end\_POSTSUBSCRIPT, F⁢Ps𝐹subscript𝑃𝑠FP\_{s}italic\_F italic\_P start\_POSTSUBSCRIPT italic\_s end\_POSTSUBSCRIPT, and F⁢Ns𝐹subscript𝑁𝑠FN\_{s}italic\_F italic\_N start\_POSTSUBSCRIPT italic\_s end\_POSTSUBSCRIPT represent span-level true positives, false positives, and false negatives, respectively. We define:

-   •
    
    Exact Match: The predicted entity spans exactly match the true entity span’s boundary and label.
    
-   •
    
    Partial Match: The predicted entity spans overlap with the true entity span’s boundary and exactly matches the label.
    

Based on the criteria above, each predicted or true span can be classified as C⁢o⁢r⁢r⁢e⁢c⁢t𝐶𝑜𝑟𝑟𝑒𝑐𝑡Correctitalic\_C italic\_o italic\_r italic\_r italic\_e italic\_c italic\_t, I⁢n⁢c⁢o⁢r⁢r⁢e⁢c⁢t𝐼𝑛𝑐𝑜𝑟𝑟𝑒𝑐𝑡Incorrectitalic\_I italic\_n italic\_c italic\_o italic\_r italic\_r italic\_e italic\_c italic\_t, M⁢i⁢s⁢s⁢e⁢d𝑀𝑖𝑠𝑠𝑒𝑑Misseditalic\_M italic\_i italic\_s italic\_s italic\_e italic\_d, S⁢p⁢u⁢r⁢i⁢o⁢u⁢s𝑆𝑝𝑢𝑟𝑖𝑜𝑢𝑠Spuriousitalic\_S italic\_p italic\_u italic\_r italic\_i italic\_o italic\_u italic\_s (see Table [1](https://arxiv.org/html/2410.05046v1#S3.T1 "Table 1 ‣ 3.2.2 Span-based Metrics ‣ 3.2 Evaluation metrics ‣ 3 The Clinical NER Benchmark")).

Table 1: Exact and partial span metric calculations. Each predicted span can be attributed to each class depending on exact or partial matches.

Span Class

Exact

Partial

Correct

The predicted and true span’s boundary and label match exactly

The predicted and true span’s label matches exactly and the boundary has some overlap

Incorrect

There is a mismatch in either the boundary or label between the predicted and true span

There is an overlap in the boundary of predicted and true span but a mismatch in the label

Missed

For a given True span, there is no predicted span that has overlap with it

For a given True span, there is no predicted span that has overlap with it

Spurious

For a given predicted span, there is no true span that has an exact overlap with it

For a given predicted span, there is no true span that has any overlap with it

Using the above classifications, we have

{fleqn}

⁢F⁢Ps𝐹subscript𝑃𝑠\\displaystyle\\text{}FP\_{s}italic\_F italic\_P start\_POSTSUBSCRIPT italic\_s end\_POSTSUBSCRIPT

\=I⁢n⁢c⁢o⁢r⁢r⁢e⁢c⁢t+S⁢p⁢u⁢r⁢i⁢o⁢u⁢sabsent𝐼𝑛𝑐𝑜𝑟𝑟𝑒𝑐𝑡𝑆𝑝𝑢𝑟𝑖𝑜𝑢𝑠\\displaystyle={Incorrect+Spurious}\= italic\_I italic\_n italic\_c italic\_o italic\_r italic\_r italic\_e italic\_c italic\_t + italic\_S italic\_p italic\_u italic\_r italic\_i italic\_o italic\_u italic\_s

(4)

⁢F⁢Ns𝐹subscript𝑁𝑠\\displaystyle\\text{}FN\_{s}italic\_F italic\_N start\_POSTSUBSCRIPT italic\_s end\_POSTSUBSCRIPT

\=I⁢n⁢c⁢o⁢r⁢r⁢e⁢c⁢t+M⁢i⁢s⁢s⁢e⁢dabsent𝐼𝑛𝑐𝑜𝑟𝑟𝑒𝑐𝑡𝑀𝑖𝑠𝑠𝑒𝑑\\displaystyle={Incorrect+Missed}\= italic\_I italic\_n italic\_c italic\_o italic\_r italic\_r italic\_e italic\_c italic\_t + italic\_M italic\_i italic\_s italic\_s italic\_e italic\_d

(5)

Then, we calculate:

{fleqn}

PrecisionssubscriptPrecision𝑠\\displaystyle\\text{Precision}\_{s}Precision start\_POSTSUBSCRIPT italic\_s end\_POSTSUBSCRIPT

\=T⁢PsT⁢Ps+F⁢Psabsent𝑇subscript𝑃𝑠𝑇subscript𝑃𝑠𝐹subscript𝑃𝑠\\displaystyle=\\frac{TP\_{s}}{TP\_{s}+FP\_{s}}\= divide start\_ARG italic\_T italic\_P start\_POSTSUBSCRIPT italic\_s end\_POSTSUBSCRIPT end\_ARG start\_ARG italic\_T italic\_P start\_POSTSUBSCRIPT italic\_s end\_POSTSUBSCRIPT + italic\_F italic\_P start\_POSTSUBSCRIPT italic\_s end\_POSTSUBSCRIPT end\_ARG

(6)

RecallssubscriptRecall𝑠\\displaystyle\\text{Recall}\_{s}Recall start\_POSTSUBSCRIPT italic\_s end\_POSTSUBSCRIPT

\=T⁢PsT⁢Ps+F⁢Nsabsent𝑇subscript𝑃𝑠𝑇subscript𝑃𝑠𝐹subscript𝑁𝑠\\displaystyle=\\frac{TP\_{s}}{TP\_{s}+FN\_{s}}\= divide start\_ARG italic\_T italic\_P start\_POSTSUBSCRIPT italic\_s end\_POSTSUBSCRIPT end\_ARG start\_ARG italic\_T italic\_P start\_POSTSUBSCRIPT italic\_s end\_POSTSUBSCRIPT + italic\_F italic\_N start\_POSTSUBSCRIPT italic\_s end\_POSTSUBSCRIPT end\_ARG

(7)

F1-scoressubscriptF1-score𝑠\\displaystyle\\text{F1-score}\_{s}F1-score start\_POSTSUBSCRIPT italic\_s end\_POSTSUBSCRIPT

\=2⋅Precisions⋅RecallsPrecisions+Recallsabsent⋅2⋅subscriptPrecision𝑠subscriptRecall𝑠subscriptPrecision𝑠subscriptRecall𝑠\\displaystyle=2\\cdot\\frac{\\text{Precision}\_{s}\\cdot\\text{Recall}\_{s}}{\\text{% Precision}\_{s}+\\text{Recall}\_{s}}\= 2 ⋅ divide start\_ARG Precision start\_POSTSUBSCRIPT italic\_s end\_POSTSUBSCRIPT ⋅ Recall start\_POSTSUBSCRIPT italic\_s end\_POSTSUBSCRIPT end\_ARG start\_ARG Precision start\_POSTSUBSCRIPT italic\_s end\_POSTSUBSCRIPT + Recall start\_POSTSUBSCRIPT italic\_s end\_POSTSUBSCRIPT end\_ARG

(8)

Strict span based evaluation may be more applicable in applications like de-identifying PII, where as partial span based evaluation is desirable when we have leading/following words that do not change the entity’s meaning.

#### 3.2.3 Working Example

Consider the following example, with the following entities (i.e., true labels):

{mdframed}

\[backgroundcolor=black!4,rightline=true,leftline=true\] The patient’s chest X-ray  \[PROC\] showed pneumonia  \[DIS\], and blood cultures  \[LAB\] were ordered to rule out sepsis  \[DIS\]. Patient has no diabetes  \[DIS\]. Levofloxacin  \[DRUG\] was prescribed for treatment."

Assume the predicted labels are as follows:

{mdframed}

\[backgroundcolor=black!4,rightline=true,leftline=true\] The patient’s chest X-ray  \[PROC\] showed pneumonia  \[DIS\], and blood cultures  \[LAB\] were ordered to rule out sepsis. Patient has no diabetes  \[DIS\]. Levofloxacin  \[DRUG\] was prescribed for treatment  \[PROC\]."

Token-based evaluation (Micro Average):

-   •
    
    TPt = 6 (X-ray, pneumonia, blood, cultures, diabetes, Levofloxacin)
    
-   •
    
    FPt = 1 (treatment)
    
-   •
    
    FNt = 2 (chest, sepsis)
    
-   •
    
    F1-scoret = 0.80
    

Token-based evaluation (Macro Average):

-   •
    
    TPt = PROC: 1, DIS: 2, DRUG: 1, LAB: 2
    
-   •
    
    FPt = PROC: 1, DIS: 0, DRUG: 0, LAB: 0
    
-   •
    
    FNt = PROC: 1, DIS: 1, DRUG: 0, LAB: 0
    
-   •
    
    Precisiont = PROC: 0.5, DIS: 1, DRUG: 1, LAB: 1
    
-   •
    
    Recallt = PROC: 0.5, DIS: 0.66, DRUG: 1, LAB: 1
    
-   •
    
    F1t = PROC: 0.5, DIS: 0.8, DRUG: 1, LAB: 1
    
-   •
    
    Final F1-scoret = 0.82
    

Span-based evaluation (Exact Match):

-   •
    
    TPs = 4 (pneumonia, blood cultures, diabetes, Levofloxacin)
    
-   •
    
    FPs = 2 (chest X-ray, treatment)
    
-   •
    
    FNs = 2 (chest X-ray, sepsis)
    
-   •
    
    F1-scores = 0.66
    

Span-based evaluation (Partial Match):

-   •
    
    TPs = 5 (chest X-ray, pneumonia, blood cultures, diabetes, Levofloxacin)
    
-   •
    
    FPs = 1 (treatment)
    
-   •
    
    FNs = 1 (sepsis)
    
-   •
    
    F1-scores = 0.83
    

This example demonstrates how token-based and span-based metrics can provide different perspectives on model performance. Span-based metrics, in particular, reveal issues with entity boundary detection, particularly for the procedure entity. The partial match evaluation shows better performance than the exact match, indicating that the model is generally identifying the correct entities but sometimes struggles with precise boundaries.

For our evaluation framework we consider the _Macro Average_ token-based metrics and the _Partial Match_ for our span-based metrics.

The variety of entity types demonstrated in this example (_procedure_, _disease_, _lab test_, _drug_) highlights the complexity of clinical NER tasks. To ensure consistency across different NER systems and to facilitate interoperability in clinical applications, it is crucial to establish a standardized terminology for entity types. This standardization not only aids in the accurate evaluation of NER models but also enhances the utility of extracted information in downstream tasks such as clinical decision support systems. The following section delves into the importance and implementation of common terminologies in clinical NER.

### 3.3 Common terminology

Standardization of medical terminology is a critical requirement for the effective development and deployment of clinical NLP systems. In the medical field, the proliferation of institution-specific vocabularies, coding systems, and ontologies has long posed a significant challenge for data integration, interoperability, and the generalization of NLP models across different healthcare settings (Iroju et al., [2015](https://arxiv.org/html/2410.05046v1#bib.bib7)).

To address this issue, the Observational Medical Outcomes Partnership (OMOP) Common Data Model (CDM) has emerged as a widely adopted standard for harmonizing clinical data (Observational Health Data Sciences & Informatics, [2021](https://arxiv.org/html/2410.05046v1#bib.bib20)). The OMOP CDM provides a standardized framework for organizing and representing a wide range of medical concepts, including diagnoses, procedures, medications, laboratory tests, and demographic information. By mapping diverse source terminologies to the common OMOP concepts and vocabularies, the model enables seamless integration and analysis of data from multiple institutions and data sources.

The importance of terminology standardization is particularly evident in the context of clinical NER, where the accurate identification and classification of medical entities are crucial for downstream applications such as clinical decision support, automated coding, and cohort identification. Inconsistent or ambiguous representations of these entities can lead to significant errors and performance degradation in NER models (Kundeti et al., [2016](https://arxiv.org/html/2410.05046v1#bib.bib11); Klug et al., [2024](https://arxiv.org/html/2410.05046v1#bib.bib10)).

In the development of our Clinical NER Benchmark, we have leveraged the OMOP Common Data Model to standardize the medical entities included in the evaluation datasets. By aligning the entities to the OMOP standard vocabularies, we ensure that the benchmark provides a consistent and interoperable representation of clinical concepts, facilitating fair comparisons of NER model performance across diverse datasets and healthcare settings. Furthermore, we propose two additional domains - genes and gene variants - to cover genomic data, aligning with the OMOP CDM extension for storing genetic information, thus enhancing the benchmark’s applicability to precision medicine and genomics research (Shin et al., [2019](https://arxiv.org/html/2410.05046v1#bib.bib25)). Table [2](https://arxiv.org/html/2410.05046v1#S3.T2 "Table 2 ‣ 3.3 Common terminology ‣ 3 The Clinical NER Benchmark") provides an overview of these domains, including brief descriptions and examples for each entity type.

Table 2: Standard clinical entities. Brief description of the OMOP domains used in the Clinical NER Benchmark.

Entity Type

Description

Examples

Conditions

Medical diagnoses, symptoms, or clinical findings

Pneumonia, Hypertension, Chest pain

Procedures

Medical, surgical, or diagnostic interventions

Appendectomy, MRI scan, Blood transfusion

Drugs

Medications, therapeutic agents, or substances used for treatment

Aspirin, Insulin, Amoxicillin

Measurements

Laboratory tests, vital signs, or other quantifiable clinical observations

Blood glucose level, Body temperature, Serum creatinine

Genes

Specific genes or genetic loci relevant to clinical contexts

BRCA1, TP53, EGFR

Gene Variants

Specific alterations or mutations in genes

BRAF V600E, EGFR T790M, KRAS G12D

By incorporating these OMOP domains, our Clinical NER Benchmark provides a comprehensive framework for evaluating NER models across a diverse range of clinical entities. This approach not only ensures broad coverage of medically relevant concepts but also facilitates the benchmark’s applicability to various clinical specialties and research areas, including oncology, pharmacogenomics, and rare genetic disorders. Importantly, the use of the OMOP CDM as our standardization framework ensures the scalability and future-proofing of our benchmark. Additional entity types or domains can be seamlessly integrated into the benchmark in the future, following a careful mapping process to align with OMOP standards. This extensibility allows our benchmark to evolve alongside advancements in medical knowledge and changing clinical information needs, maintaining its relevance and comprehensiveness over time.

### 3.4 Datasets

Four publicly-available datasets have been included in our benchmark. They are summarized in Table [3](https://arxiv.org/html/2410.05046v1#S3.T3 "Table 3 ‣ BIORED ‣ 3.4 Datasets ‣ 3 The Clinical NER Benchmark").

##### NCBI

The NCBI Disease corpus includes mention and concept level annotations on 100 PubMed abstracts (Dogan et al., [2014](https://arxiv.org/html/2410.05046v1#bib.bib3)). It covers annotations of diseases.

##### CHIA

This is large, annotated corpus of patient eligibility criteria extracted from 194 registered clinical trials (Kury et al., [2020](https://arxiv.org/html/2410.05046v1#bib.bib12)). Annotations cover 15 entity types (according to OMOP domains), including conditions, drugs, procedures, and measurements.

##### BC5CDR

The BC5CDR corpus contains PubMed articles with human annotations of all chemicals and diseases (Li et al., [2016a](https://arxiv.org/html/2410.05046v1#bib.bib14)).

##### BIORED

The BIORED corpus includes a set of PubMed abstracts with annotations of multiple entity types, including genes/proteins, diseases, and chemicals (Luo et al., [2022](https://arxiv.org/html/2410.05046v1#bib.bib16)).

Table 3: Summary of publicly available datasets. The standard entities that are included in each dataset is also shown here. For detailed entity type mapping refer [5](https://arxiv.org/html/2410.05046v1#A1.T5 "Table 5 ‣ A.2 Common Terminology Label Mapping ‣ Appendix A Appendix")

Dataset

\# samples

\# annotations

Entity types

Corpus

NCBI

100

960

Condition

PubMed

CHIA

194

3,981

Condition, Procedure, Measurement, Drug

Clinical Trials

BC5CDR

500

9,928

Condition, Drug

PubMed

BIORED

100

3,535

Condition, Drug, Gene, Gene variant

PubMed

The above datasets were adapted to align with our evaluation framework by mapping the annotations to clinically relevant entity types, as defined by the OMOP CDM. Entity types not included in the framework were omitted due to the limited availability of datasets with sufficient annotations for those entities. To ensure consistency, the retained clinical entity types were standardized across all datasets, resulting in a final set of six clinical entity types, as detailed in Table [2](https://arxiv.org/html/2410.05046v1#S3.T2 "Table 2 ‣ 3.3 Common terminology ‣ 3 The Clinical NER Benchmark").

## 4 Results and Analysis

We performed an analysis of the performance of various models evaluated on the proposed benchmarks and included on our leaderboard, showcasing the outcomes of the models assessed to date, with additional models planned to be incorporated in future iterations.

### 4.1 Model Diversity

The analysis encompassed a diverse range of model architectures, including encoder-only, decoder-only, and the recently proposed GLiNER models (Zaratiana et al., [2023](https://arxiv.org/html/2410.05046v1#bib.bib33)). These models varied in size, pre-training data, and whether they underwent fine-tuning for the NER task. Table [4](https://arxiv.org/html/2410.05046v1#S4.T4 "Table 4 ‣ 4.1 Model Diversity ‣ 4 Results and Analysis") provides a summary of the models evaluated in this study, highlighting their architectural differences and key characteristics.

Table 4: Current Models on the Leaderboard. Models varying in architecture, training data scope and sizes are currently included on the leaderboard.

Model

Architecture

Type

#Params (M)

Universal-NER/UniNER-7B-type-sup

Decoder

fine-tuned

7000

Universal-NER/UniNER-7B-all

Decoder

fine-tuned

7000

knowledgator/gliner-multitask-large-v0.5

GLiNER Encoder

zero-shot

304

gliner-community/gliner\_large-v2.5

GLiNER Encoder

zero-shot

304

urchade/gliner\_large\_bio-v0.1

GLiNER Encoder

zero-shot

304

Universal-NER/UniNER-7B-type

Decoder

zero-shot

7000

openai/gpt-4o-2024-05-13

Decoder

zero-shot

\-

EmergentMethods/gliner\_large\_news-v2.1

GLiNER Encoder

zero-shot

304

urchade/gliner\_large-v2.1

GLiNER Encoder

zero-shot

304

openai/gpt-4o-mini-2024-07-18

Decoder

zero-shot

\-

numind/NuNER\_Zero

GLiNER Encoder

zero-shot

304

numind/NuNER\_Zero-span

GLiNER Encoder

zero-shot

304

meta-llama/Meta-Llama-3.1-8B-Instruct

Decoder

zero-shot

8030

meta-llama/Meta-Llama-3-8B-Instruct

Decoder

zero-shot

8030

meta-llama/Meta-Llama-3-70B-Instruct

Decoder

zero-shot

70000

alvaroalon2/biobert\_diseases\_ner

Encoder

fine-tuned

110

bioformers/bioformer-8L-ncbi-disease

Encoder

fine-tuned

43

mistralai/Mixtral-8x7B-Instruct-v0.1

Decoder

zero-shot

45000

The different model architectures included in the leaderboard are:

-   •
    
    Encoder: The standard token classification model built on top of transformer encoder architecture.
    
-   •
    
    Decoder: Autoregressive token generation models based on the transformer decoder architecture.
    
-   •
    
    GLiNER Encoder: An enhancement on the transformer encoder architecture that uses similarity between span and entity embeddings.
    

The models also vary in the scope of training data used. The models that have been exposed to any of the training data on the benchmark have been categorised as Type: ’fine-tuned’ and the models with no exposure to the training data from the benchmark have been categorised as Type:’zero-shot’111Note: Some of the zero-shot models may have exposure to the benchmark’s clinical entities by being trained on open source or synthetically generated datasets that have similar entities. .

The inclusion of this diverse set of models allows for a comprehensive evaluation of different approaches to clinical NER, spanning from general-purpose language models (e.g., LLMs) to those specifically designed for token classification tasks.

### 4.2 Entity-specific Performance

Figure [1](https://arxiv.org/html/2410.05046v1#S4.F1 "Figure 1 ‣ 4.2 Entity-specific Performance ‣ 4 Results and Analysis") shows the overall performance of all models for each entity type using both span-based and token-based metrics.

A notable observation from this analysis is the higher performance (F1-score) for condition and drug entities compared to other entity types, which is observed for both span-based and token-based approaches. This trend may be attributed to the prevalence and consistency of these entity types in clinical texts, as well as their potentially more standardized representation in medical terminology. This is also reflected in figure [6](https://arxiv.org/html/2410.05046v1#A1.F6 "Figure 6 ‣ A.2 Common Terminology Label Mapping ‣ Appendix A Appendix") that shows the span counts for each entity type present on the leaderboard.

![Refer to caption](x2.png)

(a) Token-based

![Refer to caption](x3.png)

(b) Span-based

Figure 1: Overall performance of models across six clinical entities. Box plots represent F1-scores of various models across the clinical entity types for each metric approach: token-based (left), and span-based. Each dots represent the performance of a model.

Interestingly, when examining the performance for a single entity type (condition) across different datasets (Figure [8](https://arxiv.org/html/2410.05046v1#A1.F8 "Figure 8 ‣ A.4 Detailed Results ‣ Appendix A Appendix")), we observe relatively consistent performance. This suggests that the models’ ability to recognize Condition entity type (for example) may be generalizable across various clinical contexts and data sources.

### 4.3 Impact of Model Size and Architecture

Figure [2](https://arxiv.org/html/2410.05046v1#S4.F2 "Figure 2 ‣ 4.4 Token-based vs. Span-based Evaluation ‣ 4 Results and Analysis") illustrates the performance of models according to their size and architecture.

A key finding from this analysis is that LLMs models (i.e., decoder-only architectures) generally do not perform as well as the specialized encoder-based GLiNER architecture for the clinical NER task. This disparity in performance may be attributed to the inherent strengths of encoder-based architectures in token classification tasks, which align closely with the requirements of NER. GLiNER was designed specifically for token classification tasks, utilizing span and label embedding’s similarity, this likely contributes to its strong performance in this task. Decoder models on the other hand generate tokens in an auto-regressive manner, this limits it’s ability to extract accurate span information, a task which is extractive in nature.

#### 4.3.1 Impact of Finetuning

Figure [3](https://arxiv.org/html/2410.05046v1#S4.F3 "Figure 3 ‣ 4.4 Token-based vs. Span-based Evaluation ‣ 4 Results and Analysis") depicts the performance across clinical entities of fine-tuned and zero-shot models . Only the decoder architecture subset is used for this comparison as architectures like GLiNER do not have a supervised variant at the time of writing the paper.

We note that the best performance is obtained by supervised models, which is an expected result. Among the zero-shot models, in lead are Meta-Llama-3-70B-Instruct which is much larger in size and UniNER-7B-type which has been trained on task specific synthetically generated data.

### 4.4 Token-based vs. Span-based Evaluation

We have also compared token-based and span-based performance metrics for the evaluated models. While the core messages and trends derived from both evaluation approaches remain consistent, we observed differences in the absolute performance values and relative rankings of models between the two metrics (as shown in Figure [4](https://arxiv.org/html/2410.05046v1#S5.F4 "Figure 4 ‣ 5 Discussion and Conclusions")).

Token-based and span-based F1-scores reveal clear ranking distinctions between models. The figure compares the overall (average) token-based and span-based F1-scores for each model, highlighting the ranking of models according to each metric and providing insight into model performance across different evaluation approaches.

These differences highlight the importance of considering both evaluation methodologies in clinical NER tasks. Token-based metrics provide insights into the models’ ability to correctly classify individual tokens, while span-based metrics offer a more holistic view of entity recognition. The disparity between these metrics underscores the complexity of clinical NER and the need for comprehensive evaluation approaches to fully understand model performance.

![Refer to caption](x4.png)

(a) Size Comparision

![Refer to caption](x5.png)

(b) Architecture Comparision

Figure 2: Performance across model sizes and architectures. Both the plots represent the span based F1 scores. For size comparision (left) the average F1 score across clinical entities is used. For architecture comparision (right) only decoder and GLiNER encoder models are used. Additionally, closed source models are filtered out.

![Refer to caption](x6.png)

Figure 3: Effect of Training. Span based metrics of the open-source decoder models from the leaderboard are used here.

## 5 Discussion and Conclusions

In this work, we introduce a Clinical NER Benchmark, providing a standardized framework for evaluating language models for NER tasks. Our work addresses some critical challenges in clinical NLP and offers valuable insights into model performance across various clinical domains.

A key strength of this work lies in its comprehensive approach to addressing persistent challenges in clinical NLP. First, our leaderboard tackles the issue of non-standardized medical data formats through terminology standardization. By leveraging the OMOP CDM for entity standardization, we promote consistency and interoperability across diverse healthcare systems and datasets. This standardization not only facilitates more meaningful comparisons between models but also enhances the potential for collaborative research and development in clinical NLP. Second, we have processed a set of benchmark datasets that cover various entity types and clinical domains. This diverse collection ensures a robust evaluation of model performance across different aspects of clinical narratives, providing a more comprehensive assessment of a model’s capabilities in real-world healthcare scenarios. Third, our methodology for evaluation includes different criteria for computing standard metrics such as precision, recall, and F1-score, this allows for a direct comparisons with existing literature while offering comprehensive insights into model performance, addressing the multifaceted nature of entity recognition tasks.

Our evaluation of various models included on the leaderboard (to date) has yielded some important insights. GLiNER-based models have demonstrated superior performance across multiple datasets and entity types. In contrast, decoder-only architectures, used by LLMs such as Llama-3 and GPT-4o, have shown comparatively lower performance. A similar trend has been observed in other studies (Chen et al., [2023](https://arxiv.org/html/2410.05046v1#bib.bib1); Soroush et al., [2024](https://arxiv.org/html/2410.05046v1#bib.bib27)). Furthermore, our analysis revealed that the choice of evaluation strategy—token-based or span-based—can significantly impact the ranking of models, highlighting the importance of comprehensive assessment approaches in clinical NER tasks.

With the establishment of this leaderboard, we aim to drive significant advancements in clinical NLP, with a particular focus on NER. By providing a standardized platform for evaluating diverse language models, including LLMs, we enable researchers and practitioners to benchmark their approaches against state-of-the-art performance. This transparency and comparability are crucial for driving innovation and improving the accuracy of clinical entity recognition tasks, which have far-reaching implications for applications such as clinical decision support, automated coding, and cohort identification for clinical trials.

![Refer to caption](x7.png)

Figure 4: Model rankings according to token-based and span-based F1-scores. The overall (average) token (left) and span-based metrics for each model are shown. The top-4 performing models, according to the span-based F1-score, are highlighted in orange, and the performance of GPT-4o is shown in teal. Models with overall performances below 20% are not shown.

Although our current evaluation metrics focus on traditional measures such as precision, recall, and F1-score, we recognize the potential for more refined assessment approaches. For instance, Fu et al. ([2020](https://arxiv.org/html/2410.05046v1#bib.bib4)) proposed an alternative methodology that defines explainable attributes of data (e.g., entity density, label consistency, token frequency) and evaluates models on distinct buckets based on these attributes. This granular approach allows for a more detailed understanding of model performance, identifying specific areas of strength and weakness. Incorporating such methodologies into future iterations of our leaderboard could provide even more actionable insights for researchers and developers, guiding targeted improvements in model architectures and training strategies.

It is important to acknowledge a significant limitation in the field of clinical NER, which is also reflected in our leaderboard: the issue of label imbalance. Clinical datasets, such as those used in this work, often exhibit a skewed distribution of entity types, with some categories being far more prevalent than others. This imbalance can lead to reporting biased model performances, where accuracy on common entities (such as conditions) may overshadow poor performance on less prevalent (annotated) clinical entities. Future work on this leaderboard and in the broader field of clinical NER should address this limitation through the development of more balanced benchmark datasets.

We are actively working to expand the scope and utility of the Clinical NER Leaderboard222https://huggingface.co/spaces/m42-health/clinical\_ner\_leaderboard. Additional internal datasets are in the process of being included, which will further enhance the robustness and generalizability of model evaluations. Moreover, we enthusiastically welcome contributions from the broader research community. Whether in the form of new datasets, innovative model architectures, or improvements to the [clinical NER Benchmark codebase](https://github.com/WadoodAbdul/clinical_ner_benchmark)333https://github.com/WadoodAbdul/clinical\_ner\_benchmark, external contributions will play a crucial role in the continued evolution and relevance of this resource. To facilitate engagement, we have implemented an automatic submission form, streamlining the process for researchers to add their models to the leaderboard.

In conclusion, by addressing key challenges in data standardization and providing a platform for transparent comparison, we aim to accelerate progress in this critical domain of healthcare informatics. As we continue to refine and expand this resource, we look forward to the insights and innovations it will foster within the research community, ultimately contributing to more accurate and efficient processing of clinical narratives.

## Acknowledgements

This work was supported by M42.

## References

-   Chen et al. (2023) Qijie Chen, Haotong Sun, Haoyang Liu, Yinghui Jiang, Ting Ran, Xurui Jin, Xianglu Xiao, Zhimin Lin, Hongming Chen, and Zhangmin Niu. An extensive benchmark study on biomedical text generation and mining with ChatGPT. _Bioinformatics_, 39(9), September 2023.
-   Demner-Fushman et al. (2024) Dina Demner-Fushman, Sophia Ananiadou, Makoto Miwa, Kirk Roberts, and Junichi Tsujii (eds.). _Proceedings of the 23rd Workshop on Biomedical Natural Language Processing_, Bangkok, Thailand, August 2024. Association for Computational Linguistics.
-   Dogan et al. (2014) Rezarta Islamaj Dogan, Robert Leaman, and Zhiyong Lu. Ncbi disease corpus: A resource for disease name recognition and concept normalization. _Journal of biomedical informatics_, 47:1–10, 2014.
-   Fu et al. (2020) Jinlan Fu, Pengfei Liu, and Graham Neubig. Interpretable multi-dataset evaluation for named entity recognition. In _Proceedings of the 2020 Conference on Empirical Methods in Natural Language Processing (EMNLP)_, pp.  6058–6069, Stroudsburg, PA, USA, November 2020. Association for Computational Linguistics.
-   Gu et al. (2022) Yu Gu, Robert Tinn, Hao Cheng, Michael Lucas, Naoto Usuyama, Xiaodong Liu, Tristan Naumann, Jianfeng Gao, and Hoifung Poon. Domain-specific language model pretraining for biomedical natural language processing. _ACM Trans. Comput. Healthc._, 3(1):1–23, January 2022.
-   Hossain et al. (2023) Elias Hossain, Rajib Rana, Niall Higgins, Jeffrey Soar, Prabal Datta Barua, Anthony R Pisani, and Kathryn Turner. Natural language processing in electronic health records in relation to healthcare decision-making: A systematic review. _Comput. Biol. Med._, 155(106649):106649, March 2023.
-   Iroju et al. (2015) Olaronke G Iroju, Department of Computer Science, Adeyemi College of Education, Ondo, Nigeria, and Janet O Olaleke. A systematic review of natural language processing in healthcare. _Int. J. Inf. Technol. Comput. Sci._, 7(8):44–50, July 2015.
-   Jin et al. (2019) Qiao Jin, Bhuwan Dhingra, William Cohen, and Xinghua Lu. Probing biomedical embeddings from language models. In _Proceedings of the 3rd Workshop on Evaluating Vector Space Representations for NLP_, pp.  82–89, Stroudsburg, PA, USA, 2019. Association for Computational Linguistics.
-   Kanithi et al. (2024) Praveen K Kanithi, Clément Christophe, Marco A F Pimentel, Tathagata Raha, Nada Saadi, Hamza Javed, Svetlana Maslenkova, Nasir Hayat, Ronnie Rajan, and Shadab Khan. MEDIC: Towards a comprehensive framework for evaluating LLMs in clinical applications. _arXiv \[cs.CL\]_, September 2024.
-   Klug et al. (2024) Katrin Klug, Katharina Beckh, Dario Antweiler, Nilesh Chakraborty, Giulia Baldini, Katharina Laue, René Hosch, Felix Nensa, Martin Schuler, and Sven Giesselbach. From admission to discharge: a systematic review of clinical natural language processing along the patient journey. _BMC Med. Inform. Decis. Mak._, 24(1):1–13, August 2024.
-   Kundeti et al. (2016) Srinivasa Rao Kundeti, J Vijayananda, Srikanth Mujjiga, and M Kalyan. Clinical named entity recognition: Challenges and opportunities. In _2016 IEEE International Conference on Big Data (Big Data)_, pp.  1937–1945. IEEE, December 2016.
-   Kury et al. (2020) Fabr’ıcio Kury, Alex Butler, Chi Yuan, Li-heng Fu, Yingcheng Sun, Hao Liu, Ida Sim, Simona Carini, and Chunhua Weng. Chia, a large annotated corpus of clinical trial eligibility criteria. _Scientific data_, 7(1):1–11, 2020.
-   Lee et al. (2019) Jinhyuk Lee, Wonjin Yoon, Sungdong Kim, Donghyeon Kim, Sunkyu Kim, Chan Ho So, and Jaewoo Kang. BioBERT: a pre-trained biomedical language representation model for biomedical text mining. _arXiv \[cs.CL\]_, January 2019.
-   Li et al. (2016a) Jiao Li, Yueping Sun, Robin J. Johnson, Daniela Sciaky, Chih-Hsuan Wei, Robert Leaman, Allan Peter Davis, Carolyn J. Mattingly, Thomas C. Wiegers, and Zhiyong Lu. Biocreative V CDR task corpus: a resource for chemical disease relation extraction. _Database J. Biol. Databases Curation_, 2016, 2016a. doi: 10.1093/database/baw068. URL [https://doi.org/10.1093/database/baw068](https://doi.org/10.1093/database/baw068).
-   Li et al. (2016b) Jiao Li, Yueping Sun, Robin J Johnson, Daniela Sciaky, Chih-Hsuan Wei, Robert Leaman, Allan Peter Davis, Carolyn J Mattingly, Thomas C Wiegers, and Zhiyong Lu. BioCreative V CDR task corpus: a resource for chemical disease relation extraction. _Database (Oxford)_, 2016:baw068, May 2016b.
-   Luo et al. (2022) Ling Luo, Po-Ting Lai, Chih-Hsuan Wei, Cecilia N. Arighi, and Zhiyong Lu. Biored: A comprehensive biomedical relation extraction dataset. _CoRR_, abs/2204.04263, 2022. doi: 10.48550/arXiv.2204.04263. URL [https://doi.org/10.48550/arXiv.2204.04263](https://doi.org/10.48550/arXiv.2204.04263).
-   Menasalvas et al. (2016) Ernestina Menasalvas, Alejandro Rodriguez-Gonzalez, Roberto Costumero, Hector Ambit, and Consuelo Gonzalo. Clinical narrative analytics challenges. In _Rough Sets_, Lecture notes in computer science, pp.  23–32. Springer International Publishing, Cham, 2016.
-   Niero et al. (2023) Luiz Henrique Pereira Niero, João Vitor Andrioli de Souza, Luciana Martins Gomes da Silva, Yohan Bonescki Gumiel, Nícolas Henrique Borges, Gustavo Henrique Munhoz Piotto, Gustavo Giavarini, and Lucas Emanuel Silva e Oliveira. Challenges and issues on extracting named entities from oncology clinical notes. _J. Health Inform._, 15(Especial), July 2023.
-   Névéol et al. (2018) Aurélie Névéol, Hercules Dalianis, Sumithra Velupillai, Guergana Savova, and Pierre Zweigenbaum. Clinical natural language processing in languages other than english: opportunities and challenges. _J. Biomed. Semantics_, 9(1):12, March 2018.
-   Observational Health Data Sciences & Informatics (2021) Observational Health Data Sciences and Informatics. The Book of OHDSI: Chapter 4 The Common Data Model. [https://ohdsi.github.io/TheBookOfOhdsi/](https://ohdsi.github.io/TheBookOfOhdsi/), January 2021. Accessed: 2024-9-2.
-   Ojha et al. (2024) Atul Kr Ojha, A Seza Doğruöz, Harish Tayyar Madabushi, Giovanni Da San Martino, Sara Rosenthal, and Aiala Rosá (eds.). _Proceedings of the 18th International Workshop on Semantic Evaluation (SemEval-2024)_, Mexico City, Mexico, June 2024. Association for Computational Linguistics.
-   Peng et al. (2019) Yifan Peng, Shankai Yan, and Zhiyong Lu. Transfer learning in biomedical natural language processing: An evaluation of BERT and ELMo on ten benchmarking datasets. _arXiv \[cs.CL\]_, June 2019.
-   Pradhan et al. (2015) Sameer Pradhan, Noémie Elhadad, Brett R South, David Martinez, Lee Christensen, Amy Vogel, Hanna Suominen, Wendy W Chapman, and Guergana Savova. Evaluating the state of the art in disorder recognition and normalization of the clinical narrative. _J. Am. Med. Inform. Assoc._, 22(1):143–154, January 2015.
-   Savova et al. (2010) Guergana K Savova, James J Masanz, Philip V Ogren, Jiaping Zheng, Sunghwan Sohn, Karin C Kipper-Schuler, and Christopher G Chute. Mayo clinical text analysis and knowledge extraction system (cTAKES): architecture, component evaluation and applications. _J. Am. Med. Inform. Assoc._, 17(5):507–513, September 2010.
-   Shin et al. (2019) Seo Jeong Shin, Seng Chan You, Yu Rang Park, Jin Roh, Jang-Hee Kim, Seokjin Haam, Christian G Reich, Clair Blacketer, Dae-Soon Son, Seungbin Oh, and Rae Woong Park. Genomic common data model for seamless interoperation of biomedical data in clinical practice: Retrospective study. _J. Med. Internet Res._, 21(3):e13249, March 2019.
-   Shivade et al. (2014) Chaitanya Shivade, Preethi Raghavan, Eric Fosler-Lussier, Peter J Embi, Noemie Elhadad, Stephen B Johnson, and Albert M Lai. A review of approaches to identifying patient phenotype cohorts using electronic health records. _J. Am. Med. Inform. Assoc._, 21(2):221–230, March 2014.
-   Soroush et al. (2024) Ali Soroush, Benjamin S Glicksberg, Eyal Zimlichman, Yiftach Barash, Robert Freeman, Alexander W Charney, Girish N Nadkarni, and Eyal Klang. Large language models are poor medical coders — benchmarking of medical code querying. _NEJM AI_, 1(5), April 2024.
-   Stubbs et al. (2015) Amber Stubbs, Christopher Kotfila, and Özlem Uzuner. Automated systems for the de-identification of longitudinal clinical narratives: Overview of 2014 i2b2/UTHealth shared task track 1. _J. Biomed. Inform._, 58 Suppl(Suppl):S11–S19, December 2015.
-   Sun et al. (2021) Cong Sun, Zhihao Yang, Lei Wang, Yin Zhang, Hongfei Lin, and Jian Wang. Biomedical named entity recognition using BERT in the machine reading comprehension framework. _J. Biomed. Inform._, 118(103799):103799, June 2021.
-   Wang et al. (2018) Alex Wang, Amanpreet Singh, Julian Michael, Felix Hill, Omer Levy, and Samuel Bowman. GLUE: A multi-task benchmark and analysis platform for natural language understanding. In _Proceedings of the 2018 EMNLP Workshop BlackboxNLP: Analyzing and Interpreting Neural Networks for NLP_, pp.  353–355, Stroudsburg, PA, USA, November 2018. Association for Computational Linguistics.
-   Wang et al. (2019) Alex Wang, Yada Pruksachatkun, Nikita Nangia, Amanpreet Singh, Julian Michael, Felix Hill, Omer Levy, and Samuel R Bowman. SuperGLUE: A stickier benchmark for general-purpose language understanding systems. _Neural Inf Process Syst_, abs/1905.00537:3266–3280, May 2019.
-   Wu et al. (2020) Stephen Wu, Kirk Roberts, Surabhi Datta, Jingcheng Du, Zongcheng Ji, Yuqi Si, Sarvesh Soni, Qiong Wang, Qiang Wei, Yang Xiang, Bo Zhao, and Hua Xu. Deep learning in clinical natural language processing: a methodical review. _J. Am. Med. Inform. Assoc._, 27(3):457–470, March 2020.
-   Zaratiana et al. (2023) Urchade Zaratiana, Nadi Tomeh, Pierre Holat, and Thierry Charnois. Gliner: Generalist model for named entity recognition using bidirectional transformer, 2023.
-   Zhang et al. (2024) Zhen Zhang, Yuhua Zhao, Hang Gao, and Mengting Hu. LinkNER: Linking local named entity recognition models to large language models using uncertainty. In _Proceedings of the ACM Web Conference 2024_, pp.  4047–4058, New York, NY, USA, May 2024. ACM.

## Appendix A Appendix

### A.1 Decoder Model Evaluation

Evaluating encoder models, such as BERT, for token classification tasks (e.g., NER) is straightforward given that these models process the entire input sequence simultaneously. This allows them to output token-level classifications by leveraging bidirectional context, facilitating a direct comparison of predicted tags against the gold standard labels for each token in the input sequence.

In contrast, decoder-only models, like GPT models, generate responses sequentially, predicting one token at a time based on the preceding context. Evaluating the performance of these models for token classification tasks requires a different approach. First, we prompt the decoder-only LLM with a specific task of tagging the different entity types within a given text. This task is clearly defined to the model, ensuring it understands which types of entities to identify (i.e., conditions, drugs, procedures, etc). An example of the task prompt is shown below.

## InstructionYour task is to generate an HTML version of an input text, marking up specific entities related to healthcare. The entities to be identified are: symptom, disorder. Use HTML <span > tags to highlight these entities. Each <span > should have a class attribute indicating the type of the entity. Do NOT provide further examples and just consider the input provided below. Do NOT provide an explanation nor notes about the reasoning. Do NOT reformat nor summarize the input text. Follow the instruction and the format of the example below.## Entity markup guideUse <span class=’symptom’ > to denote a symptom.Use <span class=’disorder’ > to denote a disorder.

To ensure deterministic and consistent outputs, the temperature for generation is kept at 0.0. The model then generates a sequential response that includes the tagged entities, as shown in the example below.

## Input:He had been diagnosed with osteoarthritis of the knees and had undergone arthroscopy years prior to admission.## Output:He had been diagnosed with <span class="disease" >osteoarthritis of the knees</span >and had undergone <span class="procedure" >arthroscopy</span >years prior to admission.

After the tagged output is generated, it is parsed to extract the tagged entities. The parsed data are then compared against the gold standard labels, and performance metrics are computed as above. This evaluation method ensures a consistent and objective assessment of decoder-only LLM’s performance in NER tasks, despite the differences in their architecture compared to encoder models.

The Universal-NER decoder models series were trained on a specific prompt template the same was used for these to achieve the best performance. This is shown in the example below.

A virtual assistant answers questions from a user based on the provided text.USER: Text: {{text}}ASSISTANT: I’ve read this text.USER: What describes {{entity}} in the text?ASSISTANT:

For the GPT4o model, the above html span based prompt template was benchmarked. However to achieve better results, a separate prompt inspired by the universal-ner prompt was used. The scores from this new prompt was used for GPT4o in the benchmark. The prompt used is shown below.

{%- if is\_system\_instruction == True -%}You are a helpful medical LLM that identifies medical entities from the input text.{%- endif -%}{%- if is\_user\_instruction == True -%}From a given Text, find the entities that describe {{entity}} and return them in a list of strings.Only output a python list. Do not output anything else like a comment or a suggestion or a note.For entity spans like ’breast and lung cancer’,i.e, entities combined with ’and’, output the whole string as a single disease.Ouptut an empty list if there is no relevant entity.An example output is: ’\[’entity\_text\_1’, ’entity\_text\_2’\]’Text: {{ text }}{%- endif -%}

This was then used to separately query for different entities, which were combined to get the final NER output. Details of the prompting method can be found in our opensource clinical ner benchmark codebase.

### A.2 Common Terminology Label Mapping

The datasets used for the benchmark have numerous entity types. However, the entity labels for the same semantic entities vary across datasets. These entity labels are standardized across datasets using the mapping shown in [5](https://arxiv.org/html/2410.05046v1#A1.T5 "Table 5 ‣ A.2 Common Terminology Label Mapping ‣ Appendix A Appendix").

This mapping was derived by

-   •
    
    Referring to the guidelines used while dataset creation
    
-   •
    
    Randomly sampling example entity spans to understand the entity type
    

An important aspect while evaluating models using the mapped entities is that datapoints within datasets like NCBI can also have drug entities which may not have been marked in the ground truth. Therefore, only the existing entity types within a dataset should be used for evaluation.

Table 5: Mapping used to standardized dataset entities.

{tblr}

width = colspec = Q\[146\]Q\[208\]Q\[179\]Q\[296\]Q\[106\], cell22 = fg=EbonyClay, cell23 = fg=EbonyClay, cell24 = fg=EbonyClay, cell25 = fg=EbonyClay, cell33 = fg=EbonyClay, cell34 = fg=EbonyClay, cell35 = fg=EbonyClay, cell43 = fg=EbonyClay, cell53 = fg=EbonyClay, cell64 = fg=EbonyClay, cell74 = fg=EbonyClay, cell83 = fg=EbonyClay, cell84 = fg=EbonyClay, hlines, vlines,

Standardized  
Label & NCBI CHIA BIORED BC5CDR  
Condition CompositeMention,  
DiseaseClass,  
Modifier,  
SpecificDisease Condition DiseaseOrPhenotypic-  
Feature Disease  
Drug Drug ChemicalEntity Chemical  
Procedure Procedure  
Measurement Measurement  
Gene GeneOrGeneProduct  
Gene Variant SequenceVariant  
Dropped Device, Mood,  
Temporal,  
Negation,  
Observation,  
Qualifier, Scope,  
Reference\_point,  
Person, Value,  
Multiplier, Visit OrganismTaxon,  
CellLine

![Refer to caption](x8.png)

Figure 5: Data Distribution of Clinical Entities

Figure 6: Span counts of different entities. These are the number of entity spans present in the test split of the benchmark datasets

### A.3 Errors of Top Models

Figure [7](https://arxiv.org/html/2410.05046v1#A1.F7 "Figure 7 ‣ A.3 Errors of Top Models ‣ Appendix A Appendix") shows the confusion matrices of the top performing models and gpt-4o-mini. The predicted token counts were normalized by the number of token in ground truth(using each model’s tokenizer) to obtain the percentage of errors.

![Refer to caption](x9.png)

(a) gliner-multitask-large-v0.5

![Refer to caption](x10.png)

(b) UniNER-7B-type-sup

![Refer to caption](x11.png)

(c) gpt-4o-mini

Figure 7: Confusion Matrices of Top Models. The numbers represent the percentage of tokens that have been classified/misclassified.

### A.4 Detailed Results

We present the span and token based results of the leaderboard as of Oct 2024 in table[6](https://arxiv.org/html/2410.05046v1#A1.T6 "Table 6 ‣ A.4 Detailed Results ‣ Appendix A Appendix") and table[7](https://arxiv.org/html/2410.05046v1#A1.T7 "Table 7 ‣ A.4 Detailed Results ‣ Appendix A Appendix") respectively. These tables only contain the results on entity types, for dataset resuts, please refer to the leaderboard. Figure [8](https://arxiv.org/html/2410.05046v1#A1.F8 "Figure 8 ‣ A.4 Detailed Results ‣ Appendix A Appendix") shows the consistency of the entity, Condition, across different datasets. Table [8](https://arxiv.org/html/2410.05046v1#A1.T8 "Table 8 ‣ A.4 Detailed Results ‣ Appendix A Appendix") shows the effect of metric type on ranking.

![Refer to caption](x12.png)

Figure 8: Models performance across the various datasets for identifying conditions. Box plots represent F1-scores of various models across the datasets for condition entities determined using the span-based approach.

Table 6: Results on the Leaderboard. Span metric results of clinical entity types, from the leaderboard as of Oct’ 2024.

Model

CON.

MEAS.

DRUG

PROC.

GENE

GENE V.

Avg.

knowledgator/gliner-multitask-large-v0.5

77.05

66.89

76.00

58.84

62.23

52.99

65.67

Universal-NER/UniNER-7B-type-sup

76.92

43.69

75.13

41.30

59.88

76.72

62.27

gliner-community/gliner\_large-v2.5

78.25

47.60

75.74

44.67

62.08

50.20

59.76

Universal-NER/UniNER-7B-all

76.39

40.74

74.10

37.26

62.20

61.96

58.78

urchade/gliner\_large\_bio-v0.1

73.83

53.62

75.01

45.30

68.38

62.74

63.15

EmergentMethods/gliner\_large\_news-v2.1

74.24

26.84

75.00

51.06

62.80

62.30

58.71

external\_services/gpt-4o-mini-2024-07-18

72.50

34.12

71.00

43.94

63.64

58.85

57.34

external\_services/gpt-4o-2024-05-13

75.99

34.51

72.74

37.73

49.05

50.08

53.35

urchade/gliner\_large-v2.1

71.00

44.93

73.37

50.00

58.32

63.55

60.20

numind/NuNER\_Zero-span

67.88

31.56

76.33

47.94

70.54

45.40

56.61

Universal-NER/UniNER-7B-type

68.38

43.57

69.18

38.10

55.55

39.39

52.36

alvaroalon2/biobert\_diseases\_ner

89.14

0.00

0.00

0.00

0.00

0.00

14.86

meta-llama/Meta-Llama-3-70B-Instruct

69.17

34.13

59.05

46.98

47.65

39.42

49.40

bioformers/bioformer-8L-ncbi-disease

86.05

0.00

0.00

0.00

0.00

0.00

14.34

meta-llama/Meta-Llama-3.1-8B-Instruct

57.09

33.38

62.63

35.91

41.65

27.10

42.96

meta-llama/Meta-Llama-3-8B-Instruct

59.05

26.35

57.09

28.16

49.46

27.36

41.24

numind/NuNER\_Zero

46.10

28.83

61.28

31.69

59.22

33.90

43.50

mistralai/Mixtral-8x7B-Instruct-v0.1

39.30

28.72

39.92

30.97

26.45

23.77

31.52

Table 7: Results on the Leaderboard. Token metric results of clinical entity types, from the leaderboard as of Oct’ 2024.

Model

CON.

MEAS.

DRUG

PROC.

GENE

GENE V.

Avg.

Universal-NER/UniNER-7B-type-sup

77.43

41.85

76.81

46.36

68.00

75.59

64.34

Universal-NER/UniNER-7B-all

77.15

40.65

75.99

42.14

66.74

72.22

62.48

knowledgator/gliner-multitask-large-v0.5

74.83

59.86

69.68

57.21

56.67

58.73

62.83

gliner-community/gliner\_large-v2.5

74.88

50.68

67.75

44.03

63.57

43.96

57.48

urchade/gliner\_large\_bio-v0.1

69.99

48.08

69.93

48.28

67.42

54.23

59.66

Universal-NER/UniNER-7B-type

70.39

36.09

72.45

46.81

60.91

49.10

55.96

external\_services/gpt-4o-2024-05-13

73.94

20.87

66.80

38.86

58.72

57.45

52.77

EmergentMethods/gliner\_large\_news-v2.1

70.63

23.84

67.26

49.58

64.07

55.59

55.16

urchade/gliner\_large-v2.1

66.92

38.42

66.20

48.55

55.93

56.00

55.34

external\_services/gpt-4o-mini-2024-07-18

68.68

25.55

61.47

44.46

63.15

53.34

52.78

numind/NuNER\_Zero

64.21

44.15

68.73

47.10

68.37

50.90

57.24

numind/NuNER\_Zero-span

62.30

36.62

66.48

47.33

71.95

46.46

55.19

meta-llama/Meta-Llama-3.1-8B-Instruct

60.05

43.15

68.99

50.49

46.91

6.28

45.98

meta-llama/Meta-Llama-3-8B-Instruct

63.99

32.43

65.42

40.71

52.20

9.25

44.00

meta-llama/Meta-Llama-3-70B-Instruct

61.72

27.82

51.95

46.17

47.36

35.15

45.03

alvaroalon2/biobert\_diseases\_ner

87.87

0.00

0.00

0.00

0.00

0.00

14.65

bioformers/bioformer-8L-ncbi-disease

81.79

0.00

0.00

0.00

0.00

0.00

13.63

mistralai/Mixtral-8x7B-Instruct-v0.1

32.34

21.40

25.80

22.22

23.10

20.46

24.22

Table 8: Effect of metrics on Ranking. The rank is based on average score of clinical entities score. Delta signifies the change in rank on choosing token metric over span metric.

Model

Architecture

Type

Span Rank

Token Rank

Delta

knowledgator/gliner-multitask-large-v0.5

GLiNER Encoder

zero-shot

1

2

\-1

Universal-NER/UniNER-7B-type-sup

Decoder

fine-tuned

3

1

2

gliner-community/gliner\_large-v2.5

GLiNER Encoder

zero-shot

5

5

0

Universal-NER/UniNER-7B-all

Decoder

fine-tuned

6

3

3

urchade/gliner\_large\_bio-v0.1

GLiNER Encoder

zero-shot

2

4

\-2

EmergentMethods/gliner\_large\_news-v2.1

GLiNER Encoder

zero-shot

7

10

\-3

external\_services/gpt-4o-mini-2024-07-18

Decoder

zero-shot

8

11

\-3

external\_services/gpt-4o-2024-05-13

Decoder

zero-shot

10

12

\-2

urchade/gliner\_large-v2.1

GLiNER Encoder

zero-shot

4

8

\-4

numind/NuNER\_Zero-span

GLiNER Encoder

zero-shot

9

9

0

Universal-NER/UniNER-7B-type

Decoder

zero-shot

11

7

4

alvaroalon2/biobert\_diseases\_ner

Encoder

fine-tuned

17

17

0

meta-llama/Meta-Llama-3-70B-Instruct

Decoder

zero-shot

12

14

\-2

bioformers/bioformer-8L-ncbi-disease

Encoder

fine-tuned

18

18

0

meta-llama/Meta-Llama-3.1-8B-Instruct

Decoder

zero-shot

14

13

1

meta-llama/Meta-Llama-3-8B-Instruct

Decoder

zero-shot

15

15

0

numind/NuNER\_Zero

GLiNER Encoder

zero-shot

13

6

7

mistralai/Mixtral-8x7B-Instruct-v0.1

Decoder

zero-shot

16

16

0
