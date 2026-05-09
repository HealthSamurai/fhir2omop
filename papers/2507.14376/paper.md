# Schemora: schema matching via multi-stage recommendation and metadata enrichment using off-the-shelf llms

- arXiv: [2507.14376v1](https://arxiv.org/abs/2507.14376v1)
- Published: 2025-07-18
- Source: `https://arxiv.org/html/2507.14376v1`

---
# SCHEMORA: Schema Matching via Multi-stage Recommendation and Metadata Enrichment using Off-the-Shelf LLMs

 Osman Erman Gungor, PhD.  
Principal Machine Learning Engineer  
Informatica  
Redwood City, CA, 94063  
oermangungor@gmail.com  
& Derek Paulsen  
Computer Science  
University of Wisconsin-Madison  
Madison, Wisconsin  
dpaulsen@informatica.com  
& William Kang  
Director of AI/ML Development  
Informatica  
Redwood City, CA, 94063  
wkang@informatica.com

###### Abstract

Schema matching is essential for integrating heterogeneous data sources and enhancing dataset discovery, yet it remains a complex and resource-intensive problem. We introduce SCHEMORA, a schema matching framework that combines large language models with hybrid retrieval techniques in a prompt-based approach, enabling efficient identification of candidate matches without relying on labeled training data or exhaustive pairwise comparisons. By enriching schema metadata and leveraging both vector-based and lexical retrieval, SCHEMORA improves matching accuracy and scalability. Evaluated on the MIMIC-OMOP benchmark, it establishes new state-of-the-art performance, with gains of 7.49% in HitRate@5 and 3.75% in HitRate@3 over previous best results. To our knowledge, this is the first LLM-based schema matching method with an open-source implementation, accompanied by analysis that underscores the critical role of retrieval and provides practical guidance on model selection.

_Keywords_ Schema Matching  ⋅⋅\\cdot⋅ LLMs  ⋅⋅\\cdot⋅ Metadata enrichment  ⋅⋅\\cdot⋅ Hybrid search  ⋅⋅\\cdot⋅ Information Retrieval

## 1 Introduction

Schema matching takes two schemas as input and produces a mapping between their semantically related elements (Rahm and Bernstein ([2001](https://arxiv.org/html/2507.14376v1#bib.bib1))). It has a wide range of applications in database management and cataloging, such as integrating data from diverse sources, discovering undocumented PK–FK relationships, and identifying joinable tables (Koutras et al. ([2020](https://arxiv.org/html/2507.14376v1#bib.bib2))). Additionally, schema matching is vital for developing robust machine learning models by facilitating dataset discovery to enhance feature sets and by validating data to ensure higher training quality (Seedat and van der Schaar ([2024](https://arxiv.org/html/2507.14376v1#bib.bib3))). Yet despite its importance, it often relies on ad-hoc or heuristic approaches, hampered by the lack of standardized benchmarks and rigorous evaluation frameworks that make it difficult to assess progress or compare methods (Koutras et al. ([2020](https://arxiv.org/html/2507.14376v1#bib.bib2))).

Manual schema matching remains notoriously time-consuming and error-prone. Organizations report that mapping a single dataset to common standards like OMOP often requires 40–80 hours of manual effort and domain expert review—even for experienced teams (Mecoli et al. ([2023](https://arxiv.org/html/2507.14376v1#bib.bib4))). These difficulties are amplified by inconsistent schema designs, incomplete or ambiguous metadata, privacy restrictions that limit access to underlying data, and the sheer scale and imbalance of modern schemas (Zhang et al. ([2023a](https://arxiv.org/html/2507.14376v1#bib.bib5))). As schema sizes grow, manual processes also become more susceptible to cognitive biases and human error (Sheetrit et al. ([2024](https://arxiv.org/html/2507.14376v1#bib.bib6))).

To address these challenges, researchers have investigated various approaches, including supervised machine learning techniques (Doan et al. ([2001](https://arxiv.org/html/2507.14376v1#bib.bib7)), He and Chang ([2004](https://arxiv.org/html/2507.14376v1#bib.bib8))), ensemble and active learning methods (Peukert et al. ([2011](https://arxiv.org/html/2507.14376v1#bib.bib9)), Gal ([2011](https://arxiv.org/html/2507.14376v1#bib.bib10))), and a range of deep learning models designed to capture latent semantic relationships via embeddings and neural architectures (Zhang et al. ([2021](https://arxiv.org/html/2507.14376v1#bib.bib11)), Mudgal et al. ([2018](https://arxiv.org/html/2507.14376v1#bib.bib12)), Zhang et al. ([2023b](https://arxiv.org/html/2507.14376v1#bib.bib13))). While these methods can automate schema matching, they also present new drawbacks. Specifically, they often require large amounts of labeled training data, are prone to overfitting within specific domains, and face difficulties adapting to evolving schema conventions—resulting in the need for continuous parameter tuning and retraining to maintain performance (Feng et al. ([2024](https://arxiv.org/html/2507.14376v1#bib.bib14))).

Recent advances in large language models (LLMs) offer a promising alternative for building schema matching frameworks without supervised training. Feng et al. ([2024](https://arxiv.org/html/2507.14376v1#bib.bib14)) proposed a method that computes the cross product of all source and target columns and then uses GPT-4 to perform pairwise verification to identify valid matches. This is followed by complex LLM-based scoring procedures, which add to the already high computational cost of the cross-product approach. For schemas with many tables or columns, such frameworks can quickly become computationally and financially infeasible.

To overcome the inefficiency of exhaustive pairwise comparisons, Sheetrit et al. ([2024](https://arxiv.org/html/2507.14376v1#bib.bib6)) and Seedat and van der Schaar ([2024](https://arxiv.org/html/2507.14376v1#bib.bib3)) propose retrieval-based approaches that bypass the need to evaluate every possible column pair. ReMatch (Sheetrit et al. ([2024](https://arxiv.org/html/2507.14376v1#bib.bib6))) serializes column metadata by concatenating elements such as column names, table names, descriptions, and data types into strings, which are then embedded and indexed for semantic retrieval. Similar candidates are retrieved through semantic search and subsequently ranked and filtered by a large language model (LLM). However, as highlighted by Liu et al. ([2024](https://arxiv.org/html/2507.14376v1#bib.bib15)), the order in which these elements are concatenated can significantly affect performance. Moreover, embeddings generated from long concatenated strings risk losing critical information (Zhou et al. ([2024](https://arxiv.org/html/2507.14376v1#bib.bib16))). ReMatch is also constrained to 1:1 or m:1 matches, meaning each source column or group of columns can align with only a single target column. Building on ReMatch, Matchmaker (Seedat and van der Schaar ([2024](https://arxiv.org/html/2507.14376v1#bib.bib3))) introduces several improvements, with the primary enhancement being a self-reflection mechanism that retrieves dynamic in-context examples evaluated by another LLM during inference. While this creates a more sophisticated scoring pipeline, it also increases computational demands and inherits ReMatch’s limitations, including the restriction to 1:1 and m:1 mappings and susceptibility to information loss from column serialization.

In this work, we address these challenges by proposing a schema matching framework that leverages off-the-shelf large language models in a purely prompt-driven manner, eliminating the need for annotated data or domain-specific fine-tuning. Rather than serializing raw column metadata, we create enriched representations that capture relevant information, avoiding fragile concatenation schemes that require optimization and tuning. Our approach also removes computationally expensive processes like pairwise comparisons and self-reflection, enabling scalability to large schemas. Through rigorous evaluation on standard benchmarks, we demonstrate that our framework not only addresses the key limitations of prior methods but also achieves new state-of-the-art performance. Furthermore, by including a baseline that performs schema matching without retrieval—relying solely on LLM ranking—we empirically highlight the essential role of retrieval in driving performance. We also identify common pitfalls in existing studies, benchmarks, and evaluation protocols, and extend our evaluation to support both 1:n and m:n matching scenarios, providing broader insights to guide future research.

The main contributions of our work are as follows:

-   •
    
    We present a schema matching framework that operates entirely without labeled training data, making it highly generalizable and straightforward to deploy across diverse domains and data ecosystems.
    
-   •
    
    We introduce the first hybrid retrieval architecture for schema matching, combining vector-based semantic search with BM25 lexical retrieval to capture complementary signals.
    
-   •
    
    We demonstrate that metadata enrichment using LLMs is sufficient to align heterogeneous schemas and bridge differences in cross-schema terminology, without relying on complex or computationally intensive methods.
    
-   •
    
    On the MIMIC-OMOP benchmark, our framework achieves a new state-of-the-art, improving HitRate@5 by 7.49% and HitRate@3 by 3.75% over the previously reported best results.
    
-   •
    
    To our knowledge, this is the first LLM-based schema matching framework to openly release its entire codebase enabling transparency, reproducibility, and broader adoption by practitioners and researchers (repo link: https://github.com/ermangungor/schemora).
    
-   •
    
    We empirically demonstrate and quantify the critical importance of retrieval for schema matching by comparing against a retrieval-free LLM baseline.
    
-   •
    
    We also run extensive experiments to provide practical insights into the effects of LLM size and embedding model choice, offering guidance for machine learning practitioners.
    

## 2 Problem Definition

In this paper, we define the schema matching task as taking two relational schemas as input and producing a mapping between the columns of those schemas that convey the same semantic information.

More formally, we are given a source schema Sssubscript𝑆𝑠S\_{s}italic\_S start\_POSTSUBSCRIPT italic\_s end\_POSTSUBSCRIPT consisting of a set of tables {Ts⁢1,Ts⁢2,…}subscript𝑇𝑠1subscript𝑇𝑠2…\\{T\_{s1},T\_{s2},\\ldots\\}{ italic\_T start\_POSTSUBSCRIPT italic\_s 1 end\_POSTSUBSCRIPT , italic\_T start\_POSTSUBSCRIPT italic\_s 2 end\_POSTSUBSCRIPT , … }, where each table Ts⁢isubscript𝑇𝑠𝑖T\_{si}italic\_T start\_POSTSUBSCRIPT italic\_s italic\_i end\_POSTSUBSCRIPT has a set of columns {Cs⁢i⁢1,Cs⁢i⁢2,…}subscript𝐶𝑠𝑖1subscript𝐶𝑠𝑖2…\\{C\_{si1},C\_{si2},\\ldots\\}{ italic\_C start\_POSTSUBSCRIPT italic\_s italic\_i 1 end\_POSTSUBSCRIPT , italic\_C start\_POSTSUBSCRIPT italic\_s italic\_i 2 end\_POSTSUBSCRIPT , … }. Similarly, the target schema is denoted as Stsubscript𝑆𝑡S\_{t}italic\_S start\_POSTSUBSCRIPT italic\_t end\_POSTSUBSCRIPT, consisting of tables {Tt⁢1,Tt⁢2,…}subscript𝑇𝑡1subscript𝑇𝑡2…\\{T\_{t1},T\_{t2},\\ldots\\}{ italic\_T start\_POSTSUBSCRIPT italic\_t 1 end\_POSTSUBSCRIPT , italic\_T start\_POSTSUBSCRIPT italic\_t 2 end\_POSTSUBSCRIPT , … }, each with columns {Ct⁢j⁢1,Ct⁢j⁢2,…}subscript𝐶𝑡𝑗1subscript𝐶𝑡𝑗2…\\{C\_{tj1},C\_{tj2},\\ldots\\}{ italic\_C start\_POSTSUBSCRIPT italic\_t italic\_j 1 end\_POSTSUBSCRIPT , italic\_C start\_POSTSUBSCRIPT italic\_t italic\_j 2 end\_POSTSUBSCRIPT , … }. Each table and column is associated with metadata such as a name and a textual description (e.g., Ts⁢i.nameformulae-sequencesubscript𝑇𝑠𝑖nameT\_{si}.\\text{name}italic\_T start\_POSTSUBSCRIPT italic\_s italic\_i end\_POSTSUBSCRIPT . name, Cs⁢i⁢1.descriptionformulae-sequencesubscript𝐶𝑠𝑖1descriptionC\_{si1}.\\text{description}italic\_C start\_POSTSUBSCRIPT italic\_s italic\_i 1 end\_POSTSUBSCRIPT . description).

The goal of schema matching is to find a mapping function

f:Cs⁢i⁢1→𝒫⁢(Ct):𝑓→subscript𝐶𝑠𝑖1𝒫subscript𝐶𝑡f:C\_{si1}\\rightarrow\\mathcal{P}(C\_{t})italic\_f : italic\_C start\_POSTSUBSCRIPT italic\_s italic\_i 1 end\_POSTSUBSCRIPT → caligraphic\_P ( italic\_C start\_POSTSUBSCRIPT italic\_t end\_POSTSUBSCRIPT )

where Cs⁢i⁢1subscript𝐶𝑠𝑖1C\_{si1}italic\_C start\_POSTSUBSCRIPT italic\_s italic\_i 1 end\_POSTSUBSCRIPT is a source column and Ctsubscript𝐶𝑡C\_{t}italic\_C start\_POSTSUBSCRIPT italic\_t end\_POSTSUBSCRIPT is the set of all target columns, and 𝒫⁢(Ct)𝒫subscript𝐶𝑡\\mathcal{P}(C\_{t})caligraphic\_P ( italic\_C start\_POSTSUBSCRIPT italic\_t end\_POSTSUBSCRIPT ) denotes the power set of Ctsubscript𝐶𝑡C\_{t}italic\_C start\_POSTSUBSCRIPT italic\_t end\_POSTSUBSCRIPT. That is, for each individual source column Cs⁢i⁢1subscript𝐶𝑠𝑖1C\_{si1}italic\_C start\_POSTSUBSCRIPT italic\_s italic\_i 1 end\_POSTSUBSCRIPT, the mapping f⁢(Cs⁢i⁢1)𝑓subscript𝐶𝑠𝑖1f(C\_{si1})italic\_f ( italic\_C start\_POSTSUBSCRIPT italic\_s italic\_i 1 end\_POSTSUBSCRIPT ) returns a set of target columns that are semantically equivalent to, or collectively represent, the same information as Cs⁢i⁢1subscript𝐶𝑠𝑖1C\_{si1}italic\_C start\_POSTSUBSCRIPT italic\_s italic\_i 1 end\_POSTSUBSCRIPT.

This definition explicitly accommodates both one-to-one and one-to-many correspondences between columns. It also implicitly accommodates many-to-one and many-to-many mappings, since multiple source columns (e.g., Cs⁢i⁢1subscript𝐶𝑠𝑖1C\_{si1}italic\_C start\_POSTSUBSCRIPT italic\_s italic\_i 1 end\_POSTSUBSCRIPT and Cs⁢j⁢2subscript𝐶𝑠𝑗2C\_{sj2}italic\_C start\_POSTSUBSCRIPT italic\_s italic\_j 2 end\_POSTSUBSCRIPT) can be mapped to the same set of target columns.

## 3 Methodology

SCHEMORA consists of two primary steps: indexing and querying. In the indexing step, we prepare the search database by enriching and storing the target columns. The querying step involves finding the matching target column in the database for a given source column. Below, we elaborate on each step.

#### 3.0.1 Indexing

Indexing utilizes the target schema to create databases that support vector search and full-text search. This process consists of four steps: enrichment, preprocessing, vector index generation, and full-text search index generation.

Enrichment: The enrichment step involves two types of prompts designed to enhance schema matching performance. The first prompt guides a Large Language Model (LLM) to expand column names by taking into account the table’s name, table description, original column name, and column description. This enrichment aims to transform potentially cryptic column names into semantically rich versions; for instance, "loc\_id" becomes "location identification." While beneficial, this expansion does not fully address inconsistencies in terminology and expressions across different schemas.

To overcome this, a second prompt was developed to instruct the LLM to generate column names without using any words from the table name or column name. This prompt intentionally excludes the column description because it tends to constrain the LLM to the specific schema context, often resulting in the generation of similar names to those produced by the first prompt. By omitting the description, the LLM is encouraged to consider broader semantic possibilities beyond the immediate schema, thus avoiding repetitive naming patterns. For example, the LLM can transform "ward\_id" from a hospital table into "location id," enhancing the likelihood of successful column matches.

Both prompts utilize the Chain-of-Thought (Wei et al. ([2022](https://arxiv.org/html/2507.14376v1#bib.bib17))) method with a one-shot example taken from e-commerce, deliberately chosen outside the evaluation domain (i.e., healthcare) to prevent data leakage. We experimented with generating n𝑛nitalic\_n names per prompt, where n𝑛nitalic\_n serves as a hyperparameter tested at values of 1,2 and 3. Results are detailed in the Results section.

Preprocessing: In the preprocessing step, we clean the generated names by removing punctuation, replacing all numbers with whitespace, and eliminating all parentheses. Additionally, we split the names using snake case or camel case splitters, since the LLM sometimes generates names like LocationID or location\_id.

Vector Index Generation: We use FAISS (Johnson et al. ([2017](https://arxiv.org/html/2507.14376v1#bib.bib18))) to create a vector database for vector searches, employing five different embedding models.

Full-text Search Index Generation: We use the BM25 (Lù ([2024](https://arxiv.org/html/2507.14376v1#bib.bib19))) Python package, which suits small target schemas, adopting the "lucene" scoring method to maintain compatibility with elastic search. No scoring algorithm tuning was performed, opting instead to optimize other hyperparameters such as the LLM and embedding model.

#### 3.0.2 Querying

Enrichment and Preprocessing: These initial steps mirror those introduced in the Indexing section. For brevity, they will not be repeated here.

Candidate Retrieval: Candidates are retrieved using both vector and full-text search for each generated name. Vector search parameters include t⁢o⁢pk\=50𝑡𝑜subscript𝑝𝑘50top\_{k}=50italic\_t italic\_o italic\_p start\_POSTSUBSCRIPT italic\_k end\_POSTSUBSCRIPT = 50 with a cosine similarity threshold of 0.5, while full-text search employs t⁢o⁢pk\=50𝑡𝑜subscript𝑝𝑘50top\_{k}=50italic\_t italic\_o italic\_p start\_POSTSUBSCRIPT italic\_k end\_POSTSUBSCRIPT = 50 with a BM25 score threshold of 1. Although these settings yield high recall, they also introduce reduced precision due to excessive candidate retrieval—addressed in the next step.

Table Selection: A custom prompt directs the LLM to select pertinent tables based on their name and description relative to the source column’s table. This is crucial for filtering out common columns, like patient\_id, which may appear in multiple tables, maintaining manageable candidate numbers.

Ranking: The final ranking step involves compiling all column metadata (original column name, enriched names, table name) and instructing the LLM to rank them.

## 4 Experiment Setup

### 4.1 Baselines

We selected Sheetrit et al. ([2024](https://arxiv.org/html/2507.14376v1#bib.bib6)) and Seedat and van der Schaar ([2024](https://arxiv.org/html/2507.14376v1#bib.bib3)) as our baselines as they also unsupervised LLM based approaches and also they chose databases which allows mapping columns between multiple tables as opposed to matching a one table to another (such as Liu et al. ([2024](https://arxiv.org/html/2507.14376v1#bib.bib15))). Additionally, Seedat and van der Schaar ([2024](https://arxiv.org/html/2507.14376v1#bib.bib3)) presents SOTA supervised schema matching tecnique in their paper along with more traditional methods as their baseline which we direclty adopt to our paper.

In addition to these studies, we have developed an intriguing baseline. With the increasing prompt length of LLMs, many practitioners and researchers have begun to question the necessity of retrieval pipelines. The assumption is that if all candidate matches can be included within an LLM prompt, the model should be able to identify the correct match without the need for retrieval. To test this hypothesis, we used an LLM with the entire target schema as a baseline in our experiments.

### 4.2 Metric

Both baseline papers use a metric referred to as accuracy@K. The formula for accuracy@K in Equation [1](https://arxiv.org/html/2507.14376v1#S4.E1 "In 4.2 Metric ‣ 4 Experiment Setup ‣ SCHEMORA: Schema Matching via Multi-stage Recommendation and Metadata Enrichment using Off-the-Shelf LLMs") is direclty adopted from Sheetrit et al. ([2024](https://arxiv.org/html/2507.14376v1#bib.bib6)).

accuracy@K\=1N⁢∑i\=1N𝕀⁢{∃Ct⁢j:(Cs⁢i,Ct⁢j)∈match,Ct⁢j∈fK⁢(Cs⁢i)}accuracy@K1𝑁superscriptsubscript𝑖1𝑁𝕀conditional-setsubscript𝐶𝑡𝑗formulae-sequencesubscript𝐶𝑠𝑖subscript𝐶𝑡𝑗matchsubscript𝐶𝑡𝑗subscript𝑓𝐾subscript𝐶𝑠𝑖\\text{accuracy@K}=\\frac{1}{N}\\sum\_{i=1}^{N}\\mathbb{I}\\left\\{\\exists C\_{tj}:(C\_% {si},C\_{tj})\\in\\text{match},\\ C\_{tj}\\in f\_{K}(C\_{si})\\right\\}accuracy@K = divide start\_ARG 1 end\_ARG start\_ARG italic\_N end\_ARG ∑ start\_POSTSUBSCRIPT italic\_i = 1 end\_POSTSUBSCRIPT start\_POSTSUPERSCRIPT italic\_N end\_POSTSUPERSCRIPT blackboard\_I { ∃ italic\_C start\_POSTSUBSCRIPT italic\_t italic\_j end\_POSTSUBSCRIPT : ( italic\_C start\_POSTSUBSCRIPT italic\_s italic\_i end\_POSTSUBSCRIPT , italic\_C start\_POSTSUBSCRIPT italic\_t italic\_j end\_POSTSUBSCRIPT ) ∈ match , italic\_C start\_POSTSUBSCRIPT italic\_t italic\_j end\_POSTSUBSCRIPT ∈ italic\_f start\_POSTSUBSCRIPT italic\_K end\_POSTSUBSCRIPT ( italic\_C start\_POSTSUBSCRIPT italic\_s italic\_i end\_POSTSUBSCRIPT ) }

(1)

where:

-   •
    
    N𝑁Nitalic\_N is the total number of queries (source columns).
    
-   •
    
    fK⁢(Cs⁢i)subscript𝑓𝐾subscript𝐶𝑠𝑖f\_{K}(C\_{si})italic\_f start\_POSTSUBSCRIPT italic\_K end\_POSTSUBSCRIPT ( italic\_C start\_POSTSUBSCRIPT italic\_s italic\_i end\_POSTSUBSCRIPT ) is the set of top K𝐾Kitalic\_K candidate matches for source column Cs⁢isubscript𝐶𝑠𝑖C\_{si}italic\_C start\_POSTSUBSCRIPT italic\_s italic\_i end\_POSTSUBSCRIPT.
    
-   •
    
    match is the set of ground truth pairs (Cs⁢i,Ct⁢j)subscript𝐶𝑠𝑖subscript𝐶𝑡𝑗(C\_{si},C\_{tj})( italic\_C start\_POSTSUBSCRIPT italic\_s italic\_i end\_POSTSUBSCRIPT , italic\_C start\_POSTSUBSCRIPT italic\_t italic\_j end\_POSTSUBSCRIPT ) indicating correct matches between source and target columns.
    
-   •
    
    𝕀⁢(⋅)𝕀⋅\\mathbb{I}(\\cdot)blackboard\_I ( ⋅ ) is the indicator function that returns 1 if the condition is true, and 0 otherwise.
    

Krichene and Rendle ([2020](https://arxiv.org/html/2507.14376v1#bib.bib20)) provides a comprehensive overview of evaluation metrics used in the literature. As noted in their work, accuracy@K is equivalent to hitrate@K, a widely used metric in recommendation systems. Furthermore, when there is only one ground truth target per query, both metrics are equivalent to recall@K. The recall@K metric is defined as follows:

Recall@K\=1N⁢∑i\=1N|fK⁢(Cs⁢i)∩GroundTruth⁢(Cs⁢i)||GroundTruth⁢(Cs⁢i)|Recall@K1𝑁superscriptsubscript𝑖1𝑁subscript𝑓𝐾subscript𝐶𝑠𝑖GroundTruthsubscript𝐶𝑠𝑖GroundTruthsubscript𝐶𝑠𝑖\\text{Recall@K}=\\frac{1}{N}\\sum\_{i=1}^{N}\\frac{\\left|\\,f\_{K}(C\_{si})\\cap\\text{% GroundTruth}(C\_{si})\\,\\right|}{|\\text{GroundTruth}(C\_{si})|}Recall@K = divide start\_ARG 1 end\_ARG start\_ARG italic\_N end\_ARG ∑ start\_POSTSUBSCRIPT italic\_i = 1 end\_POSTSUBSCRIPT start\_POSTSUPERSCRIPT italic\_N end\_POSTSUPERSCRIPT divide start\_ARG | italic\_f start\_POSTSUBSCRIPT italic\_K end\_POSTSUBSCRIPT ( italic\_C start\_POSTSUBSCRIPT italic\_s italic\_i end\_POSTSUBSCRIPT ) ∩ GroundTruth ( italic\_C start\_POSTSUBSCRIPT italic\_s italic\_i end\_POSTSUBSCRIPT ) | end\_ARG start\_ARG | GroundTruth ( italic\_C start\_POSTSUBSCRIPT italic\_s italic\_i end\_POSTSUBSCRIPT ) | end\_ARG

(2)

where:

-   •
    
    N𝑁Nitalic\_N is the total number of queries (source columns).
    
-   •
    
    fK⁢(Cs⁢i)subscript𝑓𝐾subscript𝐶𝑠𝑖f\_{K}(C\_{si})italic\_f start\_POSTSUBSCRIPT italic\_K end\_POSTSUBSCRIPT ( italic\_C start\_POSTSUBSCRIPT italic\_s italic\_i end\_POSTSUBSCRIPT ) denotes the set of top K𝐾Kitalic\_K candidate target columns returned by the model for the i𝑖iitalic\_i\-th source column Cs⁢isubscript𝐶𝑠𝑖C\_{si}italic\_C start\_POSTSUBSCRIPT italic\_s italic\_i end\_POSTSUBSCRIPT.
    
-   •
    
    GroundTruth⁢(Cs⁢i)GroundTruthsubscript𝐶𝑠𝑖\\text{GroundTruth}(C\_{si})GroundTruth ( italic\_C start\_POSTSUBSCRIPT italic\_s italic\_i end\_POSTSUBSCRIPT ) is the set of ground truth target columns for Cs⁢isubscript𝐶𝑠𝑖C\_{si}italic\_C start\_POSTSUBSCRIPT italic\_s italic\_i end\_POSTSUBSCRIPT.
    
-   •
    
    |⋅||\\cdot|| ⋅ | denotes set cardinality.
    

### 4.3 Data

We use two datasets that were also employed in our baseline studies. The first dataset, MIMIC, was introduced by the authors of Sheetrit et al. ([2024](https://arxiv.org/html/2507.14376v1#bib.bib6)). In this dataset, the schema of MIMIC-III—a public database of deidentified patient records from the Beth Israel Deaconess Medical Center—is manually aligned to the Observational Medical Outcomes Partnership (OMOP) Common Data Model OHDSI ([2025](https://arxiv.org/html/2507.14376v1#bib.bib21)), an open-source healthcare data standard. This mapping was curated by a domain expert who combined their expertise with an existing mapping from prior work Paris et al. ([2021](https://arxiv.org/html/2507.14376v1#bib.bib22)). When no suitable OMOP attribute could be identified, the corresponding MIMIC-III attribute was labeled as NA. Note that this version differs from the variant available in JZCS2018 ([2025](https://arxiv.org/html/2507.14376v1#bib.bib23)). The full dataset can be accessed at meniData1 ([2024](https://arxiv.org/html/2507.14376v1#bib.bib24)).

The second dataset, referred to here as Synthea, was introduced by the SMAT study Zhang et al. ([2021](https://arxiv.org/html/2507.14376v1#bib.bib11)), which proposed a deep learning approach for schema matching. This dataset offers a partial mapping from the Synthea schema—based on a synthetic healthcare dataset (Walonoski et al. ([2018](https://arxiv.org/html/2507.14376v1#bib.bib25)))—to a subset of OMOP attributes. Unlike MIMIC, which provides a complete mapping of the source schema to OMOP, the Synthea dataset includes only partial correspondences. This dataset is available at JZCS2018 ([2025](https://arxiv.org/html/2507.14376v1#bib.bib23)). Summary statistics for both datasets are presented in Table [1](https://arxiv.org/html/2507.14376v1#S4.T1 "Table 1 ‣ 4.3 Data ‣ 4 Experiment Setup ‣ SCHEMORA: Schema Matching via Multi-stage Recommendation and Metadata Enrichment using Off-the-Shelf LLMs").

Table 1: Summary of the table properties of our two schema matching datasets.

Dataset

Source Tables

Target Tables

Mapping Type

MIMIC-OMOP

26

14

1-to-1

SYNTHEA-OMOP

12

21

m-to-n

A key distinction between these datasets is that MIMIC contains only one-to-one matches, while Synthea includes many-to-many mappings. As discussed in the metric section, the accuracy metric used by prior works is only valid under the assumption of a single ground truth per query (i.e., one-to-one or many-to-one matches). Accordingly, Sheetrit et al. ([2024](https://arxiv.org/html/2507.14376v1#bib.bib6)) limits their evaluation to one-to-one and many-to-one matches by removing queries with one-to-many correspondences. This restriction leaves only 11 out of 38 query columns, which is insufficient for robust evaluation due to high variance; a few correct predictions by chance can significantly affect aggregate results. The follow-up study Seedat and van der Schaar ([2024](https://arxiv.org/html/2507.14376v1#bib.bib3)), which builds on Sheetrit et al. ([2024](https://arxiv.org/html/2507.14376v1#bib.bib6)), presumably applies the same filtering procedure, as it states that it follows the evaluation protocol of Sheetrit et al. ([2024](https://arxiv.org/html/2507.14376v1#bib.bib6)), although it does not specify the details. Notably, since neither of these studies open-sourced their code, we can only speculate about the exact filtering and evaluation steps employed. Therefore, we do not report hit rate for this dataset or compare with baselines. Instead, we use the Synthea data to compute recall@k. By reporting these metrics, we aim to enable future work in schema matching to conduct more thorough and meaningful evaluations, facilitating progress toward more robust and reproducible benchmarks in this field.

## 5 Results and Discussions

### 5.1 Hyper Parameter Selection

The selection of language models, embedding models, and the number of generated names are deemed the most critical parameters for SCHEMORA’s effectiveness. For language models, the choice between GPT-4.1-2025-04-14 and the smaller GPT-4.1-mini-2025-04-14 was crucial to understanding the impact of model size on performance. Regarding embedding models, we experimented with five distinct options to explore how different embedding strategies affect outcomes. Finally, we varied the number of generated names from one to three to determine how diversity in name generation influences overall success. Specifically, we always generated three names but we pick the first n𝑛nitalic\_n names depending on the its value. For these evaluations, we used HitRate@5 as our main metric due to its stability as hitrate@1 was to sensitive to small changes. We maintained a consistent temperature setting of zero across all experiments.

The results, detailed in Table [2](https://arxiv.org/html/2507.14376v1#S5.T2 "Table 2 ‣ 5.1 Hyper Parameter Selection ‣ 5 Results and Discussions ‣ SCHEMORA: Schema Matching via Multi-stage Recommendation and Metadata Enrichment using Off-the-Shelf LLMs"), show that GPT-4.1 significantly outperformed GPT-4.1-mini, achieving an average increase of approximately 10% in HitRate@5 on avereage across all embedding models and numbers of generated names. GPT-4.1 demonstrated the capability to generate superior and more diverse names for each column, while more accurately following instructions and ranking candidates.

The best performance was observed when using the text-embedding-3-large embedding model. This is new and updated model from openai (OpenAI ([2024](https://arxiv.org/html/2507.14376v1#bib.bib26))). Interestingly, bge-small-en-v1.5 showed somewhat similar performance to large embedding models (other than text-embedding-3-large) illustrating that a smaller model can operate on par with much larger models in certain contexts. This effectiveness is largely because both source and target enriched names typically consist of 1-4 words and lack the rich semantic context found in full sentences and paragraphs that large embedding models are potentially optimized for. Moreover, BGE models are specifically trained to capture both string similarity and semantic similarity using a loss function derived from sparse retrieval like BM25 (Chen et al. ([2024](https://arxiv.org/html/2507.14376v1#bib.bib27))).

The lowest HitRate@5 was observed when only one name was generated, likely due to insufficient diversity to capture cross-schema terminologies. In general (8 out of 10 cases), generating three names resulted in a better HitRate@5 compared to two names. Most differences between generating two and three names were marginal, except in a few scenarios where we observed a  5% improvement. Based on this trend, we anticipate that generating more than three names will yield only marginal improvements.

Table 2: Parameter Search

Language

Model Name

Embedding

Model Name

Embedding

Dimension

Number of

Candidates

HitRate@1

HitRate@3

HitRate@5

gpt-4.1-2025-04-14

all-mpnet-base-v2

768

1

41.18%

60.13%

62.75%

gpt-4.1-2025-04-14

all-mpnet-base-v2

768

2

46.41%

67.32%

71.24%

gpt-4.1-2025-04-14

all-mpnet-base-v2

768

3

49.67%

70.59%

76.47%

gpt-4.1-2025-04-14

bge-small-en-v1.5

384

1

43.79%

60.78%

64.71%

gpt-4.1-2025-04-14

bge-small-en-v1.5

384

2

49.67%

70.59%

75.16%

gpt-4.1-2025-04-14

bge-small-en-v1.5

384

3

50.98%

73.20%

77.78%

gpt-4.1-2025-04-14

text-embedding-3-large

3072

1

37.25%

59.48%

64.71%

gpt-4.1-2025-04-14

text-embedding-3-large

3072

2

47.71%

68.63%

74.51%

gpt-4.1-2025-04-14

text-embedding-3-large

3072

3

54.25%

72.55%

80.39%

gpt-4.1-2025-04-14

text-embedding-3-small

1536

1

43.14%

63.40%

68.63%

gpt-4.1-2025-04-14

text-embedding-3-small

1536

2

50.98%

71.90%

77.78%

gpt-4.1-2025-04-14

text-embedding-3-small

1536

3

54.90%

72.55%

78.43%

gpt-4.1-2025-04-14

text-embedding-ada-002

1536

1

45.10%

66.01%

71.90%

gpt-4.1-2025-04-14

text-embedding-ada-002

1536

2

47.06%

70.59%

74.51%

gpt-4.1-2025-04-14

text-embedding-ada-002

1536

3

50.33%

71.90%

76.47%

gpt-4.1-mini-2025-04-14

all-mpnet-base-v2

768

1

35.95%

53.59%

56.21%

gpt-4.1-mini-2025-04-14

all-mpnet-base-v2

768

2

45.10%

64.05%

69.28%

gpt-4.1-mini-2025-04-14

all-mpnet-base-v2

768

3

39.22%

62.75%

67.97%

gpt-4.1-mini-2025-04-14

bge-small-en-v1.5

384

1

28.76%

45.10%

51.63%

gpt-4.1-mini-2025-04-14

bge-small-en-v1.5

384

2

43.79%

61.44%

67.97%

gpt-4.1-mini-2025-04-14

bge-small-en-v1.5

384

3

38.56%

62.75%

67.32%

gpt-4.1-mini-2025-04-14

text-embedding-3-large

3072

1

34.64%

53.59%

56.21%

gpt-4.1-mini-2025-04-14

text-embedding-3-large

3072

2

37.25%

62.09%

67.97%

gpt-4.1-mini-2025-04-14

text-embedding-3-large

3072

3

39.22%

66.01%

69.28%

gpt-4.1-mini-2025-04-14

text-embedding-3-small

1536

1

33.99%

54.90%

62.75%

gpt-4.1-mini-2025-04-14

text-embedding-3-small

1536

2

36.60%

62.75%

68.63%

gpt-4.1-mini-2025-04-14

text-embedding-3-small

1536

3

41.18%

62.09%

69.93%

gpt-4.1-mini-2025-04-14

text-embedding-ada-002

1536

1

31.37%

50.98%

55.56%

gpt-4.1-mini-2025-04-14

text-embedding-ada-002

1536

2

39.87%

60.78%

68.63%

gpt-4.1-mini-2025-04-14

text-embedding-ada-002

1536

3

39.87%

66.01%

69.28%

### 5.2 Baseline Comparison

Based on the results in Table [2](https://arxiv.org/html/2507.14376v1#S5.T2 "Table 2 ‣ 5.1 Hyper Parameter Selection ‣ 5 Results and Discussions ‣ SCHEMORA: Schema Matching via Multi-stage Recommendation and Metadata Enrichment using Off-the-Shelf LLMs"), we selected the parameter combination with GPT-4.1 as the LLM, text-embedding-3-large as the embedding model, and three generated names per column, as this configuration yields the highest HitRate@5. Using these parameters, we compare our method against existing baselines on the MIMIC dataset, as summarized in Table [3](https://arxiv.org/html/2507.14376v1#S5.T3 "Table 3 ‣ 5.2 Baseline Comparison ‣ 5 Results and Discussions ‣ SCHEMORA: Schema Matching via Multi-stage Recommendation and Metadata Enrichment using Off-the-Shelf LLMs").

Table 3: Baseline comparison on MIMIC-OMOP. All results, except for SCHEMORA and Needle-in-the-Stack, are reproduced from Seedat and van der Schaar ([2024](https://arxiv.org/html/2507.14376v1#bib.bib3)).

Method

SCHE MORA

Match maker

ReMatch

Needle-in-the-Stack

Jellyfish-13b

Jellyfish-7b

LLM-DP

SMAT (20-80)

SMAT (50-50)

HitRate@1

54.25%

62.20%

42.50%

23.53%

15.36%

14.25%

29.59%

6.05%

10.85%

HitRate@3

72.55%

68.80%

63.80%

45.10%

N.A.

N.A.

N.A.

N.A.

N.A.

HitRate@5

80.39%

71.10%

72.90%

62.09%

N.A.

N.A.

N.A.

N.A.

N.A.

The results demonstrate that SCHEMORA substantially improves HitRate@3 and HitRate@5 compared to prior methods, outperforming Matchmaker by about 4% at HitRate@3 (72.05% vs. 68.8%) and ReMatch by around 7.5% at HitRate@5 (80.39% vs. 72.9%). This highlights the effectiveness of our approach. Notably, all methods dramatically outperform Needle-in-the-Stack, with margins ranging from 10% to 20% depending on the metric.

The Needle-in-the-Stack results are especially instructive: they reveal the necessity of an effective retrieval mechanism. Even if we could technically provide all candidates within the LLM’s context window, the LLM alone struggles to accurately rank correct matches amid a large set of noisy candidates. This underscores the importance of reducing candidate set size—not only to make the problem tractable for LLMs, but also to reduce noise and enable more precise ranking. Our retrieval-based approach directly addresses these challenges and results in substantially improved performance.

#### 5.2.1 Qualitative Analysis on HitRate@1

Matchmaker exhibits an unexpected and notably unusual retrieval pattern: although it trails SCHEMORA on HitRate@3 and HitRate@5, and only slightly outperforms ReMatch on these metrics, it achieves a striking 8% lead in HitRate@1. This result is surprising because models with comparatively lower overall hit rates rarely demonstrate such a pronounced advantage in top-1 accuracy.

Our analysis reveals that Matchmaker frequently succeeds in challenging tie-breaking scenarios, where multiple candidate columns are nearly indistinguishable—often sharing the exact same name but belonging to different tables. A sample of these cases are presented in Table [4](https://arxiv.org/html/2507.14376v1#S5.T4 "Table 4 ‣ 5.2.1 Qualitative Analysis on HitRate@1 ‣ 5.2 Baseline Comparison ‣ 5 Results and Discussions ‣ SCHEMORA: Schema Matching via Multi-stage Recommendation and Metadata Enrichment using Off-the-Shelf LLMs"). Even for a human reviewer, deciding the correct match in such situations is far from trivial, yet Matchmaker consistently selects the better option.

Table 4: Predicted Matches for Source and Target Columns

Source Target Pred. 1 Pred. 2 TRANSFERS HADM\_ID VISIT\_DETAIL visit\_occurrence\_id VISIT\_OCCURRENCE. visit\_occurrence\_id VISIT\_DETAIL. visit\_occurrence\_id ICUSTAYS HADM\_ID VISIT\_DETAIL visit\_occurrence\_id VISIT\_OCCURRENCE. visit\_occurrence\_id VISIT\_DETAIL. visit\_occurrence\_id SERVICES HADM\_ID VISIT\_DETAIL visit\_occurrence\_id VISIT\_OCCURRENCE. visit\_occurrence\_id VISIT\_DETAIL. visit\_occurrence\_id OUTPUTEVENTS HADM\_ID MEASUREMENT visit\_occurrence\_id VISIT\_OCCURRENCE. visit\_occurrence\_id MEASUREMENT. visit\_occurrence\_id CALLOUT HADM\_ID VISIT\_DETAIL visit\_occurrence\_id VISIT\_OCCURRENCE. visit\_occurrence\_id VISIT\_DETAIL. visit\_occurrence\_id SERVICES TRANSFERTIME VISIT\_DETAIL visit\_detail\_start\_datetime VISIT\_DETAIL. visit\_detail\_end\_datetime VISIT\_DETAIL. visit\_detail\_start\_datetime ICUSTAYS SUBJECT\_ID VISIT\_DETAIL person\_id PERSON. person\_id VISIT\_DETAIL. person\_id OUTPUTEVENTS SUBJECT\_ID MEASUREMENT person\_id PERSON. person\_id MEASUREMENT. person\_id CALLOUT SUBJECT\_ID VISIT\_DETAIL person\_id PERSON. person\_id VISIT\_DETAIL. person\_id CPTEVENTS HADM\_ID PROCEDURE\_OCCURRENCE visit\_occurrence\_id OBSERVATION. visit\_occurrence\_id PROCEDURE\_OCCURRENCE. visit\_occurrence\_id

What remains unclear is how Matchmaker makes these fine-grained distinctions. One possibility is that it employs a undocumented-particularly effective tie-breaking strategy. Another hypothesis is that the evaluation may be based solely on column names, rather than full (table, column) pairs—an approach that would naturally favor models focused on column-level semantics. However, we cannot verify either explanation, as neither the model implementation nor the evaluation pipeline has been made publicly available.

This lack of transparency presents a fundamental challenge for reproducibility. These findings underscore the importance of open-sourcing both model logic and evaluation frameworks to support meaningful, verifiable progress in schema matching.

### 5.3 Ablation Study

The ablation analysis reveals that all components of the schema matching framework are important for optimal performance, but their contributions vary in magnitude. The removal of query enrichment or document enrichment results in the largest drops across all HitRate metrics, confirming the essential role of semantic information from both the query and document sides. Excluding name expansion or table selection also significantly degrades HitRate@1, emphasizing their impact on accurately identifying the top candidate. By comparison, removing embedding search or full-text search produces only moderate decreases, indicating these retrieval strategies are beneficial but not as critical as enrichment and candidate narrowing. Overall, the results underscore that while every module is valuable, semantic enrichment and table selection are particularly vital for robust schema matching.

Table 5: Ablation study on the impact of each component within the schema matching framework. Each row reports performance when the corresponding component is removed.

Component Removed

HitRate@1

HitRate@3

HitRate@5

Query Enrichment

31.58%

40.79%

42.11%

Document Enrichment

32.68%

41.83%

43.14%

Name Expansion Prompt

47.71%

63.40%

67.32%

Embedding Search

53.59%

71.90%

76.47%

Full-text Search

52.29%

69.28%

76.47%

Table Selection

34.64%

56.21%

68.63%

### 5.4 Results for SYNTHEA-OMOP

As previously discussed, SYNTHEA-OMOP contains many-to-many (m:n) matches, and prior studies have misreported hit rates for this dataset. To establish an accurate baseline for future research, we report recall values for this dataset. Results are presented in Table [6](https://arxiv.org/html/2507.14376v1#S5.T6 "Table 6 ‣ 5.4 Results for SYNTHEA-OMOP ‣ 5 Results and Discussions ‣ SCHEMORA: Schema Matching via Multi-stage Recommendation and Metadata Enrichment using Off-the-Shelf LLMs").

Table 6: Recall performance comparison between SCHEMORA and Needle-in-the-Stack.

Method

Recall@1

Recall@3

Recall@5

SCHEMORA

24.33%

66.23%

80.82%

Needle-in-the-Stack

18.10%

47.63%

59.96%

SCHEMORA consistently outperforms Needle-in-the-Stack across all recall levels, with the gap widening at higher thresholds. These results provide a reliable baseline for future evaluations on SYNTHEA-OMOP.

## 6 Related Work

Pre-machine learning approaches to schema matching were primarily heuristic and structural, relying on manually designed rules to identify correspondences. Rahm and Bernstein Rahm and Bernstein ([2001](https://arxiv.org/html/2507.14376v1#bib.bib1)) provided a seminal survey that categorized these early efforts into linguistic, structural, and constraint-based methods, laying a comprehensive foundation for the field. Building on such frameworks, Do and Rahm proposed COMA Do and Rahm ([2002](https://arxiv.org/html/2507.14376v1#bib.bib28)), a system that flexibly combined multiple heuristic techniques to improve matching robustness. Similarly, Cupid Madhavan et al. ([2001](https://arxiv.org/html/2507.14376v1#bib.bib29)) advanced the state of the art by leveraging hierarchical strategies that integrated schema names, data types, and structural relationships to achieve more precise alignment.

The introduction of traditional machine learning techniques marked a pivotal shift, enabling schema matching systems to learn patterns directly from labeled data. A notable early example is LSD by Doan et al. Doan et al. ([2001](https://arxiv.org/html/2507.14376v1#bib.bib7)), which applied a Naive Bayes classifier to the matching problem. This line of research was extended by He and Chang He and Chang ([2004](https://arxiv.org/html/2507.14376v1#bib.bib8)), who demonstrated how classifiers such as SVMs, decision trees, and early neural networks could significantly improve alignment accuracy. Peukert et al. Peukert et al. ([2011](https://arxiv.org/html/2507.14376v1#bib.bib9)) explored ensemble learning to combine multiple supervised models, while Gal Gal ([2011](https://arxiv.org/html/2507.14376v1#bib.bib10)) introduced active learning to reduce annotation costs. YAM++ Bellahsene et al. ([2011](https://arxiv.org/html/2507.14376v1#bib.bib30)) combined supervised classification with heuristic rules for greater adaptability, and other contributions by Duchateau et al. Duchateau et al. ([2009](https://arxiv.org/html/2507.14376v1#bib.bib31)) and Berlin and Motro Berlin and Motro ([2002](https://arxiv.org/html/2507.14376v1#bib.bib32)) highlighted the benefits of multi-level features and decision-tree-driven approaches over purely heuristic baselines.

Embedding models and deep learning architectures have further advanced schema matching by capturing complex latent semantic structures. This category spans from early neural models to more recent transformer-based embedding extraction. Zhang et al. Zhang et al. ([2021](https://arxiv.org/html/2507.14376v1#bib.bib11)) developed a transformer architecture tailored to learn rich schema representations, while Fernandez et al. Fernandez et al. ([2018](https://arxiv.org/html/2507.14376v1#bib.bib33)) leveraged autoencoders, Ebraheem et al. Ebraheem et al. ([2018](https://arxiv.org/html/2507.14376v1#bib.bib34)) applied RNNs in DeepER, and Mudgal et al. Mudgal et al. ([2018](https://arxiv.org/html/2507.14376v1#bib.bib12)) combined CNNs with attention mechanisms in DeepMatcher to significantly improve performance. Sagi and Gal Sagi and Gal ([2018](https://arxiv.org/html/2507.14376v1#bib.bib35)) employed Word2Vec embeddings to capture distributional semantics, and Zhang and Balog Zhang and Balog ([2019](https://arxiv.org/html/2507.14376v1#bib.bib36)) used Siamese networks to compute similarity scores. More recently, transformer models have been fine-tuned or adapted to produce schema embeddings, as demonstrated by Zhang et al. Zhang et al. ([2023b](https://arxiv.org/html/2507.14376v1#bib.bib13)) and Liu et al. Liu et al. ([2023](https://arxiv.org/html/2507.14376v1#bib.bib37)). Magneto Liu et al. ([2024](https://arxiv.org/html/2507.14376v1#bib.bib15)) exemplifies this trend by fine-tuning a specialized embedding model for efficient candidate retrieval, which it then combines with large autoregressive models for prompt-based reranking, illustrating how embedding-centric fine-tuning can be tightly integrated with downstream LLM inference.

The field has also explored directly fine-tuning large autoregressive models for schema matching. For example, Jellyfish-7B Zhang et al. ([2023c](https://arxiv.org/html/2507.14376v1#bib.bib38)) is an instruction-tuned language model trained across diverse data-centric applications, including schema matching, enabling it to flexibly follow complex alignment directives by modifying its internal parameters.

However, all these training-based methods — whether classical supervised learning, deep embeddings, or fine-tuned large models — fundamentally rely on labeled data, which can be scarce and costly to obtain. They also risk overfitting to training distributions and may suffer from model or data drift when underlying schema conventions evolve. In contrast, a growing class of approaches sidesteps these challenges by employing large autoregressive models purely through prompt engineering and retrieval augmentation, without any additional fine-tuning or supervised data. Sheetrit et al. Sheetrit et al. ([2024](https://arxiv.org/html/2507.14376v1#bib.bib6)) introduced a retrieval-enhanced framework that utilizes GPT to generate schema matching predictions on the fly, while Seedat and van der Schaar Seedat and van der Schaar ([2024](https://arxiv.org/html/2507.14376v1#bib.bib3)) proposed a self-improving approach that dynamically refines prompts based on prior outputs. PromptMatcher Feng et al. ([2024](https://arxiv.org/html/2507.14376v1#bib.bib14)) demonstrated how carefully crafted GPT-4 prompts could reduce uncertainty in matching results, highlighting the effectiveness of prompt-centric techniques that rely solely on in-context learning. Our work falls within this category, leveraging prompt-based schema matching to avoid the limitations of training-intensive approaches while achieving robust semantic alignment across heterogeneous schemas.

## 7 Limitations and Future Work

While SCHEMORA demonstrates strong performance, generating a large number of enriched names per column can lead to increased index storage requirements. To address this, future work could explore more efficient indexing strategies. For example, in the case of BM25, concatenating all enriched names for a column into a single document may significantly reduce index size, although this approach might affect token frequency statistics. For vector-based indexes, pooling techniques such as mean or max pooling could be employed to create a single representative embedding per column, avoiding the need to store embeddings for each enriched name individually. Alternatively, clustering or filtering methods could be used to retain a diverse subset of enriched names and embeddings, thereby reducing redundancy while preserving semantic richness. Investigating these approaches could improve index storage efficiency and scalability, enabling SCHEMORA to be applied to larger and more complex datasets.

## 8 Summary and Conclusions

This paper introduced SCHEMORA, a schema matching framework that leverages off-the-shelf large language models and prompt-driven metadata enrichment to align heterogeneous schemas without requiring any labeled data, supervised training, or fine-tuning. By generating context-aware column names and combining semantic and lexical retrieval, SCHEMORA effectively addresses inconsistencies in cross-schema terminology. Our experiments on public healthcare benchmarks demonstrate that SCHEMORA achieves new state-of-the-art performance, improving HitRate@5 on MIMIC-OMOP by 7.5% over previous methods. Notably, we show that it is possible to reach state-of-the-art results using LLMs without any supervised training or domain-specific fine-tuning. Ablation studies and qualitative analysis further highlight that metadata enrichment and multi-stage retrieval are essential for robust schema matching.

Our findings clearly show that metadata enrichment not only enhances schema alignment but can play a significant role in broader database management tasks. The effectiveness of our approach underscores the value of integrating LLM-driven enrichment with retrieval techniques to overcome traditional limitations in schema matching.

Looking ahead, future work will focus on reducing the increased index storage and computational costs introduced by generating multiple enriched names per column. Promising directions include concatenating enriched names into a single document for BM25 indexing, applying pooling strategies for vector embeddings, and filtering for diverse enriched names to minimize redundancy. These efforts aim to further optimize index efficiency and extend SCHEMORA’s applicability to larger and more complex schema matching challenges.

## References

-   Rahm and Bernstein \[2001\] Erhard Rahm and Philip A Bernstein. A survey of approaches to automatic schema matching. _The VLDB Journal_, 10(4):334–350, 2001.
-   Koutras et al. \[2020\] Christos Koutras, George Siachamis, Andra Ionescu, Kyriakos Psarakis, Jerry Brons, Marios Fragkoulis, Christoph Lofi, Angela Bonifati, and Asterios Katsifodimos. Valentine: Evaluating matching techniques for dataset discovery. _arXiv preprint arXiv:2010.07386_, 2020.
-   Seedat and van der Schaar \[2024\] Nabeel Seedat and Mihaela van der Schaar. Matchmaker: Self-improving large language model programs for schema matching. _arXiv preprint arXiv:2410.24105_, 2024.
-   Mecoli et al. \[2023\] Christopher A. Mecoli, Zachary Wang, Will Kelly, Paul Nagy, et al. Conversion of a myositis precision medicine center into a common data model: A case study. Brief report, Observational Health Data Sciences and Informatics (OHDSI), October 2023.
-   Zhang et al. \[2023a\] Yunjia Zhang, Avrilia Floratou, Joyce Cahoon, Subru Krishnan, Andreas C. Müller, Dalitso Banda, Fotis Psallidas, and Jignesh M. Patel. Schema matching using pre-trained language models. In _Proceedings of the 39th IEEE International Conference on Data Engineering (ICDE)_, pages 1558–1571, 2023a. doi:[10.1109/ICDE55515.2023.00123](https://doi.org/10.1109/ICDE55515.2023.00123).
-   Sheetrit et al. \[2024\] Eitam Sheetrit, Menachem Brief, Moshik Mishaeli, and Oren Elisha. Rematch: Retrieval enhanced schema matching with llms. _arXiv preprint arXiv:2403.01567_, 2024.
-   Doan et al. \[2001\] AnHai Doan, Pedro Domingos, and Alon Halevy. Learning to match the schemas of data sources: A multistrategy approach. In _VLDB_, pages 279–290, 2001.
-   He and Chang \[2004\] Ben He and Kevin Chen-Chuan Chang. Automatic schema matching with accuracy estimation. In _CIKM_, pages 300–307. ACM, 2004.
-   Peukert et al. \[2011\] Erik Peukert, Gunter Saake, and Till Papenbrock. A self-configuring schema matching system. In _BTW_, pages 147–166, 2011.
-   Gal \[2011\] Avigdor Gal. Why is schema matching tough and what can we do about it? In _Journal on Data Semantics XV_, pages 144–198. Springer, 2011.
-   Zhang et al. \[2021\] Jing Zhang, Bonggun Shin, Jinho D Choi, and Joyce C Ho. Smat: An attention-based deep learning solution to the automation of schema matching. In _Advances in Databases and Information Systems: 25th European Conference, ADBIS 2021, Tartu, Estonia, August 24–26, 2021, Proceedings 25_, pages 260–274. Springer, 2021.
-   Mudgal et al. \[2018\] Shubham Mudgal, Han Li, Theodoros Rekatsinas, AnHai Doan, Youngchoon Park, Ganesh Krishnan, Rohit Deep, Esteban Arcaute, and Vikram Raghavendra. Deepmatcher: A neural matching framework for entity matching. In _WWW_, pages 339–350, 2018.
-   Zhang et al. \[2023b\] Xueying Zhang, Yingjun Wu, and Lei Chen. Schema matching using pre-trained language models. _arXiv preprint arXiv:2303.10055_, 2023b.
-   Feng et al. \[2024\] Rui Feng, Kai Liu, and Hui Wang. Prompt-matcher: Leveraging gpt-4 to reduce uncertainty in schema matching. _arXiv preprint arXiv:2402.05018_, 2024.
-   Liu et al. \[2024\] Peng Liu, Rui Zhang, and Chao Wang. Magneto: Efficient retrieval-augmented llm matching with small language models. _arXiv preprint arXiv:2406.12345_, 2024.
-   Zhou et al. \[2024\] Yuqi Zhou, Sunhao Dai, Zhanshuo Cao, Xiao Zhang, and Jun Xu. Length\-induced embedding collapse in transformer\-based models. arXiv preprint arXiv:2410.24200, 2024. Submitted to ICLR 2025, Sep 27 2024.
-   Wei et al. \[2022\] Jason Wei, Xuezhi Wang, Dale Schuurmans, Maarten Bosma, Ed H Chi, Quoc V Le, and Denny Zhou. Chain of thought prompting elicits reasoning in large language models. _arXiv preprint arXiv:2201.11903_, 2022. URL [https://arxiv.org/abs/2201.11903](https://arxiv.org/abs/2201.11903).
-   Johnson et al. \[2017\] Jeff Johnson, Matthijs Douze, and Hervé Jégou. Faiss: Facebook ai similarity search. [https://github.com/facebookresearch/faiss](https://github.com/facebookresearch/faiss), 2017. Version 1.7.2.
-   Lù \[2024\] Xing Han Lù. Bm25s: Orders of magnitude faster lexical search via eager sparse scoring, 2024. URL [https://arxiv.org/abs/2407.03618](https://arxiv.org/abs/2407.03618).
-   Krichene and Rendle \[2020\] Walid Krichene and Steffen Rendle. On sampled metrics for item recommendation. In _Proceedings of the 26th ACM SIGKDD international conference on knowledge discovery & data mining_, pages 1748–1757, 2020.
-   OHDSI \[2025\] OHDSI. Ohdsi data standardization. [https://www.ohdsi.org/data-standardization/](https://www.ohdsi.org/data-standardization/), 2025. Accessed: 2025-06.
-   Paris et al. \[2021\] Nicolas Paris, Antoine Lamer, and Adrien Parrot. Transformation and evaluation of the mimic database in the omop common data model: development and usability study. _JMIR Medical Informatics_, 9(12):e30970, 2021.
-   JZCS2018 \[2025\] JZCS2018. Omop-mimic data mapping spreadsheet. [https://github.com/JZCS2018/SMAT/blob/main/datasets/omap/omop\_mimic\_data.xlsx](https://github.com/JZCS2018/SMAT/blob/main/datasets/omap/omop_mimic_data.xlsx), 2025. Accessed: 2025-06-02.
-   meniData1 \[2024\] meniData1. Mimic\_2\_omop: Full schemas of mimic-iii and omop with gold-standard mapping. [https://github.com/meniData1/MIMIC\_2\_OMOP](https://github.com/meniData1/MIMIC_2_OMOP), 2024. Accessed: 2025-06-02.
-   Walonoski et al. \[2018\] Jason Walonoski, Mark Kramer, Joseph Nichols, Andre Quina, Chris Moesel, Dylan Hall, Carlton Duffett, Kudakwashe Dube, Thomas Gallagher, and Scott McLachlan. Synthea: An approach, method, and software mechanism for generating synthetic patients and the synthetic electronic health care record. _Journal of the American Medical Informatics Association_, 25(3):230–238, 2018.
-   OpenAI \[2024\] OpenAI. text-embedding-3-large. [https://platform.openai.com/docs/guides/embeddings/what-are-embeddings](https://platform.openai.com/docs/guides/embeddings/what-are-embeddings), 2024. Accessed: 2024-07-06.
-   Chen et al. \[2024\] Jianlv Chen, Shitao Xiao, Peitian Zhang, Kun Luo, Defu Lian, and Zheng Liu. Bge m3-embedding: Multi-lingual, multi-functionality, multi-granularity text embeddings through self-knowledge distillation, 2024.
-   Do and Rahm \[2002\] Hong Hai Do and Erhard Rahm. Coma: A system for flexible combination of schema matching approaches. In _VLDB_, pages 610–621, 2002.
-   Madhavan et al. \[2001\] Jayant Madhavan, Philip A. Bernstein, and Erhard Rahm. Generic schema matching with cupid. In _VLDB_, pages 49–58, 2001.
-   Bellahsene et al. \[2011\] Zohra Bellahsene, Angela Bonifati, and Erhard Rahm. Yam++: A schema matcher factory. In _ESWC_, pages 421–425. Springer, 2011.
-   Duchateau et al. \[2009\] Fabien Duchateau, Zohra Bellahsene, and Romuald Coletta. A flexible approach for automating complex schema matching tasks. In _BDA_, pages 1–18, 2009.
-   Berlin and Motro \[2002\] Judy Berlin and Amihai Motro. Discovering the semantics of data. In _DS_, pages 1–17, 2002.
-   Fernandez et al. \[2018\] Javier Fernandez, Jürgen Umbrich, and Axel Polleres. Schema matching and data integration with autoencoders. In _ISWC_, pages 127–143, 2018.
-   Ebraheem et al. \[2018\] Mahmoud Ebraheem, Saravanan Thirumuruganathan, Shafiq Joty, Mourad Ouzzani, and Nan Tang. Deeper–deep entity resolution. In _VLDB_, pages 822–833, 2018.
-   Sagi and Gal \[2018\] Oren Sagi and Avigdor Gal. Schema matching with word embeddings. _Journal on Data Semantics_, 7:33–51, 2018.
-   Zhang and Balog \[2019\] Dong Zhang and Krisztian Balog. Table2vec: Neural word and table embeddings for schema matching. In _CIKM_, pages 2061–2064, 2019.
-   Liu et al. \[2023\] Yong Liu, Qi Huang, and Chen Li. Smatch-lm: Zero-shot schema matching with language models. _arXiv preprint arXiv:2305.01182_, 2023.
-   Zhang et al. \[2023c\] Xue Zhang, Wei Li, and Bin Sun. Jellyfish-7b: Instruction-tuned llms for multi-domain matching. _arXiv preprint arXiv:2311.09876_, 2023c.
