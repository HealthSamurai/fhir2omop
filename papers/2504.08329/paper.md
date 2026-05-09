# MedRep: Medical Concept Representation for General Electronic Health Record Foundation Models

- arXiv: [2504.08329v1](https://arxiv.org/abs/2504.08329v3)
- Published: 2025-04-11
- Source: `https://arxiv.org/html/2504.08329v1`

---
\\theorembodyfont\\theoremheaderfont\\theorempostheader

: \\theoremsep  

# MedRep: Medical Concept Representation for General Electronic Health Record Foundation Models

\\NameJunmo Kim1 \\Emailencl1228@snu.ac.kr  
   \\NameNamkyeong Lee2 \\Emailnamkyeong96@kaist.ac.kr   \\NameJiwon Kim3 \\Emailjiwonkimm518@snu.ac.kr   \\NameKwangsoo Kim4,5,6, \\Emailkwangsookim@snu.ac.kr  
\\addr1Interdisciplinary Program in Bioengineering Correspondence    Seoul National University  
\\addr2Dept. of Industrial and Systems Engineering    KAIST  
\\addr3Interdisciplinary Program of Medical Informatics    Seoul National University  
\\addr4Dept. of Transdisciplinary Medicine    ICMIT    Seoul National University Hospital  
\\addr5Center for Data Science    Healthcare AI Research Institute    Seoul National University Hospital  
\\addr6Dept. of Medicine    College of Medicine    Seoul National University

###### Abstract

Electronic health record (EHR) foundation models have been an area ripe for exploration with their improved performance in various medical tasks. Despite the rapid advances, there exists a fundamental limitation: Processing unseen medical codes out of the vocabulary. This problem limits the generality of EHR foundation models and the integration of models trained with different vocabularies. To deal with this problem, we propose MedRep for EHR foundation models based on the observational medical outcome partnership (OMOP) common data model (CDM), providing the integrated medical concept representations and the basic data augmentation strategy for patient trajectories. For concept representation learning, we enrich the information of each concept with a minimal definition through large language model (LLM) prompts and enhance the text-based representations through graph ontology of OMOP vocabulary. Trajectory augmentation randomly replaces selected concepts with other similar concepts that have closely related representations to let the model practice with the concepts out-of-vocabulary. Finally, we demonstrate that EHR foundation models trained with MedRep better maintain the prediction performance in external datasets. Our code implementation is publicly available at [https://github.com/kicarussays/MedRep](https://github.com/kicarussays/MedRep).

## 1 Introduction

Electronic health records (EHRs) store a lot of data generated from a hospital, such as diagnoses, measurements, prescriptions, and procedures. Most tertiary hospitals in many countries have adopted EHRs to manage hospital data (Parasrampuria and Henry, [2019](https://arxiv.org/html/2504.08329v1#bib.bib25); Liang et al., [2021](https://arxiv.org/html/2504.08329v1#bib.bib21); Lee et al., [2022](https://arxiv.org/html/2504.08329v1#bib.bib16)). With the widespread use of EHRs, numerous studies have utilized EHR data and machine learning techniques for tasks like medical event prediction (Huang et al., [2023](https://arxiv.org/html/2504.08329v1#bib.bib11)), drug recommendation (Zhang et al., [2023a](https://arxiv.org/html/2504.08329v1#bib.bib37)), and patient monitoring (Kim et al., [2024a](https://arxiv.org/html/2504.08329v1#bib.bib13)).

With the availability of large patient data and the tremendous success of language models, developing EHR foundation models based on medical code and language models has become an area ripe for exploration (Shang et al., [2019](https://arxiv.org/html/2504.08329v1#bib.bib32); Li et al., [2020](https://arxiv.org/html/2504.08329v1#bib.bib18); Rasmy et al., [2021](https://arxiv.org/html/2504.08329v1#bib.bib29)). The medical history of each patient can be represented as a sequence of medical codes, which is called a _patient trajectory_ (Bornet et al., [2025](https://arxiv.org/html/2504.08329v1#bib.bib1)). Each code and trajectory corresponds to a word and a sentence in natural language. Along with similar problem settings, EHR foundation models have been trained to comprehend medical context by paradigms of language models and utilized to predict several medical events, such as in-hospital mortality, long length of stay, readmission, and various diseases (Guo et al., [2024](https://arxiv.org/html/2504.08329v1#bib.bib8); Li et al., [2020](https://arxiv.org/html/2504.08329v1#bib.bib18)).

Despite the rapid advances, EHR foundation models have a fundamental limitation: The discrepancy of medical code vocabularies from different institutions. For example, suppose hospitals A and B store diagnosis records using SNOMED-CT and ICD-10, respectively. In that case, a model trained by the data of hospital A may not operate at hospital B because the medical codes that were not included in the vocabulary of hospital A might be treated as “unknown” codes. To mitigate the difference in data, a lot of medical institutions have introduced an observational medical outcome partnership (OMOP) common data model (CDM) (Stang et al., [2010](https://arxiv.org/html/2504.08329v1#bib.bib33)), which enables the transformation of different EHR databases to a standardized format. Instead of using various medical vocabularies, such as SNOMED-CT (Donnelly et al., [2006](https://arxiv.org/html/2504.08329v1#bib.bib6)), ICD-10 (Quan et al., [2005](https://arxiv.org/html/2504.08329v1#bib.bib28)), RxNorm (Liu et al., [2005](https://arxiv.org/html/2504.08329v1#bib.bib22)), and LOINC (McDonald et al., [2003](https://arxiv.org/html/2504.08329v1#bib.bib23)), the OMOP CDM relies on a single, unified vocabulary: the OMOP vocabulary. More than 9M medical codes from dozens of medical vocabularies can be systemically mapped to standardized OMOP concept IDs. As a result, EHR foundation models built on OMOP CDM can seamlessly operate across any institutions adopting the OMOP standard.

However, merging OMOP CDM-based EHR data from different hospitals is still strictly prohibited due to patient privacy regulations. Thus, EHR foundation models built on OMOP CDM must be trained separately at each institution, even though they share a common vocabulary. Additionally, hospitals using OMOP CDM may use different concept IDs for the same concept (Kim et al., [2024b](https://arxiv.org/html/2504.08329v1#bib.bib14)). For instance, to map the prescription of “aspirin 100MG oral tablet”, there exist a lot of relevant concept IDs, such as 1113143 (aspirin 100MG Oral Tablet), 42483115 (Aspirin 100 MG Oral Capsule), 40012940 (Aspirin 100MG Oral Solution), 35136978 (Aspirin 100MG Oral Tablet by Pfizer), and 36893848 (Aspirin 100MG/ML Oral Solution). While these concepts are almost identical, EHR foundation models may treat them as entirely different because they are associated with distinct concept IDs and tokenized indices. As a result, when a model is transferred to another institution, it may fail to recognize semantically similar but previously unseen concepts, limiting its ability to generally operate across external datasets.

In this study, we propose MedRep, a strategy to learn and utilize medical concept representation for the _general EHR foundation model_, which is vocabulary-agnostic and can operate at any institution with an OMOP CDM-based EHR database. MedRep contains two main components: 1) Concept representation learning and 2) Trajectory augmentation. For concept representation learning, we first generate a brief description of clinical background and context through large language model (LLM) prompts (Schick and Schütze, [2020](https://arxiv.org/html/2504.08329v1#bib.bib31)) to enrich the information of each concept. Next, we learn the generated descriptions through masked language model (MLM) (Devlin et al., [2019](https://arxiv.org/html/2504.08329v1#bib.bib5)) to produce text-based representations. These representations are then enhanced through graph contrastive learning and graph ontology of OMOP vocabulary. For trajectory augmentation, close neighbors are extracted for each concept, and some concepts in patient trajectories are randomly replaced with the extracted neighbors. Through MedRep, we enhance the compatibility of EHR foundation models, maintaining downstream task performance in external validation.

We use two open EHR datasets, MIMIC-IV (version 2.2) (Johnson et al., [2023](https://arxiv.org/html/2504.08329v1#bib.bib12)) and EHRSHOT (Wornow et al., [2023](https://arxiv.org/html/2504.08329v1#bib.bib35)), and one private EHR dataset from Seoul National University Hospital (SNUH) in Korea. All baseline models are based on MIMIC-IV. To demonstrate the compatibility of MedRep, we first pretrain and finetune EHR foundation models using MIMIC-IV and then evaluate the prediction performance using all included data (MIMIC-IV, EHRSHOT, SNUH) without any additional parameter updates. We show that EHR foundation models with MedRep better retain the performance even in external validation than those without. There exists a concurrent work, MedTok (Su et al., [2025](https://arxiv.org/html/2504.08329v1#bib.bib34)); however, it has not been explored to _externally validate_ the model performance using separate datasets. We compare the internal and external validation performance of MedRep and MedTok. Our contributions are as follows:

-   •
    
    _Concept representation learning_. Based on the definition of each medical concept and graph ontology of OMOP vocabulary, we trained concept representations, which can be applied to any EHR foundation models. The representations used in the study are now released in our GitHub repository.
    
-   •
    
    _Trajectory augmentation_. Concept representation learning enables trajectory augmentation through unified vocabulary. We propose a basic data augmentation strategy for EHR foundation models.
    
-   •
    
    _External validation_. The compatibility of EHR foundation models has not been fully explored by external validation. We evaluate the model performance for three medical outcomes without additional finetuning for external datasets. EHR foundation models with MedRep are more consistent in external validation rather than the other baselines.
    

## 2 Related Work

#### EHR foundation models

Given similar problem settings with language models, various EHR foundation models have been proposed and applied to various downstream tasks. BEHRT (Li et al., [2020](https://arxiv.org/html/2504.08329v1#bib.bib18)) is a BERT-based model pretrained on EHR data from 1.6 million patients in the UK Biobank. It encodes a patient’s medical history as a sequence of medical codes and incorporates age embeddings to capture the temporal aspects of clinical events. Med-BERT (Rasmy et al., [2021](https://arxiv.org/html/2504.08329v1#bib.bib29)) additionally adopts prolonged length of stay (Prolonged LOS) prediction process during pretraining to enhance generalizability of the pretrained model. TransformEHR (Yang et al., [2023](https://arxiv.org/html/2504.08329v1#bib.bib36)) is pretrained by an encoder-decoder transformer architecture of BART (Lewis et al., [2019](https://arxiv.org/html/2504.08329v1#bib.bib17)), predicting visit-level clinical events at a future visit using previous visits. ETHOS (Renc et al., [2024](https://arxiv.org/html/2504.08329v1#bib.bib30)) is based on a paradigm of autoregressive language model like generative pretrained transformer (GPT), focusing on zero-shot health trajectory prediction. BEHRT-DE (Kim et al., [2024b](https://arxiv.org/html/2504.08329v1#bib.bib14)) adds domain embedding to provide a hint of domain during pretraining process, to prevent the model from finding unnecessary medical concepts from other domains. There exist more various EHR foundation models on their objectives, such as G-BERT (Shang et al., [2019](https://arxiv.org/html/2504.08329v1#bib.bib32)), Hi-BEHRT (Li et al., [2022](https://arxiv.org/html/2504.08329v1#bib.bib19)), GT-BEHRT (Poulain and Beheshti, [2024](https://arxiv.org/html/2504.08329v1#bib.bib26)), MulT-EHR (Chan et al., [2024](https://arxiv.org/html/2504.08329v1#bib.bib2)), CEHR-BERT (Pang et al., [2021](https://arxiv.org/html/2504.08329v1#bib.bib24)), and RareBERT (Prakash et al., [2021](https://arxiv.org/html/2504.08329v1#bib.bib27)). These approaches highlight the potential of building foundation models on large-scale EHR data, which can subsequently be fine-tuned for specific clinical tasks, offering strong transferability and scalability across diverse healthcare systems and clinical environments. However, it has not been fully explored if EHR foundation models can maintain their performance on external validation.

#### MedTok

As a concurrent work, MedTok (Su et al., [2025](https://arxiv.org/html/2504.08329v1#bib.bib34)) has been proposed to quantize original medical codes into a unified codebook. MedTok is based on textual information of medical codes (\>\>\>600K) from various vocabularies and relational knowledge based on PrimeKG (Chandak et al., [2023](https://arxiv.org/html/2504.08329v1#bib.bib3)). MedTok first generates text semantic and graph-level embeddings for modality-specific and cross-modality embeddings. Then, MedTok learns the codebook using those two embedding types and provides unified medical tokens for downstream tasks. On the contrary, MedRep learns representations of medical concepts using OMOP vocabulary-based textual information and graph ontology. For concept representation learning, relational information from graph ontology strengthens the pretrained LLM-attributed text-based representation. In addition, MedRep contains a trajectory augmentation process, and we demonstrate the efficacy of our approach for maintaining original performance in external validation using datasets from separate institutions.

## 3 Methods

In this section, we introduce the workflow of MedRep. Given phrase-level concept names and the graph ontology of OMOP vocabulary, MedRep consists of two main processes: 1) Concept representation learning and 2) Trajectory augmentation. For concept representation learning, we create text-based representation using a language model and LLM-attributed description of each concept. Then, we complement text-based representations by reflecting the relationship between concepts using the graph ontology of OMOP vocabulary. For trajectory augmentation, we extract close neighbors for each concept and substitute the original concept with one of the extracted neighbors to improve external validation performance. The brief illustrations of concept representation learning and trajectory augmentation are illustrated in Figures [1](https://arxiv.org/html/2504.08329v1#S3.F1 "Figure 1 ‣ 3 Methods ‣ MedRep: Medical Concept Representation for General Electronic Health Record Foundation Models") and [2](https://arxiv.org/html/2504.08329v1#S3.F2 "Figure 2 ‣ 3 Methods ‣ MedRep: Medical Concept Representation for General Electronic Health Record Foundation Models").

![Refer to caption](extracted/6353117/images/crl.png)

Figure 1: Concept representation learning.

![Refer to caption](extracted/6353117/images/ta.png)

Figure 2: Use case of trajectory augmentation. While the original setting updates the parameters of the embedding layer during model development, the MedRep setting replaces the weights of the embedding layer with pretrained concept representations and freezes the embedding layer with new weights.

### 3.1 Text-based Representation

We define the OMOP vocabulary as 𝒞\={ck,name}k\=1N𝒞superscriptsubscriptsubscript𝑐𝑘name𝑘1𝑁\\mathcal{C}=\\left\\{c\_{k,\\text{name}}\\right\\}\_{k=1}^{N}caligraphic\_C = { italic\_c start\_POSTSUBSCRIPT italic\_k , name end\_POSTSUBSCRIPT } start\_POSTSUBSCRIPT italic\_k = 1 end\_POSTSUBSCRIPT start\_POSTSUPERSCRIPT italic\_N end\_POSTSUPERSCRIPT, where ck,namesubscript𝑐𝑘namec\_{k,\\text{name}}italic\_c start\_POSTSUBSCRIPT italic\_k , name end\_POSTSUBSCRIPT is the textual definition of the k𝑘kitalic\_k\-th concept cksubscript𝑐𝑘c\_{k}italic\_c start\_POSTSUBSCRIPT italic\_k end\_POSTSUBSCRIPT and N𝑁Nitalic\_N is the size of vocabulary. Concept names in OMOP vocabulary (e.g., Aspirin 100mg Oral Tablet) are minimal informative. To enrich clinical information, we generated a description dksubscript𝑑𝑘d\_{k}italic\_d start\_POSTSUBSCRIPT italic\_k end\_POSTSUBSCRIPT for each concept name ck,namesubscript𝑐𝑘namec\_{k,\\text{name}}italic\_c start\_POSTSUBSCRIPT italic\_k , name end\_POSTSUBSCRIPT using a LLM, assuming that the LLM contains general information of medical concepts and provides similar descriptions for similar concepts. In this study, we used four domains from OMOP CDM (condition, drug, measurement, and procedure). For each domain, we assigned different prompt to let the LLM generate proper explanation accordingly. Thus, dk\=LLM⁢(Promptdomain⁢(ck,name))subscript𝑑𝑘LLMsubscriptPromptdomainsubscript𝑐𝑘named\_{k}=\\text{LLM}(\\text{Prompt}\_{\\text{domain}}(c\_{k,\\text{name}}))italic\_d start\_POSTSUBSCRIPT italic\_k end\_POSTSUBSCRIPT = LLM ( Prompt start\_POSTSUBSCRIPT domain end\_POSTSUBSCRIPT ( italic\_c start\_POSTSUBSCRIPT italic\_k , name end\_POSTSUBSCRIPT ) ). The LLM prompt for each domain is described in Table [5](https://arxiv.org/html/2504.08329v1#Sx1.T5 "Table 5 ‣ Acknowledgments ‣ MedRep: Medical Concept Representation for General Electronic Health Record Foundation Models") in Appendix [A.1](https://arxiv.org/html/2504.08329v1#A1.SS1 "A.1 Prompt Design ‣ Appendix A Details on Data Preparation ‣ MedRep: Medical Concept Representation for General Electronic Health Record Foundation Models").

Then, we trained a MLM using the generated descriptions to encapsulate enriched clinical information. For each concept cksubscript𝑐𝑘c\_{k}italic\_c start\_POSTSUBSCRIPT italic\_k end\_POSTSUBSCRIPT, the final text-based representation is denoted as 𝐫text,k\=f⁢(ck,name,dk;θ)∈𝐑textsubscript𝐫text𝑘𝑓subscript𝑐𝑘namesubscript𝑑𝑘𝜃subscript𝐑text\\mathbf{r}\_{\\text{text},k}=f(c\_{k,\\text{name}},d\_{k};\\theta)\\in\\mathbf{R}\_{% \\text{text}}bold\_r start\_POSTSUBSCRIPT text , italic\_k end\_POSTSUBSCRIPT = italic\_f ( italic\_c start\_POSTSUBSCRIPT italic\_k , name end\_POSTSUBSCRIPT , italic\_d start\_POSTSUBSCRIPT italic\_k end\_POSTSUBSCRIPT ; italic\_θ ) ∈ bold\_R start\_POSTSUBSCRIPT text end\_POSTSUBSCRIPT, where 𝐫text,k∈ℝhsubscript𝐫text𝑘superscriptℝℎ\\mathbf{r}\_{\\text{text},k}\\in\\mathbb{R}^{h}bold\_r start\_POSTSUBSCRIPT text , italic\_k end\_POSTSUBSCRIPT ∈ blackboard\_R start\_POSTSUPERSCRIPT italic\_h end\_POSTSUPERSCRIPT for hidden dimension hℎhitalic\_h, f𝑓fitalic\_f is the MLM pretrained on the descriptions {dk}k\=1Nsuperscriptsubscriptsubscript𝑑𝑘𝑘1𝑁\\left\\{d\_{k}\\right\\}\_{k=1}^{N}{ italic\_d start\_POSTSUBSCRIPT italic\_k end\_POSTSUBSCRIPT } start\_POSTSUBSCRIPT italic\_k = 1 end\_POSTSUBSCRIPT start\_POSTSUPERSCRIPT italic\_N end\_POSTSUPERSCRIPT, and θ𝜃\\thetaitalic\_θ is the model parameters. We used ChatGPT-4o-mini (OpenAI Inc) for LLM and DeBERTa (He et al., [2020](https://arxiv.org/html/2504.08329v1#bib.bib10)) for f𝑓fitalic\_f.

### 3.2 Complementing Relational Information

The text-based representation contains abundant clinical background and medical context of each concept. Even though it is assumed that similar concepts possess similar text-based representations, we additionally complement text-based representation using officially verified graph ontology of OMOP vocabulary. Now, let the relational graph of OMOP vocabulary 𝒢\=(𝒞,ℰ)𝒢𝒞ℰ\\mathcal{G}=(\\mathcal{C},\\mathcal{E})caligraphic\_G = ( caligraphic\_C , caligraphic\_E ), where 𝒞\={ck}k\=1N𝒞superscriptsubscriptsubscript𝑐𝑘𝑘1𝑁\\mathcal{C}=\\left\\{c\_{k}\\right\\}\_{k=1}^{N}caligraphic\_C = { italic\_c start\_POSTSUBSCRIPT italic\_k end\_POSTSUBSCRIPT } start\_POSTSUBSCRIPT italic\_k = 1 end\_POSTSUBSCRIPT start\_POSTSUPERSCRIPT italic\_N end\_POSTSUPERSCRIPT and ℰ⊆𝒞×𝒞ℰ𝒞𝒞\\mathcal{E}\\subseteq\\mathcal{C}\\times\\mathcal{C}caligraphic\_E ⊆ caligraphic\_C × caligraphic\_C indicate the concept (node) set and the edge set, respectively. The feature matrix and adjacency matrix are denoted as 𝐗∈ℝN×h𝐗superscriptℝ𝑁ℎ\\mathbf{X}\\in\\mathbb{R}^{N\\times h}bold\_X ∈ blackboard\_R start\_POSTSUPERSCRIPT italic\_N × italic\_h end\_POSTSUPERSCRIPT and 𝐀∈{0,1}N×N𝐀superscript01𝑁𝑁\\mathbf{A}\\in\\left\\{0,1\\right\\}^{N\\times N}bold\_A ∈ { 0 , 1 } start\_POSTSUPERSCRIPT italic\_N × italic\_N end\_POSTSUPERSCRIPT, where 𝐗k\=𝐫text,ksubscript𝐗𝑘subscript𝐫text𝑘\\mathbf{X}\_{k}=\\mathbf{r}\_{\\text{text},k}bold\_X start\_POSTSUBSCRIPT italic\_k end\_POSTSUBSCRIPT = bold\_r start\_POSTSUBSCRIPT text , italic\_k end\_POSTSUBSCRIPT, which is the text-based representation of the k𝑘kitalic\_k\-th concept, and 𝐀i⁢j\=1subscript𝐀𝑖𝑗1\\mathbf{A}\_{ij}=1bold\_A start\_POSTSUBSCRIPT italic\_i italic\_j end\_POSTSUBSCRIPT = 1 if and only if (ci,cj)∈ℰsubscript𝑐𝑖subscript𝑐𝑗ℰ(c\_{i},c\_{j})\\in\\mathcal{E}( italic\_c start\_POSTSUBSCRIPT italic\_i end\_POSTSUBSCRIPT , italic\_c start\_POSTSUBSCRIPT italic\_j end\_POSTSUBSCRIPT ) ∈ caligraphic\_E. In this section, our objective is to train graph neural network (GNN) encoder g𝑔gitalic\_g to yield final concept representations 𝐑\=g⁢(𝐗,𝐀)∈ℝN×h𝐑𝑔𝐗𝐀superscriptℝ𝑁ℎ\\mathbf{R}=g(\\mathbf{X},\\mathbf{A})\\in\\mathbb{R}^{N\\times h}bold\_R = italic\_g ( bold\_X , bold\_A ) ∈ blackboard\_R start\_POSTSUPERSCRIPT italic\_N × italic\_h end\_POSTSUPERSCRIPT complemented by relational information of concepts.

#### Graph Contrastive Learning

To reflect relational information, we adopt the GRACE framework (Zhu et al., [2020](https://arxiv.org/html/2504.08329v1#bib.bib39)), which is a general contrastive learning framework for unsupervised graph representation learning. GRACE first generates two different graph views to obtain two embedding sets 𝐔\=g⁢(𝐗~1,𝐀~1)𝐔𝑔subscript~𝐗1subscript~𝐀1\\mathbf{U}=g(\\tilde{\\mathbf{X}}\_{1},\\tilde{\\mathbf{A}}\_{1})bold\_U = italic\_g ( over~ start\_ARG bold\_X end\_ARG start\_POSTSUBSCRIPT 1 end\_POSTSUBSCRIPT , over~ start\_ARG bold\_A end\_ARG start\_POSTSUBSCRIPT 1 end\_POSTSUBSCRIPT ) and 𝐕\=g⁢(𝐗~2,𝐀~2)𝐕𝑔subscript~𝐗2subscript~𝐀2\\mathbf{V}=g(\\tilde{\\mathbf{X}}\_{2},\\tilde{\\mathbf{A}}\_{2})bold\_V = italic\_g ( over~ start\_ARG bold\_X end\_ARG start\_POSTSUBSCRIPT 2 end\_POSTSUBSCRIPT , over~ start\_ARG bold\_A end\_ARG start\_POSTSUBSCRIPT 2 end\_POSTSUBSCRIPT ), where X~~𝑋\\tilde{X}over~ start\_ARG italic\_X end\_ARG and A~~𝐴\\tilde{A}over~ start\_ARG italic\_A end\_ARG are masked node features and dropped edges. Then, the parameters of GNN encoder g𝑔gitalic\_g are updated with the following objective to be minimized:

ℒG\=−12⁢N⁢∑k\=1N\[ℓ⁢(𝐮k,𝐯k)+ℓ⁢(𝐯k,𝐮k)\],subscriptℒG12𝑁superscriptsubscript𝑘1𝑁delimited-\[\]ℓsubscript𝐮𝑘subscript𝐯𝑘ℓsubscript𝐯𝑘subscript𝐮𝑘\\mathcal{L}\_{\\text{G}}=-\\frac{1}{2N}\\sum\_{k=1}^{N}\\left\[\\ell(\\mathbf{u}\_{k},% \\mathbf{v}\_{k})+\\ell(\\mathbf{v}\_{k},\\mathbf{u}\_{k})\\right\],caligraphic\_L start\_POSTSUBSCRIPT G end\_POSTSUBSCRIPT = - divide start\_ARG 1 end\_ARG start\_ARG 2 italic\_N end\_ARG ∑ start\_POSTSUBSCRIPT italic\_k = 1 end\_POSTSUBSCRIPT start\_POSTSUPERSCRIPT italic\_N end\_POSTSUPERSCRIPT \[ roman\_ℓ ( bold\_u start\_POSTSUBSCRIPT italic\_k end\_POSTSUBSCRIPT , bold\_v start\_POSTSUBSCRIPT italic\_k end\_POSTSUBSCRIPT ) + roman\_ℓ ( bold\_v start\_POSTSUBSCRIPT italic\_k end\_POSTSUBSCRIPT , bold\_u start\_POSTSUBSCRIPT italic\_k end\_POSTSUBSCRIPT ) \] ,

where 𝐮k∈𝐔subscript𝐮𝑘𝐔\\mathbf{u}\_{k}\\in\\mathbf{U}bold\_u start\_POSTSUBSCRIPT italic\_k end\_POSTSUBSCRIPT ∈ bold\_U, 𝐯k∈𝐕subscript𝐯𝑘𝐕\\mathbf{v}\_{k}\\in\\mathbf{V}bold\_v start\_POSTSUBSCRIPT italic\_k end\_POSTSUBSCRIPT ∈ bold\_V, and ℓℓ\\ellroman\_ℓ is the pairwise objective arranging positive pairs to be close and negative pairs to be apart.

#### Learning without Forgetting

Graph contrastive learning enhances the text-based representations through the graph ontology of OMOP vocabulary. However, the text-based representations are already informative and the GNN might easily distinguish connected concepts, resulting in feature collapse and loss of information and diversity (Zhang et al., [2023b](https://arxiv.org/html/2504.08329v1#bib.bib38)). To mitigate this problem, we additionally trained GNN with the scheme of Learning without Forgetting (LwF) (Li and Hoiem, [2017](https://arxiv.org/html/2504.08329v1#bib.bib20)), a continual learning approach for maintaining previously learned information when training with new data.

As a knowledge distillation loss ℒKDsubscriptℒKD\\mathcal{L}\_{\\text{KD}}caligraphic\_L start\_POSTSUBSCRIPT KD end\_POSTSUBSCRIPT, we adopted Kullback–Leibler (KL) divergence loss for the original text-based representations 𝐑text∈ℝN×hsubscript𝐑textsuperscriptℝ𝑁ℎ\\mathbf{R}\_{\\text{text}}\\in\\mathbb{R}^{N\\times h}bold\_R start\_POSTSUBSCRIPT text end\_POSTSUBSCRIPT ∈ blackboard\_R start\_POSTSUPERSCRIPT italic\_N × italic\_h end\_POSTSUPERSCRIPT and GNN-attributed representations 𝐑graph∈ℝN×hsubscript𝐑graphsuperscriptℝ𝑁ℎ\\mathbf{R}\_{\\text{graph}}\\in\\mathbb{R}^{N\\times h}bold\_R start\_POSTSUBSCRIPT graph end\_POSTSUBSCRIPT ∈ blackboard\_R start\_POSTSUPERSCRIPT italic\_N × italic\_h end\_POSTSUPERSCRIPT as follows:

ℒKD⁢(𝐑text∥𝐑graph)\=∑k\=1NS⁢(rtext,k)⋅log⁡(S⁢(rtext,k)S⁢(rgraph,k)),subscriptℒKDconditionalsubscript𝐑textsubscript𝐑graphsuperscriptsubscript𝑘1𝑁⋅𝑆subscript𝑟text𝑘𝑆subscript𝑟text𝑘𝑆subscript𝑟graph𝑘\\mathcal{L}\_{\\text{KD}}(\\mathbf{R}\_{\\text{text}}\\parallel\\mathbf{R}\_{\\text{% graph}})=\\sum\_{k=1}^{N}S(r\_{\\text{text},k})\\cdot\\log\\left(\\frac{S(r\_{\\text{% text},k})}{S(r\_{\\text{graph},k})}\\right),caligraphic\_L start\_POSTSUBSCRIPT KD end\_POSTSUBSCRIPT ( bold\_R start\_POSTSUBSCRIPT text end\_POSTSUBSCRIPT ∥ bold\_R start\_POSTSUBSCRIPT graph end\_POSTSUBSCRIPT ) = ∑ start\_POSTSUBSCRIPT italic\_k = 1 end\_POSTSUBSCRIPT start\_POSTSUPERSCRIPT italic\_N end\_POSTSUPERSCRIPT italic\_S ( italic\_r start\_POSTSUBSCRIPT text , italic\_k end\_POSTSUBSCRIPT ) ⋅ roman\_log ( divide start\_ARG italic\_S ( italic\_r start\_POSTSUBSCRIPT text , italic\_k end\_POSTSUBSCRIPT ) end\_ARG start\_ARG italic\_S ( italic\_r start\_POSTSUBSCRIPT graph , italic\_k end\_POSTSUBSCRIPT ) end\_ARG ) ,

where 𝐑text\={𝐫text,k}k\=1Nsubscript𝐑textsuperscriptsubscriptsubscript𝐫text𝑘𝑘1𝑁\\mathbf{R}\_{\\text{text}}=\\left\\{\\mathbf{r}\_{\\text{text},k}\\right\\}\_{k=1}^{N}bold\_R start\_POSTSUBSCRIPT text end\_POSTSUBSCRIPT = { bold\_r start\_POSTSUBSCRIPT text , italic\_k end\_POSTSUBSCRIPT } start\_POSTSUBSCRIPT italic\_k = 1 end\_POSTSUBSCRIPT start\_POSTSUPERSCRIPT italic\_N end\_POSTSUPERSCRIPT, 𝐑graph\={𝐫graph,k}k\=1N\=g⁢(𝐑text,𝐀)subscript𝐑graphsuperscriptsubscriptsubscript𝐫graph𝑘𝑘1𝑁𝑔subscript𝐑text𝐀\\mathbf{R}\_{\\text{graph}}=\\left\\{\\mathbf{r}\_{\\text{graph},k}\\right\\}\_{k=1}^{N}% =g(\\mathbf{R}\_{\\text{text}},\\mathbf{A})bold\_R start\_POSTSUBSCRIPT graph end\_POSTSUBSCRIPT = { bold\_r start\_POSTSUBSCRIPT graph , italic\_k end\_POSTSUBSCRIPT } start\_POSTSUBSCRIPT italic\_k = 1 end\_POSTSUBSCRIPT start\_POSTSUPERSCRIPT italic\_N end\_POSTSUPERSCRIPT = italic\_g ( bold\_R start\_POSTSUBSCRIPT text end\_POSTSUBSCRIPT , bold\_A ), and S𝑆Sitalic\_S is the softmax function. The parameters of GNN encoder g𝑔gitalic\_g is alternately updated by minimizing the losses ℒGsubscriptℒG\\mathcal{L}\_{\\text{G}}caligraphic\_L start\_POSTSUBSCRIPT G end\_POSTSUBSCRIPT and ℒKDsubscriptℒKD\\mathcal{L}\_{\\text{KD}}caligraphic\_L start\_POSTSUBSCRIPT KD end\_POSTSUBSCRIPT. Now, we obtain the final concept representation set 𝐑\=g⁢(𝐗,𝐀)∈ℝN×h𝐑𝑔𝐗𝐀superscriptℝ𝑁ℎ\\mathbf{R}=g(\\mathbf{X},\\mathbf{A})\\in\\mathbb{R}^{N\\times h}bold\_R = italic\_g ( bold\_X , bold\_A ) ∈ blackboard\_R start\_POSTSUPERSCRIPT italic\_N × italic\_h end\_POSTSUPERSCRIPT. EHR foundation models can directly use pretrained representations 𝐑𝐑\\mathbf{R}bold\_R instead of training embedding layers for token indices.

### 3.3 Trajectory Augmentation

Trajectory augmentation is the final component of MedRep. For each concept cksubscript𝑐𝑘c\_{k}italic\_c start\_POSTSUBSCRIPT italic\_k end\_POSTSUBSCRIPT, we extract the top M𝑀Mitalic\_M closest neighbors based on the Euclidean distance between representations to construct the neighbor set 𝐍∈ℕN,M𝐍superscriptℕ𝑁𝑀\\mathbf{N}\\in\\mathbb{N}^{N,M}bold\_N ∈ blackboard\_N start\_POSTSUPERSCRIPT italic\_N , italic\_M end\_POSTSUPERSCRIPT. Let dist⁢(𝐫i,𝐫j)distsubscript𝐫𝑖subscript𝐫𝑗\\text{dist}(\\mathbf{r}\_{i},\\mathbf{r}\_{j})dist ( bold\_r start\_POSTSUBSCRIPT italic\_i end\_POSTSUBSCRIPT , bold\_r start\_POSTSUBSCRIPT italic\_j end\_POSTSUBSCRIPT ) be the Euclidean distance between 𝐫i,𝐫j∈𝐑subscript𝐫𝑖subscript𝐫𝑗𝐑\\mathbf{r}\_{i},\\mathbf{r}\_{j}\\in\\mathbf{R}bold\_r start\_POSTSUBSCRIPT italic\_i end\_POSTSUBSCRIPT , bold\_r start\_POSTSUBSCRIPT italic\_j end\_POSTSUBSCRIPT ∈ bold\_R. The set of neighbors 𝐍ksubscript𝐍𝑘\\mathbf{N}\_{k}bold\_N start\_POSTSUBSCRIPT italic\_k end\_POSTSUBSCRIPT for each concept cksubscript𝑐𝑘c\_{k}italic\_c start\_POSTSUBSCRIPT italic\_k end\_POSTSUBSCRIPT is obtained as follows:

𝐍k\=argminMi∈{1,⋯,N}∖k⁢{dist⁢(𝐫k,𝐫i)},subscript𝐍𝑘𝑖1⋯𝑁𝑘subscriptargmin𝑀distsubscript𝐫𝑘subscript𝐫𝑖\\mathbf{N}\_{k}=\\underset{i\\in\\left\\{1,\\cdots,N\\right\\}\\setminus k}{\\text{% argmin}\_{M}}\\left\\{\\text{dist}(\\mathbf{r}\_{k},\\mathbf{r}\_{i})\\right\\},bold\_N start\_POSTSUBSCRIPT italic\_k end\_POSTSUBSCRIPT = start\_UNDERACCENT italic\_i ∈ { 1 , ⋯ , italic\_N } ∖ italic\_k end\_UNDERACCENT start\_ARG argmin start\_POSTSUBSCRIPT italic\_M end\_POSTSUBSCRIPT end\_ARG { dist ( bold\_r start\_POSTSUBSCRIPT italic\_k end\_POSTSUBSCRIPT , bold\_r start\_POSTSUBSCRIPT italic\_i end\_POSTSUBSCRIPT ) } ,

where argminMsubscriptargmin𝑀\\text{argmin}\_{M}argmin start\_POSTSUBSCRIPT italic\_M end\_POSTSUBSCRIPT is defined as the set of the top M𝑀Mitalic\_M elements with the minimal values from the given set. Given trajectory set 𝒯𝒯\\mathcal{T}caligraphic\_T, a trajectory t∈𝒯𝑡𝒯t\\in\\mathcal{T}italic\_t ∈ caligraphic\_T corresponds to a sequence of concepts as t\=(ck1,⋯,ckLt)𝑡subscript𝑐subscript𝑘1⋯subscript𝑐subscript𝑘subscript𝐿𝑡t=(c\_{k\_{1}},\\cdots,c\_{k\_{L\_{t}}})italic\_t = ( italic\_c start\_POSTSUBSCRIPT italic\_k start\_POSTSUBSCRIPT 1 end\_POSTSUBSCRIPT end\_POSTSUBSCRIPT , ⋯ , italic\_c start\_POSTSUBSCRIPT italic\_k start\_POSTSUBSCRIPT italic\_L start\_POSTSUBSCRIPT italic\_t end\_POSTSUBSCRIPT end\_POSTSUBSCRIPT end\_POSTSUBSCRIPT ), where Ltsubscript𝐿𝑡L\_{t}italic\_L start\_POSTSUBSCRIPT italic\_t end\_POSTSUBSCRIPT is the length of t𝑡titalic\_t and (k1,⋯,kLt)subscript𝑘1⋯subscript𝑘subscript𝐿𝑡(k\_{1},\\cdots,k\_{L\_{t}})( italic\_k start\_POSTSUBSCRIPT 1 end\_POSTSUBSCRIPT , ⋯ , italic\_k start\_POSTSUBSCRIPT italic\_L start\_POSTSUBSCRIPT italic\_t end\_POSTSUBSCRIPT end\_POSTSUBSCRIPT ) is the sequence of concept indices. For each t𝑡titalic\_t, we obtain augmented trajectories through the function Augment⁢(t)Augment𝑡\\text{Augment}(t)Augment ( italic\_t ) defined as:

Augment⁢(t)\=(A⁢(ck1),⋯⁢A⁢(ckLt)),Augment𝑡𝐴subscript𝑐subscript𝑘1⋯𝐴subscript𝑐subscript𝑘subscript𝐿𝑡\\text{Augment}(t)=({A(c\_{k\_{1}}),\\cdots A(c\_{k\_{L\_{t}}})}),Augment ( italic\_t ) = ( italic\_A ( italic\_c start\_POSTSUBSCRIPT italic\_k start\_POSTSUBSCRIPT 1 end\_POSTSUBSCRIPT end\_POSTSUBSCRIPT ) , ⋯ italic\_A ( italic\_c start\_POSTSUBSCRIPT italic\_k start\_POSTSUBSCRIPT italic\_L start\_POSTSUBSCRIPT italic\_t end\_POSTSUBSCRIPT end\_POSTSUBSCRIPT end\_POSTSUBSCRIPT ) ) ,

where A⁢(cki)𝐴subscript𝑐subscript𝑘𝑖A(c\_{k\_{i}})italic\_A ( italic\_c start\_POSTSUBSCRIPT italic\_k start\_POSTSUBSCRIPT italic\_i end\_POSTSUBSCRIPT end\_POSTSUBSCRIPT ) is given by:

A⁢(cki)\={c~ki∼Uniform⁢(𝐍ki)if ⁢ki∈Ikckiotherwise.𝐴subscript𝑐subscript𝑘𝑖casessimilar-tosubscript~𝑐subscript𝑘𝑖Uniformsubscript𝐍subscript𝑘𝑖if subscript𝑘𝑖subscript𝐼𝑘subscript𝑐subscript𝑘𝑖otherwise.A(c\_{k\_{i}})=\\begin{cases}\\tilde{c}\_{k\_{i}}\\sim\\text{Uniform}(\\mathbf{N}\_{k\_{i% }})&\\text{if }k\_{i}\\in I\_{k}\\\\ c\_{k\_{i}}&\\text{otherwise.}\\end{cases}italic\_A ( italic\_c start\_POSTSUBSCRIPT italic\_k start\_POSTSUBSCRIPT italic\_i end\_POSTSUBSCRIPT end\_POSTSUBSCRIPT ) = { start\_ROW start\_CELL over~ start\_ARG italic\_c end\_ARG start\_POSTSUBSCRIPT italic\_k start\_POSTSUBSCRIPT italic\_i end\_POSTSUBSCRIPT end\_POSTSUBSCRIPT ∼ Uniform ( bold\_N start\_POSTSUBSCRIPT italic\_k start\_POSTSUBSCRIPT italic\_i end\_POSTSUBSCRIPT end\_POSTSUBSCRIPT ) end\_CELL start\_CELL if italic\_k start\_POSTSUBSCRIPT italic\_i end\_POSTSUBSCRIPT ∈ italic\_I start\_POSTSUBSCRIPT italic\_k end\_POSTSUBSCRIPT end\_CELL end\_ROW start\_ROW start\_CELL italic\_c start\_POSTSUBSCRIPT italic\_k start\_POSTSUBSCRIPT italic\_i end\_POSTSUBSCRIPT end\_POSTSUBSCRIPT end\_CELL start\_CELL otherwise. end\_CELL end\_ROW

Here, Iksubscript𝐼𝑘I\_{k}italic\_I start\_POSTSUBSCRIPT italic\_k end\_POSTSUBSCRIPT indicates the set of randomly chosen concept indices from t𝑡titalic\_t and Uniform⁢(𝐍ki)Uniformsubscript𝐍subscript𝑘𝑖\\text{Uniform}(\\mathbf{N}\_{k\_{i}})Uniform ( bold\_N start\_POSTSUBSCRIPT italic\_k start\_POSTSUBSCRIPT italic\_i end\_POSTSUBSCRIPT end\_POSTSUBSCRIPT ) denotes a uniform random selection from the neighbor set 𝐍kisubscript𝐍subscript𝑘𝑖\\mathbf{N}\_{k\_{i}}bold\_N start\_POSTSUBSCRIPT italic\_k start\_POSTSUBSCRIPT italic\_i end\_POSTSUBSCRIPT end\_POSTSUBSCRIPT.

## 4 Experiments

### 4.1 Data Curation

We used inpatient data from MIMIC-IV, EHRSHOT, and SNUH. MIMIC-IV was converted to the format of OMOP CDM before the experiments. EHRSHOT and SNUH are OMOP CDM-based EHR datasets. The baseline characteristics of included datasets are summarized in Table [1](https://arxiv.org/html/2504.08329v1#S4.T1 "Table 1 ‣ 4.1 Data Curation ‣ 4 Experiments ‣ MedRep: Medical Concept Representation for General Electronic Health Record Foundation Models") and the discrepancy of vocabularies is exhibited in Table [2](https://arxiv.org/html/2504.08329v1#S4.T2 "Table 2 ‣ 4.1 Data Curation ‣ 4 Experiments ‣ MedRep: Medical Concept Representation for General Electronic Health Record Foundation Models"). We used four domains of OMOP CDM schema: condition, drug, measurement, and procedure. The concepts from condition, drug, and procedure were tokenized into corresponding indices. For measurement concepts without numerical value, they were tokenized in the same way as condition, drug, and procedure concepts. Each measurement concept with numerical values was divided into deciles and a corresponding decile number between 0 and 9 was appended to the concept ID and the concept name. Since measurements like vital signs are recorded very frequently, they can result in excessively long trajectories with less information. To manage this, we extracted one measurement per hour. Patient trajectory construction process is described in Appendix [A.2](https://arxiv.org/html/2504.08329v1#A1.SS2 "A.2 Trajectory Construction ‣ Appendix A Details on Data Preparation ‣ MedRep: Medical Concept Representation for General Electronic Health Record Foundation Models").

Table 1: Baseline characteristics of datasets.

MIMIC-IV

EHRSHOT

SNUH

\# of patients

257,992

4,403

8,616

\# of records

1,114,054,364

2,942,281

3,875,166

\# of visits

2,468,013

116,060

145,177

\# of concept IDs

26,894

26,303

31,053

Age, Mean (SD)

52.54 (20.89)

52.33 (17.31)

52.38 (16.84)

Male sex

62.87%

54.60%

53.54%

Incidence rate (MT)

3.68%

6.56%

2.81%

Incidence rate (LLOS)

30.90%

27.00%

31.07%

Incidence rate (RA)

2.11%

9.45%

7.57%

Table 2: The number of shared concept IDs and the proportion of unknown concept IDs between institutions. For unknown concept IDs, A ←←\\leftarrow← B indicates the proportion of unknown concept IDs in all trajectories from hospital A under the vocabulary of hospital B.

Number of shared concept IDs

Proportion of unknown concept IDs

MIMIC-IV + EHRSHOT

14,349

EHRSHOT ←←\\leftarrow← MIMIC-IV

18.79%

MIMIC-IV + SNUH

8,032

SNUH ←←\\leftarrow← MIMIC-IV

35.86%

### 4.2 Baseline Models

We used four baseline models: RETAIN (Choi et al., [2017](https://arxiv.org/html/2504.08329v1#bib.bib4)), BEHRT (Li et al., [2020](https://arxiv.org/html/2504.08329v1#bib.bib18)), BEHRT-DE (Kim et al., [2024b](https://arxiv.org/html/2504.08329v1#bib.bib14)), and MedBERT (Rasmy et al., [2021](https://arxiv.org/html/2504.08329v1#bib.bib29)). RETAIN is a basic deep learning model for EHR that does not require pretraining process. BEHRT, BEHRT-DE, and MedBERT are MLM-based EHR foundation models. We evaluated the downstream task performance of various EHR deep learning models with MedRep, with MedTok, and without pretrained concept representations. All baseline models except RETAIN were pretrained with the configurations of the original works.

The baseline models were trained only by the development dataset of MIMIC-IV and were validated by the hold-out test dataset of MIMIC-IV and the whole datasets of EHRSHOT and SNUH. MIMIC-IV data were randomly split into development (70% for training and 15% for validation) and hold-out test (15%) datasets. Each baseline model was pretrained with the configuration of its original work. Details on implementation are summarized in Appendix [B.1](https://arxiv.org/html/2504.08329v1#A2.SS1 "B.1 Baseline models ‣ Appendix B Details on Implementation ‣ MedRep: Medical Concept Representation for General Electronic Health Record Foundation Models").

### 4.3 Downstream Tasks

For downstream tasks, in-hospital mortality (MT), long length of stay (LLOS), and readmission (RA) were selected as previous related works (Guo et al., [2023](https://arxiv.org/html/2504.08329v1#bib.bib7), [2024](https://arxiv.org/html/2504.08329v1#bib.bib8); Su et al., [2025](https://arxiv.org/html/2504.08329v1#bib.bib34)). MT, LLOS, and RA are defined as death occurrence during hospitalization, a hospital stay of more than a week, and readmission within 30 days after discharge, respectively. The prediction timepoint for MT and LLOS was the midnight of the admission date, and for RA, it was the midnight of the discharge date for each patient.

### 4.4 MedRep and MedTok

For concept representation learning, we trained 1,820,287 OMOP concepts (1,978,735 expanded concepts with measurement deciles) which are linked with the concepts included in the vocabularies of MIMIC-IV, EHRSHOT, and SNUH. The trained concepts are belong to various medical vocabularies and the concept counts for vocabularies are summarized in Table [7](https://arxiv.org/html/2504.08329v1#A2.T7 "Table 7 ‣ B.2 MedRep and MedTok ‣ Appendix B Details on Implementation ‣ MedRep: Medical Concept Representation for General Electronic Health Record Foundation Models") in Appendix [B.2](https://arxiv.org/html/2504.08329v1#A2.SS2 "B.2 MedRep and MedTok ‣ Appendix B Details on Implementation ‣ MedRep: Medical Concept Representation for General Electronic Health Record Foundation Models"). For trajectory augmentation in MedRep, we extracted the 30 closest neighbors for each concept. Since the optimal augmentation factor may differ by models and tasks, we conducted experiments with trajectories augmented at factors of 2, 3, 5, 10, 15, and 20. We selected the optimal augmentation factor for each model and downstream task according to the internal validation performance, and used the selected models for external validation. MedTok requires medical code description and local subgraph for each medical code. As our study used different EHR format and medical code set from the original work of MedTok, we utilized our pretrained text-based representations and the relational graph from OMOP vocabulary, instead of description text and PrimeKG (Chandak et al., [2023](https://arxiv.org/html/2504.08329v1#bib.bib3)).

### 4.5 Model Performance

Table [3](https://arxiv.org/html/2504.08329v1#S4.T3 "Table 3 ‣ 4.5 Model Performance ‣ 4 Experiments ‣ MedRep: Medical Concept Representation for General Electronic Health Record Foundation Models") presents the performance of downstream tasks with the area under the receiver operating characteristic curve (AUROC) and F1-score. F1-score was calculated with the threshold determined by Youden’s Index, which maximized the sum of sensitivity and specificity. Except RETAIN, both MedRep and MedTok improved the external validation performance, suggesting that pretrained concept representations mitigate the performance decline caused by differences in data distribution. MedRep outperformed MedTok in both internal and external validation across all the baselines. MedRep’s trajectory augmentation strengthened model consistency. The whole results are summarized in Table [8](https://arxiv.org/html/2504.08329v1#A3.T8 "Table 8 ‣ Appendix C Supplementary Results ‣ MedRep: Medical Concept Representation for General Electronic Health Record Foundation Models") in Appendix [C](https://arxiv.org/html/2504.08329v1#A3 "Appendix C Supplementary Results ‣ MedRep: Medical Concept Representation for General Electronic Health Record Foundation Models").

Table 3: The average performance of downstream tasks. The results of long length of stay prediction models for SNUH were excluded because all models hardly operated with AUROC less than 0.6.

All

Internal

External

AUROC

F1-score

AUROC

F1-score

AUROC

F1-score

RETAIN

0.7067

0.2772

0.7777

0.3045

0.6641

0.2608

RETAIN+MedTok

0.6520

0.2272

0.6746

0.2409

0.6383

0.2190

RETAIN+MedRep

0.7148

0.2876

0.7920

0.3207

0.3207

0.2678

BEHRT

0.7732

0.3130

0.8534

0.3576

0.7251

0.2862

BEHRT+MedTok

0.7865

0.3187

0.8487

0.3478

0.7492

0.3012

BEHRT+MedRep

0.7959

0.3273

0.8627

0.3636

0.7559

0.3055

BEHRT-DE

0.7736

0.3132

0.8538

0.3580

0.7255

0.2864

BEHRT-DE+MedTok

0.7918

0.3305

0.8483

0.3612

0.7579

0.3121

BEHRT-DE+MedRep

0.7994

0.3412

0.8659

0.3720

0.7594

0.3227

Med-BERT

0.7675

0.3087

0.8550

0.3581

0.7149

0.2790

Med-BERT+MedTok

0.7954

0.3235

0.8514

0.3596

0.7618

0.3018

Med-BERT+MedRep

0.8060

0.3420

0.8647

0.3819

0.7707

0.3181

### 4.6 Ablation Studies

We first evaluated the impact of complementing text-based representations through graph ontology and the effect of applying trajectory augmentation. This was based on the results of Med-BERT, which demonstrated the best overall performance. As shown in Table [4](https://arxiv.org/html/2504.08329v1#S4.T4 "Table 4 ‣ 4.6 Ablation Studies ‣ 4 Experiments ‣ MedRep: Medical Concept Representation for General Electronic Health Record Foundation Models"), the text-based representations improved performance. However, when combined with the relational graph, the performance was worsened. Similarly, applying trajectory augmentation alone increased F1-score but resulted in a lower AUROC. For MedRep, using graph-enhanced text representations and trajectory augmentation together, the performance was maximized. This implies that trajectory augmentation better reflected the general clinical information with relational information of concepts.

Table 4: The average performance of ablation studies. LLM indicates using text-based representations and Graph indicates using representations complemented with relational graph. The results of long length of stay prediction models for SNUH were excluded because all models hardly operated with AUROC less than 0.6.

LLM

Graph

Augmentation

AUROC

F1-score

✗

✗

✗

0.7675

0.3087

✓

✗

✗

0.7882

0.3270

✓

✓

✗

0.7827

0.3242

✓

✗

✓

0.7859

0.3303

✓

✓

✓

0.8060

0.3420

Next, we explored the performance variation according to the augmentation factor across all experiments. As shown in Figure [3](https://arxiv.org/html/2504.08329v1#S4.F3 "Figure 3 ‣ 4.6 Ablation Studies ‣ 4 Experiments ‣ MedRep: Medical Concept Representation for General Electronic Health Record Foundation Models"), the adoption of trajectory augmentation guarantees the improvement of external validation performance. While both MedTok and MedRep improved the external validation performance, our approach maintained or improved the internal validation performance compared to MedTok. When the augmentation factor was set to 5, the external validation performance was maximized, while the internal validation performance also remained stable.

![Refer to caption](extracted/6353117/images/ablation.png)

Figure 3: Performance of the models with various augmentation factors.

## 5 Discussion

In this study, we proposed MedRep with concept representation learning and trajectory augmentation to improve the generality of EHR foundation models. We leveraged LLM prompts and the graph ontology of OMOP vocabulary to yield general concept representations and demonstrated the effectiveness of trajectory augmentation. MedRep consistently improved the performance of various baseline EHR foundation models for predicting medical events and better maintained the original performance in external validation.

Nowadays, most medical institutions are adopting EHR, and enormous health data are accumulated every day. Despite the abundance of EHR data, analyzing merged EHR data from different institutions is hardly available due to the risk of privacy invasion. Without access to external data, trajectory augmentation can be an option to enhance the generality of EHR-based machine learning models, indirectly supplying data out-of-distribution. In addition, OMOP CDM has been applied to a lot of medical institutions, and EHR foundation models trained by OMOP CDM data can be shared across institutions. Exporting only the weights of the model parameters is not usually restricted. EHR foundation models trained by the same concept representations can cooperate to achieve general performance for various medical tasks. Thus, MedRep can play a role as a baseline representation for a large EHR foundation model.

#### Limitations

First, we only used around 1.8M concepts due to time and cost constraints, even though more than 9M concepts exist in OMOP vocabulary. We are planning to distribute the full version of concept representations for OMOP vocabulary. Second, we did not used the observation table from OMOP CDM. The observation table contains clinical facts obtained in the context of examination, questioning, or a procedure and any data that cannot be represented by existing domains, such as social and lifestyle facts, medical history, and family history. The data of observation table usually consists of unstructured plain texts and there is no standard for mapping those various records into standardized concepts. Representing and integrating these records into EHR foundation models remains an area for future work. Third, more advanced augmentation strategies should be explored. In this study, we demonstrated the efficacy of trajectory augmentation using a simple concept replacement method. However, more sophisticated techniques could better understand unseen data distributions and further improve the generalizability of EHR foundation models. As we released the concept representations used in this study, we leave development of advanced augmentation strategies for a future work.

## Acknowledgments

This research was supported and funded by SNUH Lee Kun-hee Child Cancer & Rare Disease Project, Republic of Korea (grant number : 22A-000-0000). Junmo Kim is supported by a fellowship program of the AI Institute at Seoul National University.

Table 5: Prompt for each domain of OMOP vocabulary and example descriptions.

Domain

Prompt (with example concept)

Description

Condition

Instruction: Briefly explain the clinical background and regarding treatments of each concept name (condition) with less than 5 sentences. Do not include sentences that are too ordinary (such as ”further details would depend on the specific situation) and focus on describing the representative clinical features of the concept. Concept name: Neutropenic fever

Neutropenic fever occurs in patients with neutropenia, characterized by an abnormally low level of neutrophils, often due to chemotherapy, bone marrow disorders, or immunosuppression. Clinically, it presents as a fever, which can be the only sign of infection in these patients due to their compromised immune response. The absence of typical signs of infection, such as pus formation or localized symptoms, can make diagnosis challenging. Treatment involves prompt administration of broad-spectrum antibiotics to mitigate the risk of severe infections, and in some cases, granulocyte-colony stimulating factors (G-CSF) may be used to expedite neutrophil recovery. Monitoring for potential complications, such as sepsis, is crucial in the management of neutropenic fever.

Drug

Instruction: Briefly explain the clinical background and purpose of each concept name (drug) with less than 5 sentences. Do not include sentences that are too ordinary (such as ”further details would depend on the specific situation) and focus on describing the representative clinical features of the concept. For explanation, if it exists in the concept name, take into account the detailed items of the concept such as ingredient, dosage form, and strength. If several drugs are contained in a concept, do not explain those drugs separately, but explain the concept name comprehensively and finish the answer with less than 5 sentences. Concept name: Aspirin 100 MG Oral Tablet \[Aspirin\]

Aspirin 100 MG Oral Tablet is a low-dose formulation of acetylsalicylic acid, primarily used for its antiplatelet effects to reduce the risk of cardiovascular events such as heart attacks and strokes. This dosage is particularly effective in the long-term management of patients with a history of cardiovascular disease or those at high risk. Additionally, aspirin has anti-inflammatory and analgesic properties, making it useful in managing certain inflammatory conditions and mild to moderate pain. The 100 MG strength is often chosen to minimize gastrointestinal side effects while providing adequate antithrombotic benefits. Regular use under a healthcare provider’s guidance is crucial for balancing benefits and potential risks.

Measurement

Instruction: Briefly explain the clinical background and context of each concept name (measurement) with less than 5 sentences. Do not include sentences that are too ordinary (such as ”further details would depend on the specific situation) and focus on describing the representative clinical features of the concept. For explanation, if it exists in the concept name, describe what the decile means clinically. Concept name: Glycated haemoglobin (HbA1c) (9th decile)

Glycated hemoglobin (HbA1c) is a measure of average blood glucose levels over the past two to three months, reflecting long-term glycemic control in individuals with diabetes. A value in the 9th decile typically indicates a HbA1c level of approximately 8.0% to 9.0%, suggesting poorly controlled diabetes and an increased risk for microvascular and macrovascular complications, such as retinopathy and cardiovascular disease. Clinically, this decile serves as a critical threshold for considering more aggressive therapeutic interventions, including medication adjustments and comprehensive diabetes management strategies. Monitoring HbA1c in this range underscores the importance of lifestyle modifications and personalized treatment plans to improve glycemic control and reduce long-term health risks.

Procedure

Instruction: Briefly explain the clinical background and purpose of each concept name (procedure) with less than 5 sentences. Do not include sentences that are too ordinary (such as ”further details would depend on the specific situation) and focus on describing the representative clinical features of the concept. Concept name: Holter extended electrocardiographic recording

Holter extended electrocardiographic recording is a continuous monitoring technique that captures the heart’s electrical activity over 24 to 48 hours using a portable ECG device. This procedure is essential for diagnosing arrhythmias, assessing symptoms like palpitations, and evaluating the efficacy of antiarrhythmic medications. Patients wear the device during their daily activities, allowing for a comprehensive assessment of heart rhythm in real-life settings rather than just during a brief clinical visit. Analysis of the recorded data can reveal transient abnormalities or patterns that might not be evident during a standard ECG.

## References

-   Bornet et al. (2025) Alban Bornet, Dimitrios Proios, Anthony Yazdani, Fernando Jaume Santero, Guy Haller, Edward Choi, and Douglas Teodoro. Comparing neural language models for medical concept representation and patient trajectory prediction. _Artificial Intelligence in Medicine_, page 103108, 2025.
-   Chan et al. (2024) Tsai Hor Chan, Guosheng Yin, Kyongtae Bae, and Lequan Yu. Multi-task heterogeneous graph learning on electronic health records. _Neural Networks_, 180:106644, 2024.
-   Chandak et al. (2023) Payal Chandak, Kexin Huang, and Marinka Zitnik. Building a knowledge graph to enable precision medicine. _Scientific Data_, 10(1):67, 2023.
-   Choi et al. (2017) Edward Choi, Mohammad Taha Bahadori, Joshua A. Kulas, Andy Schuetz, Walter F. Stewart, and Jimeng Sun. Retain: An interpretable predictive model for healthcare using reverse time attention mechanism, 2017. URL [https://arxiv.org/abs/1608.05745](https://arxiv.org/abs/1608.05745).
-   Devlin et al. (2019) Jacob Devlin, Ming-Wei Chang, Kenton Lee, and Kristina Toutanova. Bert: Pre-training of deep bidirectional transformers for language understanding. In _Proceedings of the 2019 conference of the North American chapter of the association for computational linguistics: human language technologies, volume 1 (long and short papers)_, pages 4171–4186, 2019.
-   Donnelly et al. (2006) Kevin Donnelly et al. Snomed-ct: The advanced terminology and coding system for ehealth. _Studies in health technology and informatics_, 121:279, 2006.
-   Guo et al. (2023) Lin Lawrence Guo, Ethan Steinberg, Scott Lanyon Fleming, Jose Posada, Joshua Lemmon, Stephen R. Pfohl, Nigam Shah, Jason Fries, and Lillian Sung. Ehr foundation models improve robustness in the presence of temporal distribution shift. _Scientific Reports_, 13(1):3767, 2023.
-   Guo et al. (2024) Lin Lawrence Guo, Jason Fries, Ethan Steinberg, Scott Lanyon Fleming, Keith Morse, Catherine Aftandilian, Jose Posada, Nigam Shah, and Lillian Sung. A multi-center study on the adaptability of a shared foundation model for electronic health records. _NPJ Digital Medicine_, 7(1):171, 2024.
-   He et al. (2015) Kaiming He, Xiangyu Zhang, Shaoqing Ren, and Jian Sun. Delving deep into rectifiers: Surpassing human-level performance on imagenet classification. In _Proceedings of the IEEE international conference on computer vision_, pages 1026–1034, 2015.
-   He et al. (2020) Pengcheng He, Xiaodong Liu, Jianfeng Gao, and Weizhu Chen. Deberta: Decoding-enhanced bert with disentangled attention. _arXiv preprint arXiv:2006.03654_, 2020.
-   Huang et al. (2023) David Huang, Steven Cogill, Renee Y Hsia, Samuel Yang, and David Kim. Development and external validation of a pretrained deep learning model for the prediction of non-accidental trauma. _npj Digital Medicine_, 6(1):131, 2023.
-   Johnson et al. (2023) Alistair EW Johnson, Lucas Bulgarelli, Lu Shen, Alvin Gayles, Ayad Shammout, Steven Horng, Tom J Pollard, Sicheng Hao, Benjamin Moody, Brian Gow, et al. Mimic-iv, a freely accessible electronic health record dataset. _Scientific data_, 10(1):1, 2023.
-   Kim et al. (2024a) Junmo Kim, Joo Seong Kim, Sae-Hoon Kim, Sooyoung Yoo, Jun Kyu Lee, and Kwangsoo Kim. Deep learning-based prediction of clostridioides difficile infection caused by antibiotics using longitudinal electronic health records. _NPJ Digital Medicine_, 7(1):224, 2024a.
-   Kim et al. (2024b) Junmo Kim, Joo Seong Kim, Ji-Hyang Lee, Min-Gyu Kim, Taehyun Kim, Chaeeun Cho, Rae Woong Park, and Kwangsoo Kim. Pretrained patient trajectories for adverse drug event prediction using common data model-based electronic health records. _medRxiv_, pages 2024–09, 2024b.
-   Kipf and Welling (2016) Thomas N Kipf and Max Welling. Semi-supervised classification with graph convolutional networks. _arXiv preprint arXiv:1609.02907_, 2016.
-   Lee et al. (2022) Kyehwa Lee, Libga Seo, Dukyong Yoon, Kwangmo Yang, Jae-Eun Yi, Yoomi Kim, and Jae-Ho Lee. Digital health profile of south korea: a cross sectional study. _International journal of environmental research and public health_, 19(10):6329, 2022.
-   Lewis et al. (2019) Mike Lewis, Yinhan Liu, Naman Goyal, Marjan Ghazvininejad, Abdelrahman Mohamed, Omer Levy, Ves Stoyanov, and Luke Zettlemoyer. Bart: Denoising sequence-to-sequence pre-training for natural language generation, translation, and comprehension. _arXiv preprint arXiv:1910.13461_, 2019.
-   Li et al. (2020) Yikuan Li, Shishir Rao, José Roberto Ayala Solares, Abdelaali Hassaine, Rema Ramakrishnan, Dexter Canoy, Yajie Zhu, Kazem Rahimi, and Gholamreza Salimi-Khorshidi. Behrt: transformer for electronic health records. _Scientific reports_, 10(1):7155, 2020.
-   Li et al. (2022) Yikuan Li, Mohammad Mamouei, Gholamreza Salimi-Khorshidi, Shishir Rao, Abdelaali Hassaine, Dexter Canoy, Thomas Lukasiewicz, and Kazem Rahimi. Hi-behrt: hierarchical transformer-based model for accurate prediction of clinical events using multimodal longitudinal electronic health records. _IEEE journal of biomedical and health informatics_, 27(2):1106–1117, 2022.
-   Li and Hoiem (2017) Zhizhong Li and Derek Hoiem. Learning without forgetting. _IEEE transactions on pattern analysis and machine intelligence_, 40(12):2935–2947, 2017.
-   Liang et al. (2021) Jun Liang, Ying Li, Zhongan Zhang, Dongxia Shen, Jie Xu, Xu Zheng, Tong Wang, Buzhou Tang, Jianbo Lei, and Jiajie Zhang. Adoption of electronic health records (ehrs) in china during the past 10 years: consecutive survey data analysis and comparison of sino-american challenges and experiences. _Journal of medical Internet research_, 23(2):e24813, 2021.
-   Liu et al. (2005) Simon Liu, Wei Ma, Robin Moore, Vikraman Ganesan, and Stuart Nelson. Rxnorm: prescription for electronic drug information exchange. _IT professional_, 7(5):17–23, 2005.
-   McDonald et al. (2003) Clement J McDonald, Stanley M Huff, Jeffrey G Suico, Gilbert Hill, Dennis Leavelle, Raymond Aller, Arden Forrey, Kathy Mercer, Georges DeMoor, John Hook, et al. Loinc, a universal standard for identifying laboratory observations: a 5-year update. _Clinical chemistry_, 49(4):624–633, 2003.
-   Pang et al. (2021) Chao Pang, Xinzhuo Jiang, Krishna S Kalluri, Matthew Spotnitz, RuiJun Chen, Adler Perotte, and Karthik Natarajan. Cehr-bert: Incorporating temporal information from structured ehr data to improve prediction tasks. In _Machine Learning for Health_, pages 239–260. PMLR, 2021.
-   Parasrampuria and Henry (2019) Sonal Parasrampuria and Jawanna Henry. Hospitals’ use of electronic health records data, 2015–2017. _ONC Data Brief_, 46(1):13, 2019.
-   Poulain and Beheshti (2024) Raphael Poulain and Rahmatollah Beheshti. Graph transformers on ehrs: Better representation improves downstream performance. In _The Twelfth International Conference on Learning Representations_, 2024.
-   Prakash et al. (2021) PKS Prakash, Srinivas Chilukuri, Nikhil Ranade, and Shankar Viswanathan. Rarebert: transformer architecture for rare disease patient identification using administrative claims. In _Proceedings of the AAAI conference on artificial intelligence_, volume 35, pages 453–460, 2021.
-   Quan et al. (2005) Hude Quan, Vijaya Sundararajan, Patricia Halfon, Andrew Fong, Bernard Burnand, Jean-Christophe Luthi, L Duncan Saunders, Cynthia A Beck, Thomas E Feasby, and William A Ghali. Coding algorithms for defining comorbidities in icd-9-cm and icd-10 administrative data. _Medical care_, 43(11):1130–1139, 2005.
-   Rasmy et al. (2021) Laila Rasmy, Yang Xiang, Ziqian Xie, Cui Tao, and Degui Zhi. Med-bert: pretrained contextualized embeddings on large-scale structured electronic health records for disease prediction. _NPJ digital medicine_, 4(1):86, 2021.
-   Renc et al. (2024) Pawel Renc, Yugang Jia, Anthony E Samir, Jaroslaw Was, Quanzheng Li, David W Bates, and Arkadiusz Sitek. Zero shot health trajectory prediction using transformer. _NPJ Digital Medicine_, 7(1):256, 2024.
-   Schick and Schütze (2020) Timo Schick and Hinrich Schütze. Exploiting cloze questions for few shot text classification and natural language inference. _arXiv preprint arXiv:2001.07676_, 2020.
-   Shang et al. (2019) Junyuan Shang, Tengfei Ma, Cao Xiao, and Jimeng Sun. Pre-training of graph augmented transformers for medication recommendation. _arXiv preprint arXiv:1906.00346_, 2019.
-   Stang et al. (2010) Paul E Stang, Patrick B Ryan, Judith A Racoosin, J Marc Overhage, Abraham G Hartzema, Christian Reich, Emily Welebob, Thomas Scarnecchia, and Janet Woodcock. Advancing the science for active surveillance: rationale and design for the observational medical outcomes partnership. _Annals of internal medicine_, 153(9):600–606, 2010.
-   Su et al. (2025) Xiaorui Su, Shvat Messica, Yepeng Huang, Ruth Johnson, Lukas Fesser, Shanghua Gao, Faryad Sahneh, and Marinka Zitnik. Multimodal medical code tokenizer. _arXiv preprint arXiv:2502.04397_, 2025.
-   Wornow et al. (2023) Michael Wornow, Rahul Thapa, Ethan Steinberg, Jason Fries, and Nigam Shah. Ehrshot: An ehr benchmark for few-shot evaluation of foundation models. _Advances in Neural Information Processing Systems_, 36:67125–67137, 2023.
-   Yang et al. (2023) Zhichao Yang, Avijit Mitra, Weisong Liu, Dan Berlowitz, and Hong Yu. Transformehr: transformer-based encoder-decoder generative model to enhance prediction of disease outcomes using electronic health records. _Nature communications_, 14(1):7857, 2023.
-   Zhang et al. (2023a) Haijun Zhang, Xian Yang, Liang Bai, and Jiye Liang. Enhancing drug recommendations via heterogeneous graph representation learning in ehr networks. _IEEE Transactions on Knowledge and Data Engineering_, 36(7):3024–3035, 2023a.
-   Zhang et al. (2023b) Yifei Zhang, Hao Zhu, Zixing Song, Piotr Koniusz, Irwin King, et al. Mitigating the popularity bias of graph collaborative filtering: A dimensional collapse perspective. _Advances in Neural Information Processing Systems_, 36:67533–67550, 2023b.
-   Zhu et al. (2020) Yanqiao Zhu, Yichen Xu, Feng Yu, Qiang Liu, Shu Wu, and Liang Wang. Deep graph contrastive representation learning. _arXiv preprint arXiv:2006.04131_, 2020.

## Appendix A Details on Data Preparation

### A.1 Prompt Design

Table [5](https://arxiv.org/html/2504.08329v1#Sx1.T5 "Table 5 ‣ Acknowledgments ‣ MedRep: Medical Concept Representation for General Electronic Health Record Foundation Models") outlines the prompt used for each domain in this study. Each prompt was designed to query the model about clinical background of given concept name without too ordinary sentences like “further details would depend on the specific situation”. As drug concepts may include the ingredient, dosage form, and strength, the prompt was formulated to ask the meanings of these attributes. For measurement, we added decile information on concepts with numerical values. In these cases, the prompt was structured to query the model about what the decile means clinically.

### A.2 Trajectory Construction

Each patient trajectory contains integer sequences of medical concepts, age indices, visit indices, record indices, and domain indices, which are sorted in order of time. Each medical concept and age index refer to the corresponding concept and age. Every visit possesses its index and the record index increments by 1 each day for each visit. Thus, for each patient, the visit index starts with 1, and for every visit, the record index starts with 1. The domain index (ranging from 0 to 4) is assigned to every concept according to its domain (special token, condition, drug, measurement, and procedure). For each concept, the embeddings for indices of the concept itself, age, visit, and record are summed and fed into the baseline models. The embedding of domain is used only in BEHRT-DE. The maximum length of trajectory is set to 2048. Every trajectory starts with the \[CLS\] token, and is divided with the \[SEP\] token for every visit. All trajectories are padded by the \[PAD\] token with the maximum length of 2048.

### A.3 IRB Approval

The Institutional Review Board (IRB) of Seoul National University Hospital (IRB approval No. 2406-060-1543) approved the study with a waiver of informed consent, considering that our study used retrospective and observational EHR data. The approval aligns with the principles outlined in the Declaration of Helsinki, the Korean Bioethics and Safety Act (Law No. 16372), and the Human Research Protection Program–Standard Operating Procedure of Seoul National University Hospital.

## Appendix B Details on Implementation

### B.1 Baseline models

The configurations of baseline models are summarized in Table [6](https://arxiv.org/html/2504.08329v1#A2.T6 "Table 6 ‣ B.1 Baseline models ‣ Appendix B Details on Implementation ‣ MedRep: Medical Concept Representation for General Electronic Health Record Foundation Models"). The trajectories with more than 2048 concepts are sliced into non-overlapping sub-trajectories with the maximum length to prevent potential dependency among trajectories from a single patient. We selected the pretraining models with the lowest MLM loss during 50 epochs. AdamW optimizer was adopted for parameter update with a weight decay of 0.01. Pretraining was executed with 8 NVIDIA RTX A6000 GPUs for 2-3 days for each model.

For finetuning, the records before the prediction timepoint were utilized for prediction tasks, with the maximum length of trajectory 2048. For pretrained baseline models, a fully-connected layer-based classification head was combined to predict the outcomes. As the incidence rates of MT and RA are relatively low, we applied oversampling scaler to ensure that at least 3 case data are contained in the batch (10% of batch size 32). We validated the model performance for every 20% of the total number of batches and if the performance did not increase for 10 times, the finetuning process was terminated with early stopping. Each finetuning task was executed with a single NVIDIA RTX A6000 GPU for 4-8 hours. All implementations were conducted using torch (version 2.6.0) and HuggingFace package transformers (version 4.49.0) in Python (version 3.9.19).

Table 6: Configurations of baseline models.

RETAIN

BEHRT

BEHRT-DE

Med-BERT

Batch size

32

32

32

32

Learning rate

5×10−55superscript1055\\times 10^{-5}5 × 10 start\_POSTSUPERSCRIPT - 5 end\_POSTSUPERSCRIPT

5×10−55superscript1055\\times 10^{-5}5 × 10 start\_POSTSUPERSCRIPT - 5 end\_POSTSUPERSCRIPT

5×10−55superscript1055\\times 10^{-5}5 × 10 start\_POSTSUPERSCRIPT - 5 end\_POSTSUPERSCRIPT

5×10−55superscript1055\\times 10^{-5}5 × 10 start\_POSTSUPERSCRIPT - 5 end\_POSTSUPERSCRIPT

Maximum epoch

50

50

50

50

Masked ratio

n/a

0.3

0.3

0.3

The input size of embedding layer

Age

120

120

120

120

Visit

2048

2048

2048

2048

Record

2048

2048

2048

2048

Domain

n/a

n/a

5

n/a

Hidden size

768

768

768

768

Number of self-attention (or RNN) layer

6

6

6

6

Number of attention heads

n/a

12

12

6

### B.2 MedRep and MedTok

The concept counts for the vocabularies used in our study are summarized in Table [7](https://arxiv.org/html/2504.08329v1#A2.T7 "Table 7 ‣ B.2 MedRep and MedTok ‣ Appendix B Details on Implementation ‣ MedRep: Medical Concept Representation for General Electronic Health Record Foundation Models"). The representations for LLM-attributed descriptions were pretrained using DeBERTa with the initialized weights from HuggingFace. For GRACE, we used two-layer graph convolutional networks (GCN) (Kipf and Welling, [2016](https://arxiv.org/html/2504.08329v1#bib.bib15)) for message passing and pReLU (He et al., [2015](https://arxiv.org/html/2504.08329v1#bib.bib9)) for activation function. Batch size, learning rate, hidden size, Dropout rate, DropEdge rate, and temperature parameter (τ𝜏\\tauitalic\_τ) were set to 2048, 5×10−45superscript1045\\times 10^{-4}5 × 10 start\_POSTSUPERSCRIPT - 4 end\_POSTSUPERSCRIPT, 0.2, 0.2, and 0.5, respectively. For the maximum 200 iterations, the contrastive learning process was terminated if the loss did not decrease for more than 20 iterations.

As we learned representations of more than 1.9M concepts, allocating the whole feature matrix and adjacency matrix in memory was not possible. Instead, for each batch, we extracted 30, 20, and 10 neighbors for 1-hop, 2-hop, and 3-hop connections from the selected nodes to yield a subgraph GBatchsubscript𝐺BatchG\_{\\text{Batch}}italic\_G start\_POSTSUBSCRIPT Batch end\_POSTSUBSCRIPT, where Batch⊂𝒞Batch𝒞\\text{Batch}\\subset\\mathcal{C}Batch ⊂ caligraphic\_C. The message passing and parameter update of g𝑔gitalic\_g was executed with 𝐗c∈Batchsubscript𝐗𝑐Batch\\mathbf{X}\_{c\\in\\text{Batch}}bold\_X start\_POSTSUBSCRIPT italic\_c ∈ Batch end\_POSTSUBSCRIPT, 𝐀i,j∈Batchsubscript𝐀𝑖𝑗Batch\\mathbf{A}\_{i,j\\in\\text{Batch}}bold\_A start\_POSTSUBSCRIPT italic\_i , italic\_j ∈ Batch end\_POSTSUBSCRIPT. For GNN implementation in MedRep and MedTok, we used torch-geometric (version 2.6.1), torch\_scatter (version 2.1.2), and torch\_sparse (version 0.6.18).

Table 7: Concept counts for the vocabularies used in our study.

Vocabulary

Count

Vocabulary

Count

Vocabulary

Count

NDC

581210

NDFRT

9933

CTD

968

RxNorm Extension

384261

LOINC

9138

EDI

930

SNOMED

164230

VANDF

7699

BDPM

896

SPL

126809

AMT

6280

KDC

649

ICD10CM

78981

dm+d

6155

DPD

607

RxNorm

72219

GCN\_SEQNO

6149

HCPCS

592

ICD10PCS

63652

MeSH

4601

Cancer Modifier

555

Nebraska Lexicon

59333

OXMIS

4171

GGR

441

ICDO3

53269

Multum

4133

OncoTree

400

Read

31244

OPS

3793

OMOP Extension

319

ICD10CN

26645

ICD9Proc

3676

HemOnc

255

CIEL

17350

NCCD

2833

CVX

100

ICD10GM

14396

OPCS4

2761

UK Biobank

54

ICD9CM

13363

JMDC

1926

Cohort

51

CIM10

12515

SNOMED Veterinary

1821

NCIt

34

KCD7

12235

SUS

1747

CO-CONNECT

22

ICD10

12156

ATC

1462

PPI

14

ICD9ProcCN

10194

OMOP Invest Drug

1051

CO-CONNECT TWINS

9

## Appendix C Supplementary Results

The results of all experiments are summarized in Table [8](https://arxiv.org/html/2504.08329v1#A3.T8 "Table 8 ‣ Appendix C Supplementary Results ‣ MedRep: Medical Concept Representation for General Electronic Health Record Foundation Models").

Table 8: Performance of all downstream tasks. Model name+number means the model with the augmentation factor of the number. The model with bold text indicates the selected model with the highest AUROC in internal validation.

MT (AUROC)

LLOS (AUROC)

RA (AUROC)

Internal

External

Internal

External

Internal

External

MIMIC-IV

EHRSHOT

SNUH

MIMIC-IV

EHRSHOT

SNUH

MIMIC-IV

EHRSHOT

SNUH

RETAIN

0.8724

0.8061

0.7034

0.7698

0.6722

0.5366

0.6909

0.6203

0.5183

RETAIN+MedTok

0.7451

0.6474

0.6905

0.6650

0.6141

0.5517

0.6137

0.6736

0.5662

RETAIN+MedRep+2

0.8952

0.7420

0.6331

0.8008

0.6586

0.5173

0.6446

0.6930

0.5969

RETAIN+MedRep+3

0.8953

0.7558

0.6804

0.7835

0.6224

0.5061

0.6309

0.6433

0.5725

RETAIN+MedRep+5

0.9036

0.7912

0.7038

0.8002

0.6658

0.5230

0.6312

0.6460

0.5748

RETAIN+MedRep+10

0.8937

0.7507

0.6187

0.7853

0.6753

0.5363

0.6496

0.6972

0.6046

RETAIN+MedRep+15

0.8931

0.7600

0.6252

0.8036

0.6518

0.5125

0.6793

0.7023

0.6031

RETAIN+MedRep+20

0.8946

0.7941

0.7308

0.7771

0.6505

0.5196

0.6431

0.6941

0.6128

BEHRT

0.9370

0.9021

0.7269

0.8569

0.7598

0.5416

0.7663

0.6887

0.5481

BEHRT+MedTok

0.9351

0.9280

0.8533

0.8586

0.7780

0.5482

0.7525

0.6435

0.5433

BEHRT+MedRep+2

0.9387

0.9035

0.6702

0.8584

0.7635

0.5704

0.7767

0.6648

0.6980

BEHRT+MedRep+3

0.9394

0.9005

0.7764

0.8589

0.7669

0.5790

0.7805

0.6791

0.7045

BEHRT+MedRep+5

0.9396

0.9040

0.7370

0.8590

0.7447

0.5609

0.7895

0.6903

0.7033

BEHRT+MedRep+10

0.9402

0.9002

0.7355

0.8531

0.7211

0.5473

0.7848

0.6861

0.7115

BEHRT+MedRep+15

0.9412

0.9091

0.7608

0.8566

0.7356

0.5507

0.7713

0.6777

0.7241

BEHRT+MedRep+20

0.9447

0.8989

0.7178

0.8566

0.7498

0.5735

0.7623

0.6756

0.7223

BEHRT-DE

0.9370

0.9021

0.7270

0.8580

0.7620

0.5441

0.7663

0.6886

0.5479

BEHRT-DE+MedTok

0.9418

0.9252

0.8906

0.8593

0.7861

0.5489

0.7437

0.6491

0.5386

BEHRT-DE+MedRep+2

0.9351

0.8940

0.6672

0.8611

0.7544

0.5696

0.7822

0.6732

0.7207

BEHRT-DE+MedRep+3

0.9339

0.8936

0.7362

0.8615

0.7641

0.5668

0.7685

0.6603

0.7066

BEHRT-DE+MedRep+5

0.9447

0.9071

0.7529

0.8602

0.7551

0.5641

0.7927

0.6691

0.7130

BEHRT-DE+MedRep+10

0.9340

0.9035

0.7509

0.8531

0.7277

0.5521

0.7639

0.6685

0.7219

BEHRT-DE+MedRep+15

0.9299

0.8972

0.7006

0.8581

0.7452

0.5474

0.7614

0.6791

0.7256

BEHRT-DE+MedRep+20

0.9383

0.9043

0.7451

0.8572

0.7407

0.5581

0.7671

0.6709

0.7133

Med-BERT

0.9344

0.8964

0.7013

0.8578

0.7637

0.5802

0.7728

0.6800

0.5332

Med-BERT+MedTok

0.9353

0.9209

0.8755

0.8520

0.7783

0.5699

0.7669

0.6653

0.5689

Med-BERT+MedRep+2

0.9418

0.9142

0.6861

0.8588

0.7477

0.5641

0.7841

0.6873

0.6911

Med-BERT+MedRep+3

0.9434

0.9144

0.7552

0.8600

0.7608

0.5745

0.7684

0.6196

0.7027

Med-BERT+MedRep+5

0.9375

0.9068

0.7837

0.8603

0.7435

0.5654

0.7963

0.6977

0.7218

Med-BERT+MedRep+10

0.9376

0.8919

0.6908

0.8555

0.7412

0.5609

0.7848

0.6781

0.7057

Med-BERT+MedRep+15

0.9393

0.8963

0.7480

0.8470

0.7399

0.5372

0.7807

0.6561

0.7017

Med-BERT+MedRep+20

0.9373

0.8977

0.7678

0.8608

0.7399

0.5580

0.7630

0.6811

0.7177

MT (F1-score)

LLOS (F1-score)

RA (F1-score)

Internal

External

Internal

External

Internal

External

MIMIC-IV

EHRSHOT

SNUH

MIMIC-IV

EHRSHOT

SNUH

MIMIC-IV

EHRSHOT

SNUH

RETAIN

0.2417

0.3197

0.1232

0.6005

0.4983

0.4088

0.0713

0.2233

0.1395

RETAIN+MedTok

0.1162

0.1658

0.0872

0.5489

0.4211

0.3852

0.0576

0.2513

0.1696

RETAIN+MedRep+2

0.2392

0.2294

0.0890

0.6275

0.4758

0.4621

0.0848

0.2654

0.1873

RETAIN+MedRep+3

0.2133

0.2767

0.1051

0.6092

0.4646

0.4521

0.0661

0.2432

0.1791

RETAIN+MedRep+5

0.2767

0.3073

0.1104

0.6282

0.4877

0.4674

0.0696

0.2457

0.1807

RETAIN+MedRep+10

0.2179

0.2572

0.0951

0.6108

0.4798

0.4521

0.0685

0.2714

0.1952

RETAIN+MedRep+15

0.2614

0.2872

0.0980

0.6332

0.4835

0.4441

0.0676

0.2692

0.2010

RETAIN+MedRep+20

0.2165

0.2516

0.1350

0.6045

0.4771

0.4539

0.0646

0.2627

0.1947

BEHRT

0.2793

0.3696

0.1199

0.6706

0.5460

0.3820

0.1229

0.2434

0.1524

BEHRT+MedTok

0.2466

0.4000

0.1473

0.6797

0.5695

0.3787

0.1172

0.2369

0.1522

BEHRT+MedRep+2

0.2748

0.3850

0.0761

0.6804

0.5558

0.3964

0.1759

0.2224

0.2096

BEHRT+MedRep+3

0.3110

0.3860

0.1052

0.6766

0.5599

0.4333

0.1505

0.2472

0.3009

BEHRT+MedRep+5

0.2954

0.3774

0.0940

0.6796

0.5332

0.4397

0.1157

0.2578

0.2650

BEHRT+MedRep+10

0.2723

0.3668

0.0980

0.6702

0.5157

0.4114

0.1376

0.2589

0.2542

BEHRT+MedRep+15

0.2721

0.3590

0.1056

0.6743

0.5331

0.4263

0.1292

0.2431

0.2646

BEHRT+MedRep+20

0.3194

0.3340

0.0868

0.6734

0.5388

0.4560

0.1181

0.2420

0.2956

BEHRT-DE

0.2788

0.3680

0.1194

0.6719

0.5494

0.4014

0.1234

0.2429

0.1523

BEHRT-DE+MedTok

0.3021

0.4022

0.2039

0.6747

0.5767

0.4288

0.1066

0.2274

0.1501

BEHRT-DE+MedRep+2

0.3141

0.3606

0.0925

0.6783

0.5508

0.4519

0.1135

0.2383

0.2706

BEHRT-DE+MedRep+3

0.3077

0.3786

0.0922

0.6776

0.5565

0.4264

0.1857

0.2370

0.2603

BEHRT-DE+MedRep+5

0.3243

0.4146

0.0953

0.6812

0.5525

0.4254

0.1106

0.2373

0.3139

BEHRT-DE+MedRep+10

0.3090

0.3904

0.0938

0.6691

0.5181

0.4318

0.1141

0.2455

0.2246

BEHRT-DE+MedRep+15

0.2576

0.4034

0.0847

0.6750

0.5389

0.4337

0.1725

0.2276

0.2711

BEHRT-DE+MedRep+20

0.2699

0.3374

0.0914

0.6745

0.5280

0.4214

0.1103

0.2458

0.3223

Med-BERT

0.2959

0.3669

0.0897

0.6744

0.5547

0.4295

0.1040

0.2368

0.1469

Med-BERT+MedTok

0.2934

0.3666

0.1746

0.6748

0.5611

0.4304

0.1107

0.2479

0.1586

Med-BERT+MedRep+2

0.2815

0.4459

0.0867

0.6746

0.5422

0.3591

0.1111

0.2407

0.2792

Med-BERT+MedRep+3

0.3002

0.4051

0.1027

0.6779

0.5541

0.4403

0.1342

0.2034

0.2711

Med-BERT+MedRep+5

0.3435

0.3976

0.1119

0.6778

0.5415

0.4413

0.1244

0.2480

0.2916

Med-BERT+MedRep+10

0.2585

0.3643

0.0810

0.6695

0.5335

0.4558

0.1122

0.2414

0.2530

Med-BERT+MedRep+15

0.3013

0.3305

0.1008

0.6626

0.5282

0.3682

0.1436

0.2543

0.2562

Med-BERT+MedRep+20

0.3209

0.3450

0.1120

0.6761

0.5383

0.4308

0.0877

0.2628

0.3481
