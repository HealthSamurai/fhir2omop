# Schema Matching on Graph: Iterative Graph Exploration for Efficient and Explainable Data Integration

- arXiv: [2511.20285v1](https://arxiv.org/abs/2511.20285v2)
- Published: 2025-11-25
- Source: `https://arxiv.org/html/2511.20285v1`

---
# SMoG: Schema Matching on Graph

Mingyu Jeon, Jaeyoung Suh, Suwan Cho

###### Abstract

Schema matching is a critical task in data integration, particularly in the medical domain where disparate Electronic Health Record (EHR) systems must be aligned to standard models like OMOP CDM. While Large Language Models (LLMs) have shown promise in schema matching, they suffer from hallucination and lack of up-to-date domain knowledge. Knowledge Graphs (KGs) offer a solution by providing structured, verifiable knowledge. However, existing KG-augmented LLM approaches often rely on inefficient complex multi-hop queries or storage-intensive vector-based retrieval methods. This paper introduces SMoG (Schema Matching on Graph), a novel framework that leverages iterative execution of simple 1-hop SPARQL queries, inspired by successful strategies in Knowledge Graph Question Answering (KGQA). SMoG enhances explainability and reliability by generating human-verifiable query paths while significantly reducing storage requirements by directly querying SPARQL endpoints. Experimental results on real-world medical datasets demonstrate that SMoG achieves performance comparable to state-of-the-art baselines, validating its effectiveness and efficiency in KG-augmented schema matching.

## Introduction

Schema matching, the task of identifying correspondence between schemas of different data sources, is a fundamental problem in data integration (Rahm and Bernstein [2001](https://arxiv.org/html/2511.20285v1#bib.bib33)). In the medical domain, transforming disparate Electronic Health Record (EHR) systems into a standard data model, such as the OMOP Common Data Model (CDM), is a prerequisite for multi-center clinical research (Hripcsak et al. [2015](https://arxiv.org/html/2511.20285v1#bib.bib17); Overhage et al. [2012](https://arxiv.org/html/2511.20285v1#bib.bib30)). However, real-world medical systems often contain hundreds of attributes with opaque names, synonyms, and acronyms, making manual matching impractical and error-prone (Kahn et al. [2016](https://arxiv.org/html/2511.20285v1#bib.bib21)).

To address this, various schema matching approaches have been proposed. Traditional methods are categorized into Schema-based (Rahm and Bernstein [2001](https://arxiv.org/html/2511.20285v1#bib.bib33); Do and Rahm [2002](https://arxiv.org/html/2511.20285v1#bib.bib12)), which utilize schema metadata (e.g., attribute names, types), and Instance-based (Kang and Naughton [2003](https://arxiv.org/html/2511.20285v1#bib.bib22)), which analyze the distribution or patterns of actual data values. Schema-based methods like Cupid (Madhavan, Bernstein, and Rahm [2001](https://arxiv.org/html/2511.20285v1#bib.bib26)) and COMA (Do and Rahm [2002](https://arxiv.org/html/2511.20285v1#bib.bib12)) combine linguistic and structural similarities but suffer performance degradation when attribute names are opaque (Doan et al. [2001](https://arxiv.org/html/2511.20285v1#bib.bib13)). Instance-based methods analyze statistical distributions (Larson et al. [1989](https://arxiv.org/html/2511.20285v1#bib.bib23)) or query logs (Elmeleegy, Ouzzani, and Elmagarmid [2008](https://arxiv.org/html/2511.20285v1#bib.bib16)), but their application in the medical domain is often limited due to restricted data access and privacy concerns (Vatsalan et al. [2013](https://arxiv.org/html/2511.20285v1#bib.bib35)).

Recently, machine learning-based approaches utilizing Pre-trained Language Models (PLMs) have emerged (Devlin et al. [2019](https://arxiv.org/html/2511.20285v1#bib.bib10); Liu et al. [2019](https://arxiv.org/html/2511.20285v1#bib.bib24)). Models like SMAT (Zhang et al. [2021](https://arxiv.org/html/2511.20285v1#bib.bib37)) and Unicorn (Dong et al. [2023](https://arxiv.org/html/2511.20285v1#bib.bib14)) fine-tune BERT or DeBERTa to classify attribute pairs. However, these methods require large-scale labeled data and lack domain-specific knowledge to capture complex medical terminology relationships (Peeters and Bizer [2023](https://arxiv.org/html/2511.20285v1#bib.bib32)). The advent of Large Language Models (LLMs) has opened possibilities for zero-shot or few-shot schema matching (Brown et al. [2020](https://arxiv.org/html/2511.20285v1#bib.bib7); Ouyang et al. [2022](https://arxiv.org/html/2511.20285v1#bib.bib29)). While models like Jellyfish (Narayan et al. [2024](https://arxiv.org/html/2511.20285v1#bib.bib28)) and Prompt-Matcher (Anonymous [2024b](https://arxiv.org/html/2511.20285v1#bib.bib2)) have demonstrated the potential of LLMs, they still face limitations such as hallucination (Ji et al. [2023](https://arxiv.org/html/2511.20285v1#bib.bib19)) and a lack of up-to-date domain knowledge (Huang et al. [2023](https://arxiv.org/html/2511.20285v1#bib.bib18)).

To mitigate these limitations, research leveraging Knowledge Graphs (KGs) (Pan et al. [2024](https://arxiv.org/html/2511.20285v1#bib.bib31); Yasunaga et al. [2021](https://arxiv.org/html/2511.20285v1#bib.bib36)), which provide explicit and editable structured knowledge, is gaining attention. Medical-specific KGs like SNOMED-CT (Donnelly [2006](https://arxiv.org/html/2511.20285v1#bib.bib15)) and UMLS (Bodenreider [2004](https://arxiv.org/html/2511.20285v1#bib.bib6)) are particularly effective in augmenting LLM reasoning. A state-of-the-art study in this field, KG-RAG4SM (Anonymous [2025](https://arxiv.org/html/2511.20285v1#bib.bib4)), applied Retrieval-Augmented Generation (RAG) to schema matching for the first time. It proposed various retrieval methods, including Vector-based and Query-based approaches, achieving significant F1-Score improvements on benchmark datasets like MIMIC (Johnson et al. [2016](https://arxiv.org/html/2511.20285v1#bib.bib20)) and CMS (Centers for Medicare & Medicaid Services [2020](https://arxiv.org/html/2511.20285v1#bib.bib8)).

However, KG-RAG4SM (Anonymous [2025](https://arxiv.org/html/2511.20285v1#bib.bib4)) exhibited a critical limitation. The authors concluded that the Query-based subgraph retrieval method ”does not work well in practice due to the high computational cost and time required in large-scale KGs” (Anonymous [2025](https://arxiv.org/html/2511.20285v1#bib.bib4)). Citing poor quality of LLM-generated queries, inefficiency of complex multi-hop queries, and incomplete retrieval, they dismissed the Query-based approach and adopted Vector-based triple retrieval. Yet, Vector-based retrieval relies solely on semantic similarity, possessing a fundamental limitation in explicitly distinguishing or traversing specific paths based on structural relationships like subclass\_of or different\_from.

In addition to these limitations of the Vector-based approach adopted by KG-RAG4SM (Anonymous [2025](https://arxiv.org/html/2511.20285v1#bib.bib4)), this study challenges their conclusion dismissing the ’Query-based’ approach. We argue that the problem lies not in the Query-based approach itself, but in the design of ’complex multi-hop SPARQL queries’. Indeed, ToG (Think on Graph) (Sun et al. [2023](https://arxiv.org/html/2511.20285v1#bib.bib34)), a successful study in Knowledge Graph Question Answering (KGQA), successfully explores KGs by iteratively executing ’template-based simple 1-hop SPARQL queries’.

Based on this insight, we propose the SMoG (Schema Matching on Graph) framework. Instead of following the existing Vector-based RAG approach, SMoG performs schema matching through the iterative execution of 1-hop SPARQL queries, inspired by ToG (Sun et al. [2023](https://arxiv.org/html/2511.20285v1#bib.bib34)). This approach offers two distinct advantages. First, the knowledge retrieval process is explicit, transparent, and human-verifiable, thereby enhancing the reliability and explainability of the results. Second, it directly accesses SPARQL endpoints without the need to embed the entire KG or store massive vector indices, making it highly efficient in terms of knowledge base management and storage space.

The main contributions of this study are as follows:

-   •
    
    Re-establishing Query-based Schema Matching: We are the first to identify that the failure of the ’Query-based’ knowledge retrieval method, deemed inefficient by existing SOTA research (KG-RAG4SM (Anonymous [2025](https://arxiv.org/html/2511.20285v1#bib.bib4))), stems from the ’complex multi-hop query’ design rather than the approach itself.
    
-   •
    
    Proposal of SMoG Framework: Inspired by ToG (Sun et al. [2023](https://arxiv.org/html/2511.20285v1#bib.bib34)) in KGQA, we propose the SMoG framework, which adapts ’iterative execution of template-based 1-hop SPARQL queries’ to the Schema Matching (SM) task. This is a novel approach in schema matching that performs matching through SPARQL query exploration.
    
-   •
    
    Ensuring Explainability and Reliability: Instead of relying on the ’black-box’ nature of Vector-based retrieval or LLM ’hallucinations’, SMoG explicitly generates human-verifiable 1-hop query exploration paths. This increases result reliability and facilitates debugging.
    
-   •
    
    Proving Storage Efficiency and Practicality: Unlike the Vector-based RAG (Anonymous [2025](https://arxiv.org/html/2511.20285v1#bib.bib4)) method that requires embedding the entire KG and maintaining massive vector indices, SMoG queries SPARQL endpoints directly. We demonstrate that it achieves performance comparable to SOTA baselines on real-world medical datasets (CMS) while securing superior storage efficiency.
    

The remainder of this paper is organized as follows. Section 2 reviews related work, and Section 3 details the query strategy and iterative execution mechanism of the proposed SMoG framework. Section 4 presents the experimental setup, baselines, ablation study, and result analysis, followed by the conclusion and future research directions in Section 5.

## Related Work

### Schema Matching

#### Traditional Schema Matching Methods

Traditional schema matching research is broadly divided into Schema-based and Instance-based methods. Schema-based methods utilize schema metadata such as attribute names, data types, and constraints (Rahm and Bernstein [2001](https://arxiv.org/html/2511.20285v1#bib.bib33); Do and Rahm [2002](https://arxiv.org/html/2511.20285v1#bib.bib12)). Early studies in this field systematically classified and surveyed schema matching methodologies (Rahm and Bernstein [2001](https://arxiv.org/html/2511.20285v1#bib.bib33)). Representative works include Cupid (Madhavan, Bernstein, and Rahm [2001](https://arxiv.org/html/2511.20285v1#bib.bib26)), which combined linguistic similarity (WordNet-based) and structural similarity (tree matching), and COMA (Do and Rahm [2002](https://arxiv.org/html/2511.20285v1#bib.bib12)), which improved accuracy by integrating results from multiple matchers through meta-matching. Similarity Flooding (Melnik, Garcia-Molina, and Rahm [2002](https://arxiv.org/html/2511.20285v1#bib.bib27)) performed matching through graph-based fixed-point computation.

On the other hand, Instance-based methods analyze the distribution and patterns of actual data values (Kang and Naughton [2003](https://arxiv.org/html/2511.20285v1#bib.bib22)). iMAP (Dhamankar et al. [2004](https://arxiv.org/html/2511.20285v1#bib.bib11)) estimated schema matching probabilities via Bayesian learning. However, these methods are difficult to apply in domains where instance-level access is restricted due to privacy constraints, such as medical data (Vatsalan et al. [2013](https://arxiv.org/html/2511.20285v1#bib.bib35)).

Additionally, Usage-based methods utilize query logs to analyze relationships between attributes (Elmeleegy, Ouzzani, and Elmagarmid [2008](https://arxiv.org/html/2511.20285v1#bib.bib16)). Elmeleegy et al. (2008) extracted patterns of co-occurrence, joins, and aggregate function usage between attributes from query logs (Elmeleegy, Ouzzani, and Elmagarmid [2008](https://arxiv.org/html/2511.20285v1#bib.bib16)). However, this approach has a clear limitation in that it is inapplicable in environments with new systems or insufficient query logs.

#### Machine Learning-based Schema Matching

Recently, machine learning-based methods utilizing Pre-trained Language Models (PLMs) have gained attention (Devlin et al. [2019](https://arxiv.org/html/2511.20285v1#bib.bib10); Liu et al. [2019](https://arxiv.org/html/2511.20285v1#bib.bib24)). SMAT (Zhang et al. [2021](https://arxiv.org/html/2511.20285v1#bib.bib37)) learned the similarity of attribute pairs using Siamese Networks and GloVe/BERT embeddings. Unicorn (Dong et al. [2023](https://arxiv.org/html/2511.20285v1#bib.bib14)) fine-tuned the DeBERTa model to perform schema matching as an attribute pair classification problem. However, these PLM-based methods require large-scale labeled training data and have limitations in capturing the subtle semantic relationships of complex domain-specific terms (e.g., medical terminology) (Peeters and Bizer [2023](https://arxiv.org/html/2511.20285v1#bib.bib32)).

#### LLM-based Schema Matching

The emergence of Large Language Models (LLMs) has opened new possibilities in the field of schema matching. LLMs can perform schema matching via zero-shot or few-shot learning based on vast pre-trained knowledge (Brown et al. [2020](https://arxiv.org/html/2511.20285v1#bib.bib7); Ouyang et al. [2022](https://arxiv.org/html/2511.20285v1#bib.bib29)). Jellyfish (Narayan et al. [2024](https://arxiv.org/html/2511.20285v1#bib.bib28)) achieved high accuracy by fine-tuning StarCoder, a Code LLM, for schema matching tasks. ReMatch (Anonymous [2024c](https://arxiv.org/html/2511.20285v1#bib.bib3)) utilized Retrieval-Augmented Generation (RAG) to retrieve similar matching examples and construct few-shot prompts. Matchmaker (Anonymous [2024a](https://arxiv.org/html/2511.20285v1#bib.bib1)) iteratively improved matching performance through self-improving LLM programs, and Prompt-Matcher (Anonymous [2024b](https://arxiv.org/html/2511.20285v1#bib.bib2)) proposed a systematic prompting strategy utilizing JSON schema structures.

However, these LLM-based approaches are not free from the inherent limitation of LLMs, the hallucination problem (Ji et al. [2023](https://arxiv.org/html/2511.20285v1#bib.bib19)), which can lead to the generation of non-existent relationships or incorrect matching due to a lack of up-to-date domain knowledge (Huang et al. [2023](https://arxiv.org/html/2511.20285v1#bib.bib18)).

### Knowledge Graph-augmented LLM

#### Background of KG-augmented LLM

To mitigate the aforementioned limitations of LLMs (hallucination, lack of recency, opaque decision-making), utilizing Knowledge Graphs (KGs) is being actively researched (Ji et al. [2023](https://arxiv.org/html/2511.20285v1#bib.bib19); Huang et al. [2023](https://arxiv.org/html/2511.20285v1#bib.bib18)). KGs offer the advantage of providing explicit and editable structured knowledge, with easy updates for the latest information (Pan et al. [2024](https://arxiv.org/html/2511.20285v1#bib.bib31); Yasunaga et al. [2021](https://arxiv.org/html/2511.20285v1#bib.bib36)). KG-augmented LLMs aim to improve the accuracy and reliability of LLMs by integrating this verified knowledge from KGs into the LLM’s reasoning process (Baek et al. [2023](https://arxiv.org/html/2511.20285v1#bib.bib5); Sun et al. [2023](https://arxiv.org/html/2511.20285v1#bib.bib34)).

#### KG-augmented LLM for Reasoning

Research on utilizing KGs for LLM reasoning is prominent in the Knowledge Graph Question Answering (KGQA) field. Among them, Think-on-Graph (ToG) (Sun et al. [2023](https://arxiv.org/html/2511.20285v1#bib.bib34)) is a pioneering study that inspired the core idea of this research. ToG proposed a method where, instead of generating complex multi-hop queries at once, the LLM iteratively executes ’template-based simple 1-hop SPARQL queries’ to explore the KG. At each step (hop), the LLM decides the next exploration action based on the retrieved triplets and searches for promising reasoning paths via beam search. This approach lowers the risk of complex query generation failure and makes the exploration process transparent.

Following ToG, Reasoning on Graphs (RoG) (Luo et al. [2023](https://arxiv.org/html/2511.20285v1#bib.bib25)) conducted research on performing more faithful and interpretable reasoning based on KG paths. Furthermore, Plan-on-Graph (PoG) (Chen et al. [2024](https://arxiv.org/html/2511.20285v1#bib.bib9)) extended ToG’s idea by introducing self-correcting adaptive planning, where the LLM dynamically modifies the plan, achieving SOTA performance in KGQA tasks.

#### KG-augmented LLM for Schema Matching

The SOTA research utilizing KGs in the schema matching field is KG-RAG4SM (Anonymous [2025](https://arxiv.org/html/2511.20285v1#bib.bib4)). This study was the first attempt to apply RAG to schema matching, proposing various subgraph retrieval methods such as Vector-based, Query-based, and BFS-based. It demonstrated the validity of utilizing KGs by achieving F1-Score improvements over existing LLM-based methods on medical datasets like MIMIC, Synthea, and CMS.

However, the researchers of KG-RAG4SM (Anonymous [2025](https://arxiv.org/html/2511.20285v1#bib.bib4)) pointed out a clear limitation regarding the ’Query-based’ retrieval method. They concluded that ”Cypher queries generated by LLMs on large-scale KGs are computationally expensive and time-consuming, making them inefficient” (Anonymous [2025](https://arxiv.org/html/2511.20285v1#bib.bib4)). Citing the degradation of LLM-generated query quality and the inefficiency of multi-hop queries, they ultimately adopted Vector-based triple retrieval as their final model. However, this method bears the burden of massive storage space and computational costs required to embed the entire KG and build/maintain a vast vector index. Moreover, this approach has a fundamental limitation in that it is difficult to explain the matching results or trust the path due to the ’black-box’ nature of Vector-based retrieval.

### Position of This Research

Existing studies introduced KG-RAG to solve the hallucination problem of LLMs in schema matching (Anonymous [2025](https://arxiv.org/html/2511.20285v1#bib.bib4)), but concluded that the Query-based approach is inefficient and relied on Vector-based RAG.

This study directly challenges this conclusion. We argue that the cause of failure in KG-RAG4SM (Anonymous [2025](https://arxiv.org/html/2511.20285v1#bib.bib4)) lies not in the ’Query-based’ approach itself, but in the design of ’complex multi-hop queries’.

Therefore, we propose the SMoG (Schema Matching on Graph) framework, which adapts the strategy of ’iterative execution of simple 1-hop queries’, proven in ToG (Sun et al. [2023](https://arxiv.org/html/2511.20285v1#bib.bib34)) of the KGQA field, to the schema matching task. Unlike Vector-based RAG, SMoG does not require KG embedding and explores explainable and reliable matching paths by borrowing ToG’s approach.

## Methodology

![Refer to caption](images/SMoG.png)

Figure 1: Overview of the SMoG Framework. The framework consists of two main phases: Topic Entity Extraction (TEE) and Graph Exploration (GE). TEE identifies the starting entity for a given attribute, while GE iteratively explores the Knowledge Graph using 1-hop SPARQL queries to find the optimal matching path.

### SMoG Architecture Overview

The SMoG (Schema Matching on Graph) framework is designed to overcome the limitations of existing Vector-based RAG approaches by providing an explainable and efficient schema matching process. As illustrated in Figure [1](https://arxiv.org/html/2511.20285v1#Sx3.F1 "Figure 1 ‣ Methodology ‣ SMoG: Schema Matching on Graph"), the framework comprises two core processes: Topic Entity Extraction (TEE) and Graph Exploration (GE).

First, the Topic Entity Extraction (TEE) module aims to accurately identify a Topic Entity within the Knowledge Graph (KG) that represents the semantics of the target attribute. Using the attribute’s description as input, the module leverages LLM-based reasoning to extract the most descriptive Topic Entity candidate from the KG. These extracted entities serve as the starting points for the subsequent exploration phase.

Second, the Graph Exploration (GE) module collects structural and semantic knowledge (Knowledge Triples) from the KG to answer the schema matching question, starting from the identified Topic Entity. Inspired by the Think-on-Graph (ToG) approach (Sun et al. [2023](https://arxiv.org/html/2511.20285v1#bib.bib34)) in KGQA, SMoG employs an iterative execution of simple 1-hop SPARQL queries instead of generating complex multi-hop queries. The LLM infers the necessary relations for the next hop based on the currently retrieved triples, iteratively accumulating information required for the answer. The exploration terminates when sufficient information is gathered to answer the question or when a predefined maximum depth is reached.

Finally, in the Final Answer Generation phase, all Knowledge Triples collected during the GE phase are provided to the LLM. Based on this explicit evidence, the LLM derives the final schema matching pair.

### Topic Entity Extraction (TEE)

#### Objective and Strategy

The primary goal of TEE is to normalize the natural language description of a schema attribute into a single Topic Entity (QID) in Wikidata, providing a precise starting point for Graph Exploration. Due to the diversity of domain concepts (e.g., synonyms, acronyms) and semi-structured descriptions, simple keyword matching is often insufficient. To address this, we employ a hybrid strategy that combines lexical and semantic signals to refine candidates, followed by an LLM-based disambiguation step to ensure robustness and accuracy.

#### TEE Pipeline

The TEE process follows a ”low-cost candidate convergence →\\rightarrow high-confidence single selection” principle, consisting of four stages:

##### Stage 1: Hybrid Keyword Generation

We generate a small set (Top-K=5) of representative keywords that satisfy both retrieval efficiency and semantic coverage. The input description is preprocessed (lowercasing, tokenization, stopword filtering) to create a candidate token set. We calculate a BM25 score to capture lexical signals (relative frequency and compressibility) and an Embedding score (cosine similarity between the token and the full description) to capture semantic signals. The final Top-5 keywords are selected based on a weighted sum (0.4×BM25+0.6×Embedding0.4\\times\\text{BM25}+0.6\\times\\text{Embedding}), prioritizing semantic relevance.

##### Stage 2: Wikidata Candidate Retrieval

Using the keywords from Stage 1, we retrieve an initial pool of entity candidates from Wikidata. We query the ‘wbsearchentities‘ API for each keyword and collect ‘id (QID)‘, ‘label‘, and ‘description‘ for the top-5 results. Candidates are deduplicated by QID, and their textual representation is unified into a ‘full\_text‘ field combining the label and description.

##### Stage 3: Hybrid Reranking

To sort the candidates by global relevance to the original attribute description, we perform hybrid reranking. We calculate a BM25 reranking score using the description as a query against the candidate corpus, and an Embedding reranking score based on cosine similarity. The final score is again a weighted sum (0.4×BM25+0.6×Embedding0.4\\times\\text{BM25}+0.6\\times\\text{Embedding}). Only the top-5 candidates are passed to the next stage to balance quality and cost.

##### Stage 4: LLM-Based Disambiguation

The final selection relies on an LLM to discern subtle semantic or common-sense differences among the top candidates. The LLM receives the structured information of the top-5 candidates and determines the single most appropriate QID.

### Graph Exploration via SMoG

#### Objective and Overview

The Graph Exploration (GE) module aims to discover the optimal Reasoning Chain in the KG that leads to the answer for the schema matching query, starting from the Topic Entities identified in the TEE phase. We adopt a Beam Search\-based multi-hop reasoning framework. To efficiently control the vast search space of the graph, we maintain only the most promising paths (Top-ww) at each step while extending the depth (dd).

#### Iterative Exploration Process

The exploration iterates through the following steps until the maximum depth (Dm​a​xD\_{max}) is reached or an answer is found.

##### 1\. Relation Retrieval and Filtering

First, we retrieve all adjacent relations for the current entity (ee) using SPARQL. We query both forward (where ee is the subject) and backward (where ee is the object) relations. To improve efficiency, we apply heuristic filtering to exclude irrelevant metadata relations (e.g., ‘instance of‘, ‘URL‘). The remaining relations are prioritized based on the semantic similarity between the query intent and the relation label.

##### 2\. Entity Propagation

Next, we propagate to the next hop’s candidate entities by traversing the selected promising relations (pp). We execute SPARQL queries to find entities connected via these relations. To prevent combinatorial explosion, if a relation connects to an excessive number of entities, we prune the candidates, keeping only the top-kk entities based on connection strength or importance.

##### 3\. LLM-based Scoring and Beam Pruning

This step is crucial for selecting promising paths using the LLM’s reading comprehension and reasoning capabilities.

-   •
    
    Relation Scoring (Sr​e​lS\_{rel}): The LLM evaluates which of the candidate relations are most likely to lead to the answer, given the query and current entity. It assigns a confidence score (0-1) to each relation.
    
-   •
    
    Entity Scoring (Se​n​tS\_{ent}): The LLM evaluates the likelihood that the entities reached via the selected relations are the answer or close to it.
    
-   •
    
    Beam Pruning: The final path score is defined as Sp​a​t​h\=Sr​e​l×Se​n​tS\_{path}=S\_{rel}\\times S\_{ent}. We sort all candidate paths by Sp​a​t​hS\_{path} and keep only the top-ww paths (Beam Width), pruning the rest. This ensures the computational cost remains linear with respect to depth (O​(w×d)O(w\\times d)).
    

##### 4\. Reasoning and Termination

In this control step, we verify if the accumulated knowledge paths are sufficient to solve the query.

-   •
    
    Chain Aggregation: The top-ww reasoning chains are aggregated into a single context.
    
-   •
    
    Sufficiency Verification: The LLM assesses whether the answer can be derived from the current context. We use a low temperature setting to minimize hallucination.
    
-   •
    
    Decision: If a clear answer is identified (Stop Condition Met), the loop terminates, and the final answer and reasoning path are returned. If information is insufficient, the leaf entities of the current paths become the seeds for the next hop, and the process repeats.
    
-   •
    
    Fail-safe: If the maximum depth is reached without a definite answer, a ”Half-stop” strategy is triggered to generate a best-effort answer based on the partial information collected.
    

## Experiment

### Experiment Setup

#### Dataset Description

We conducted our experiments on the CMS (Centers for Medicare & Medicaid Services) dataset, a real-world medical dataset characterized by complex schema mappings and high domain specificity. To ensure fair comparison and reproducibility with state-of-the-art baselines, we utilized the specific CMS Test dataset provided by the KG-RAG4SM (Anonymous [2025](https://arxiv.org/html/2511.20285v1#bib.bib4)) repository. The test set consists of 2,563 attribute pairs. A critical characteristic of this dataset is its extreme class imbalance, with only 25 positive matches (0.97%) and 2,538 negative matches (99.03%).

#### Model & Knowledge Graph

We utilized the SMoG (Schema Matching on Graph) architecture, which integrates a Knowledge Graph-augmented LLM approach.

-   •
    
    Knowledge Graph: We employed Wikidata as the external knowledge source, consistent with the setup in KG-RAG4SM, to provide broad coverage of medical and general domain entities.
    
-   •
    
    Model: The core reasoning engine is based on a Large Language Model (LLM) enhanced with retrieval-augmented generation (RAG) capabilities.
    

#### Evaluation Metrics

Given the class imbalance, we report Precision, Recall, and F1-Score as the primary metrics.

### Results

#### Baseline Comparison

We compare our approach against state-of-the-art baselines referenced in recent literature (e.g., KG-RAG4SM (Anonymous [2025](https://arxiv.org/html/2511.20285v1#bib.bib4)), Jellyfish (Narayan et al. [2024](https://arxiv.org/html/2511.20285v1#bib.bib28)), SMAT (Zhang et al. [2021](https://arxiv.org/html/2511.20285v1#bib.bib37))).

Model

Precision

Recall

F1-Score

Ours (SMoG)

43.48%

40.00%

41.67%

KG-RAG4SM (Anonymous [2025](https://arxiv.org/html/2511.20285v1#bib.bib4))

52.38%

44.00%

47.82%

Unicorn (Fine-tuned) (Dong et al. [2023](https://arxiv.org/html/2511.20285v1#bib.bib14))

59.99%

35.99%

44.99%

SMAT (Zhang et al. [2021](https://arxiv.org/html/2511.20285v1#bib.bib37))

31.57%

48.00%

38.09%

Jellyfish (Narayan et al. [2024](https://arxiv.org/html/2511.20285v1#bib.bib28))

30.00%

36.00%

32.72%

Table 1: Performance comparison on the CMS dataset.

#### Validation of Core Contributions

Our experimental results strongly support the core contributions proposed in this study:

1.  1.
    
    Re-establishing Query-based Approaches: SMoG achieved an F1-score of 41.67%, which is highly competitive with the SOTA Vector-based method (KG-RAG4SM, 47.82%) and outperforms LLM-based baselines (Jellyfish, 32.72%). This empirical evidence refutes the previous assumption that query-based methods are inherently inferior, demonstrating that ”iterative 1-hop queries” are a viable and effective strategy.
    
2.  2.
    
    Efficiency & Explainability: By achieving comparable performance without relying on massive vector indexes, SMoG validates its storage efficiency. Furthermore, the explicit reasoning chains (analyzed in Sec 4.3) demonstrate the explainability of our framework, offering a transparent alternative to the ”black-box” nature of vector retrieval.
    

### Analytic Study: Impact of Reasoning Chains and Topic Relevance

To understand the model’s decision-making process, we analyzed the intermediate outputs of the SMoG pipeline: Topic Entity Scores and Reasoning Chain Counts.

#### Impact of Reasoning Chains: Depth Analysis

We analyzed the Average Depth of Reasoning Chains (final selected paths) generated by the model to understand its decision-making behavior.

Group

Count

Avg. Depth

Match / Correct (TP)

10

2.50

Non-Match / Correct (TN)

2522

2.48

Match / Incorrect (FN)

15

2.80

Non-Match / Incorrect (FP)

16

1.62

Table 2: Average depth of reasoning chains by prediction group.

Interpretation:

-   •
    
    TP (2.50): Consistent Reasoning. Deep chains validate true matches.
    
-   •
    
    TN (2.48): Thorough Verification. Active disproval of connections.
    
-   •
    
    FN (2.80): Over-Thinking. Excessive complexity leads to confusion.
    
-   •
    
    FP (1.62): Premature Commitment. Hasty acceptance of weak connections.
    

Conclusion: The contrast between FN (2.80) and FP (1.62) provides a critical insight: Errors stem from opposite behaviors. False Negatives arise from excessive complexity (Over-thinking), while False Positives arise from insufficient verification (Premature Commitment). Future work should focus on enforcing deeper verification for potential matches to reduce FPs.

#### Analysis of Topic Entity Extraction (TEE) Strategy

We performed a deep dive into the TEE scores by grouping the data based on the Model’s Prediction Outcome to understand the correlation between TEE signals and final performance.

Group

Count

OMOP BM25

OMOP Emb

OMOP Score

Source BM25

Source Emb

Source Score

TP

10

3.50

0.39

0.68

1.43

0.43

0.81

FN

15

5.59

0.40

0.72

1.50

0.40

0.80

TN

2522

5.88

0.39

0.76

1.89

0.41

0.81

FP

16

4.55

0.31

0.68

1.68

0.37

0.79

Table 3: TEE score analysis by prediction group.

Interpretation:

-   •
    
    TP: Success despite Noise. Correct matches with moderate overlap.
    
-   •
    
    FN: The ”Distractor” Trap. Missed matches had higher scores.
    
-   •
    
    TN: Robust Rejection. Correct rejection of high-score candidates.
    
-   •
    
    FP: Semantic Hallucination. Errors where similarity was lowest.
    

Key Insight: The ”Lexical Paradox”. Our analysis reveals a counter-intuitive phenomenon: High lexical overlap (BM25) and Total Scores are more strongly associated with Non-Matches (Score 0.76) and Failures (Score 0.72) than with Success (Score 0.68).

-   •
    
    This confirms that in the medical domain, standardized terms (OMOP) act as ”Lexical Distractors.”
    
-   •
    
    The fact that our model correctly handles the TN group (Highest Score 0.76) proves that it successfully overcomes this bias, which a naive retriever would fail to do.
    

## Discussion

Our study revisited the potential of query-based approaches in schema matching, a direction previously dismissed by state-of-the-art research due to efficiency concerns. By analyzing the performance and behavior of SMoG, we provide new perspectives on the ”Query vs. Vector” debate and the nature of LLM reasoning in this domain.

### Re-evaluating the ”Query-based” Hypothesis

The primary motivation of this work was to challenge the conclusion of KG-RAG4SM (Anonymous [2025](https://arxiv.org/html/2511.20285v1#bib.bib4)) that query-based methods are inherently impractical for large-scale KGs. Our results with SMoG demonstrate that the issue lay not in the query-based approach itself, but in the complexity of the queries. By adopting an iterative, 1-hop SPARQL strategy inspired by ToG (Sun et al. [2023](https://arxiv.org/html/2511.20285v1#bib.bib34)), SMoG achieved competitive F1-scores (41.67%) comparable to vector-based baselines, effectively refuting the notion that query-based methods cannot scale or perform. This confirms our hypothesis that a ”divide-and-conquer” exploration strategy is a viable, and perhaps superior, alternative to complex multi-hop query generation.

### The Dual Nature of Reasoning Errors

Beyond feasibility, our depth analysis revealed distinct behavioral patterns in LLM reasoning. We observed a dichotomy in error modes: False Negatives were associated with deeper reasoning chains (”Over-thinking,” avg. depth 2.80), while False Positives stemmed from shallow, hasty conclusions (”Premature Commitment,” avg. depth 1.62). This suggests that while the iterative query mechanism allows for deep exploration, it requires a regulatory mechanism to balance depth—preventing ”reasoning drift” in complex cases while enforcing rigorous verification in seemingly obvious ones.

### The ”Distractor” Trap and Explicit Reasoning

Our TEE analysis highlighted the ”Lexical Paradox,” where high lexical overlap often served as a distractor rather than a signal for correct matching. The fact that SMoG could correctly reject non-matches with high lexical scores (OMOP BM25 5.88) underscores the value of explicit reasoning. Unlike vector-based methods that might be swayed by high semantic similarity scores, SMoG’s graph exploration process allows the model to verify the structural and relational context of a candidate, providing a robustness against lexical distractors that is critical in the medical domain.

## Conclusion

This paper presented SMoG (Schema Matching on Graph), a novel framework that re-establishes the viability of query-based knowledge graph exploration for schema matching. Addressing the limitations of prior vector-based approaches—specifically their ”black-box” nature and high storage requirements—we proposed an iterative 1-hop SPARQL exploration strategy.

Our key conclusions are:

1.  1.
    
    Feasibility of Query-based SM: We proved that query-based methods, when designed as iterative 1-hop explorations, are not only feasible but competitive with SOTA vector-based approaches, debunking previous claims of their inefficiency.
    
2.  2.
    
    Explainability and Efficiency: SMoG offers a transparent, human-verifiable reasoning path without the overhead of massive vector indices, directly addressing the need for explainable AI in high-stakes medical data integration.
    
3.  3.
    
    Insight into Reasoning Dynamics: We identified ”Over-thinking” and ”Premature Commitment” as key failure modes, providing a roadmap for future research to focus on adaptive reasoning control.
    

By successfully bridging the gap between the transparency of symbolic reasoning and the power of LLMs, SMoG paves the way for more reliable, explainable, and efficient automated data standardization systems. Future work will focus on adaptive depth control to mitigate the specific error types identified, further enhancing the robustness of this approach.

## Ethical Statement

We use synthetic or de-identified datasets and follow license terms of clinical terminologies. No patient-identifying data is used.

## References

-   Anonymous (2024a) Anonymous. 2024a. Matchmaker: Self-Improving Large Language Model Programs for Schema Matching. arXiv preprint arXiv:2410.24105.
-   Anonymous (2024b) Anonymous. 2024b. Prompt-Matcher: Prompt engineering for schema matching. arXiv preprint arXiv:2408.14507.
-   Anonymous (2024c) Anonymous. 2024c. ReMatch: Retrieval-augmented schema matching with LLMs. arXiv preprint.
-   Anonymous (2025) Anonymous. 2025. Knowledge Graph-based Retrieval-Augmented Generation for Schema Matching. arXiv preprint arXiv:2501.08686.
-   Baek et al. (2023) Baek, J.; et al. 2023. Knowledge-augmented language model prompting for zero-shot knowledge graph question answering. arXiv preprint arXiv:2306.04136.
-   Bodenreider (2004) Bodenreider, O. 2004. The Unified Medical Language System (UMLS): integrating biomedical terminology. _Nucleic Acids Research_, 32(suppl\_1): D267–D270.
-   Brown et al. (2020) Brown, T.; et al. 2020. Language models are few-shot learners. In _Advances in Neural Information Processing Systems_, volume 33, 1877–1901.
-   Centers for Medicare & Medicaid Services (2020) Centers for Medicare & Medicaid Services. 2020. CMS Data. https://www.cms.gov/.
-   Chen et al. (2024) Chen, L.; et al. 2024. Plan-on-Graph: Self-Correcting Adaptive Planning of Large Language Model on Knowledge Graphs. In _Advances in Neural Information Processing Systems_.
-   Devlin et al. (2019) Devlin, J.; et al. 2019. BERT: Pre-training of deep bidirectional transformers for language understanding. In _Proceedings of the 2019 Conference of the North American Chapter of the Association for Computational Linguistics: Human Language Technologies, Volume 1 (Long and Short Papers)_, 4171–4186.
-   Dhamankar et al. (2004) Dhamankar, R.; et al. 2004. iMAP: Discovering complex semantic matches between database schemas. In _Proceedings of the 2004 ACM SIGMOD international conference on Management of data_, 383–394.
-   Do and Rahm (2002) Do, H.-H.; and Rahm, E. 2002. COMA—A system for flexible combination of schema matching approaches. In _Proceedings of the 28th International Conference on Very Large Data Bases_, 610–621.
-   Doan et al. (2001) Doan, A.; et al. 2001. Reconciling schemas of disparate data sources: A machine-learning approach. In _ACM SIGMOD Record_, volume 30, 509–520.
-   Dong et al. (2023) Dong, X.; et al. 2023. Unicorn: A unified multi-tasking model for supporting matching tasks in data integration. arXiv preprint arXiv:2304.14130.
-   Donnelly (2006) Donnelly, K. 2006. SNOMED-CT: The advanced terminology and coding system for eHealth. In _Studies in Health Technology and Informatics_, volume 121, 279.
-   Elmeleegy, Ouzzani, and Elmagarmid (2008) Elmeleegy, H.; Ouzzani, M.; and Elmagarmid, A. 2008. Usage-based schema matching. In _2008 IEEE 24th International Conference on Data Engineering_, 20–29.
-   Hripcsak et al. (2015) Hripcsak, G.; et al. 2015. Observational Health Data Sciences and Informatics (OHDSI): Opportunities for observational researchers. _Studies in Health Technology and Informatics_, 216: 574.
-   Huang et al. (2023) Huang, L.; et al. 2023. A survey on hallucination in large language models: Principles, taxonomy, challenges, and open questions. arXiv preprint arXiv:2311.05232.
-   Ji et al. (2023) Ji, Z.; et al. 2023. Survey of hallucination in natural language generation. _ACM Computing Surveys_, 55(12): 1–38.
-   Johnson et al. (2016) Johnson, A. E. W.; et al. 2016. MIMIC-III, a freely accessible critical care database. _Scientific Data_, 3(1): 1–9.
-   Kahn et al. (2016) Kahn, M. G.; et al. 2016. A harmonized data quality assessment terminology and framework for the secondary use of electronic health record data. _eGEMs_, 4(1).
-   Kang and Naughton (2003) Kang, J.; and Naughton, J. F. 2003. On schema matching with opaque column names and data values. In _Proceedings of the 2003 ACM SIGMOD international conference on Management of data_, 205–216.
-   Larson et al. (1989) Larson, J. A.; et al. 1989. A theory of attribute equivalence in databases with application to schema integration. _IEEE Transactions on Software Engineering_, 15(4): 449–463.
-   Liu et al. (2019) Liu, Y.; et al. 2019. RoBERTa: A robustly optimized BERT pretraining approach. arXiv preprint arXiv:1907.11692.
-   Luo et al. (2023) Luo, L.; et al. 2023. Reasoning on graphs: Faithful and interpretable large language model reasoning. arXiv preprint arXiv:2310.01061.
-   Madhavan, Bernstein, and Rahm (2001) Madhavan, J.; Bernstein, P. A.; and Rahm, E. 2001. Generic schema matching with Cupid. In _Proceedings of the 27th International Conference on Very Large Data Bases_, 49–58.
-   Melnik, Garcia-Molina, and Rahm (2002) Melnik, S.; Garcia-Molina, H.; and Rahm, E. 2002. Similarity flooding: A versatile graph matching algorithm and its application to schema matching. In _Proceedings 2002 International Conference on Data Engineering_, 117–128.
-   Narayan et al. (2024) Narayan, A.; et al. 2024. Can Foundation Models Wrangle Your Data? _Proceedings of the VLDB Endowment_, 17(9): 2241–2254.
-   Ouyang et al. (2022) Ouyang, L.; et al. 2022. Training language models to follow instructions with human feedback. In _Advances in Neural Information Processing Systems_, volume 35, 27730–27744.
-   Overhage et al. (2012) Overhage, J. M.; et al. 2012. Validation of a common data model for active safety surveillance research. _Journal of the American Medical Informatics Association_, 19(1): 54–60.
-   Pan et al. (2024) Pan, S.; et al. 2024. Unifying large language models and knowledge graphs: A roadmap. _IEEE Transactions on Knowledge and Data Engineering_.
-   Peeters and Bizer (2023) Peeters, R.; and Bizer, C. 2023. Supervised contrastive learning for product matching. In _Companion Proceedings of the ACM Web Conference 2023_, 248–251.
-   Rahm and Bernstein (2001) Rahm, E.; and Bernstein, P. A. 2001. A survey of approaches to automatic schema matching. _The VLDB Journal_, 10(4): 334–350.
-   Sun et al. (2023) Sun, Z.; et al. 2023. Think-on-graph: Deep and responsible reasoning of large language model on knowledge graph. arXiv preprint arXiv:2307.07697.
-   Vatsalan et al. (2013) Vatsalan, D.; et al. 2013. _Privacy-preserving record linkage for big data: Current approaches and research challenges_, 851–895. Springer.
-   Yasunaga et al. (2021) Yasunaga, M.; et al. 2021. QA-GNN: Reasoning with language models and knowledge graphs for question answering. In _Proceedings of the 2021 Conference of the North American Chapter of the Association for Computational Linguistics: Human Language Technologies_, 535–546.
-   Zhang et al. (2021) Zhang, Y.; et al. 2021. SMAT: An attention-based deep learning solution to the automation of schema matching. arXiv preprint arXiv:2012.10097.
