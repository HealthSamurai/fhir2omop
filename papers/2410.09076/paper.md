# Llettuce: An Open Source Natural Language Processing Tool for the Translation of Medical Terms into Uniform Clinical Encoding

- arXiv: [2410.09076v1](https://arxiv.org/abs/2410.09076v2)
- Published: 2024-10-04
- Source: `https://arxiv.org/html/2410.09076v1`

---
\\addbibresource

references.bib \\DeclareLanguageMappingbritishbritish-apa \\DeclareFieldFormat\[article\]volume\\apanum#1

# Llettuce: An Open Source Natural Language Processing Tool for the Translation of Medical Terms into Uniform Clinical Encoding

James Mitchell-White Centre for Health Informatics, School of Medicine, The University of Nottingham Digital Research Service, The University of Nottingham NIHR Nottingham Biomedical Research Centre Reza Omdivar Digital Research Service, The University of Nottingham NIHR Nottingham Biomedical Research Centre Esmond Urwin Centre for Health Informatics, School of Medicine, The University of Nottingham NIHR Nottingham Biomedical Research Centre Karthikeyan Sivakumar Digital Research Service, The University of Nottingham Ruizhe Li NIHR Nottingham Biomedical Research Centre School of Computer Science, The University of Nottingham Andy Rae Centre for Health Informatics, School of Medicine, The University of Nottingham Xiaoyan Wang Lee Kong Chian School of Medicine, Nanyang Technological University, Singapore Theresia Mina Lee Kong Chian School of Medicine, Nanyang Technological University, Singapore John Chambers Lee Kong Chian School of Medicine, Nanyang Technological University, Singapore Department of Epidemiology and Biostatistics, School of Public Health, Imperial College London, United Kingdom Grazziela Figueredo Centre for Health Informatics, School of Medicine, The University of Nottingham Philip R Quinlan Centre for Health Informatics, School of Medicine, The University of Nottingham

###### Abstract

This paper introduces Llettuce, an open-source tool designed to address the complexities of converting medical terms into OMOP standard concepts. Unlike existing solutions such as the Athena database search and Usagi, which struggle with semantic nuances and require substantial manual input, Llettuce leverages advanced natural language processing, including large language models and fuzzy matching, to automate and enhance the mapping process. Developed with a focus on GDPR compliance, Llettuce can be deployed locally, ensuring data protection while maintaining high performance in converting informal medical terms to standardised concepts.

Keywords: OMOP mapping, LLMs, healthcare data mapping, natural language processing in healthcare data

## 1.   Introduction

The conversion of medical terms to Observable Medical Outcomes Partnership (OMOP) \\parenciteOHDSI2024Data standard concepts is an important part of making data findable, accessible, interoperable, and reusable (FAIR)\\parenciteWilkinson2016FAIR. Unified data standards are often applied inconsistently across healthcare systems \\parenciteHardy2022Data,Cholan2022Encoding, and standardising to a common data model (CDM), such as OMOP is fundamental in enabling robust research pipelines for cohort discovery, and ensuring reliable and reproducible evidence. The process of converting data to OMOP, however, is complex, and not only requires knowledge of the specific domain of the data, but often collaboration from data engineers, software engineers, and healthcare professionals.

In previous work, we developed Carrot Mapper \\parencitecarrot-mapper, and Carrot-CDM \\parencitecarrot-cdm to support the OMOP conversion process. Tooling within this space still requires manual intervention to approve or create mappings, where a data engineer needs to find the most suitable codification to a term. Solutions that help finding codifications include searches in the Observational Health Data Sciences and Informatics (OHDSI) Athena database \\parenciteathena\_ohdsi, or string matching using tools, such as Usagi \\parenciteusagi\_documentation.

The Athena website is a platform for searching and exploring various medical terminologies, vocabularies, and concepts in healthcare research. Users can search for specific terms, view their relationships, and explore detailed metadata. Using Athena search at scale, however, is complicated. When conducting extensive searches, researchers face challenges, including the complexity and overlap of medical vocabularies, the overwhelming volume of search results, and technical constraints, such as system performance and data handling capabilities. Additionally, the standardisation of diverse healthcare datasets presents difficulties in ensuring consistency across different terminologies.

Usagi was developed by OHDSI to facilitate the mapping of source codes to standard concepts within the OMOP CDM. It supports the integration and harmonisation of diverse healthcare data sources. Usagi employs semi-automated string-matching algorithms to suggest potential mappings between local vocabularies and standardised terminologies such as SNOMED CT, LOINC, and RxNorm. It is a valuable tool for mapping, but it has a few limitations. While it automates part of the mapping process, it requires significant manual review, which is time-consuming and prone to human error and uncertainties. String-matching can potentially lead to inaccurate mappings, particularly when dealing with ambiguous or complex terminologies. The effectiveness of Usagi depends on the quality of the standardised vocabularies it uses, and there is a learning curve for new users. As a standalone tool, Usagi does not yet integrate seamlessly with other data processing workflows, requiring additional steps to configure both input and output and thus ensure proper data standardisation. By contrast, novel tools can provide an application programming interface (API) for integration into mapping tools.

Both Athena and Usagi work well when dealing with data with typographical errors. But informal terms for medications or conditions may not closely match the string of the formal concept we wish to map it to. For example, “Now Foods omega-3” is a supplement found in a self-reported patient questionnaire dataset. This supplement is produced by Now Foods, and is an omega-3 product derived from fish oil. In this case, the brand of the drug was given as input. Before obtaining the OMOP concept, we need to map the reported brand to “omega-3 fatty acids”, for which an exact OMOP match is found. Using the Athena search engine, for example, the string matching suggests concepts like “Calcium ascorbate 550 MG Oral Tablet by Now Foods”, “Ubiquinone 90 MG Oral Capsule \[Now Coq10\] by Now Foods” or “Calcium ascorbate 1000 MG Oral Tablet \[Now Ester-C\] by Now Foods”. This indicates that this process of matching loses the semantic information associated with the input data.

Large language models (LLMs) are now a relatively novel alternative to support OMOP. They automate portions of the mapping process while suggesting more semantically relevant mappings. The use of proprietary tools, such as OpenAI ChatGPT \\parencitechatgpt in healthcare, however, raises significant concerns, particularly regarding GDPR compliance, data protection and reproducibility of results \\parenciteNazi2024LLMHealthcare,Deng2024LLMStatus. The handling of sensitive patient data poses risks, as inadvertent data leaks or misuse of information could occur. Ensuring that interactions with OpenAI and other available LLM APIs in the cloud remain within the bounds of GDPR is challenging, especially when dealing with identifiable health information.

In this paper we introduce Llettuce111https://github.com/Health-Informatics-UoN/lettuce, a tool created to address these gaps. It is a standalone, open-source, adaptable natural language processing tool based on Large Language Models, querying systems and fuzzy matching for the conversion of medical terms into the OMOP standard vocabulary. This first version is released under the MIT Licence. Medical terms can be extracted from Electronic Health Records (EHRs), self-reported patient questionnaires and other structured datasets to serve as an input for Llettuce. So for the example above, the Llettuce match output for “Now Foods omega-3” is “Fish oil”.

Llettuce has the following modules and functionalities:

-   •
    
    Vector search for concept(s)
    
-   •
    
    LLM prompting with informal name(s)
    
-   •
    
    OMOP CDM database search
    
-   •
    
    A graphic user interface
    

We demonstrate how Llettuce works and its performance compared to Usagi and ChatGPT on a case study of converting self-reported informal medication names into OMOP concepts. Llettuce performance is comparable to OpenAI models and was developed to run locally to support healthcare data governance requirements.

## 2.   System Architecture

Llettuce was written using Python for both a back-end and a user interface. The back-end comprises a vector store for semantic search, a local LLM to suggest mappings, and queries to a connected OMOP CDM database to provide the details of a suggested mapping to the user.

![Refer to caption](extracted/5901955/Llettuce_Architecture.png)

Figure 1: Natural language processing architecture pipeline

### 2.1 Access via UI or HTTP

All interactions with Llettuce are made via HTTP requests to the Llettuce API. A POST request is made to the Llettuce server containing JSON with the following format:

[⬇](data:text/plain;base64,ICAgIHsKICAgIG5hbWVzOiBbImluZm9ybWFsIG5hbWUgMSIsICJpbmZvcm1hbCBuYW1lIDIiLC4uLiwiaW5mb3JtYWwgbmFtZSBuIl0sCiAgICBwaXBlbGluZV9vcHRpb25zOiB7PE9wdGlvbnMgZm9yIHJ1bm5pbmcgcGlwZWxpbmVzPn0KICAgIH0=)

{

names: \["informal name 1", "informal name 2",...,"informal name n"\],

pipeline\_options: {<Options for running pipelines\>}

}

The pipeline options are optional, so a request can be just a list of informal names.

#### 2.1.1 GUI

For users less comfortable with the command line, a graphical user interface (GUI) is provided. This is built using the Streamlit \\parencitestreamlit Python framework, and presents the user with two options. The first shows a text box where a user can type a comma-separated list of informal names to run through the pipeline. The second allows a user to upload a .csv file and choose a column containing names to run through the pipeline. For either option, the results of the pipeline are shown below the input.

### 2.2 Input

Llettuce uses FastAPI \\parencitefastapi to serve API endpoints. These endpoints allow different combinations of Llettuce modules to be used to find concept names.

### 2.3 Natural Language Processing Pipeline — The Llettuce API

#### 2.3.1 Vector search

LLMs are good generalists for text generation. However, the OMOP CDM has a specialist vocubulary. To bridge this gap, Llettuce uses embeddings of OMOP concepts for semantic search. It has been demonstrated that encoder-only transformers produce representations of language such that semantically related concepts are close in the space of their embeddings \\parencitebengioNeuralProbabilisticLanguage2003, devlinBERTPretrainingDeep2019. Llettuce uses sentence embeddings \\parencitereimersSentenceBERTSentenceEmbeddings2019 to generate embeddings for concepts. These are stored locally in a vector database. FastEmbed \\parenciteQdrantFastembed2024 is a Python library used to generate an embedding for a provided informal name. The embedded concept is compared with the stored vectors and the k𝑘kitalic\_k embeddings with the highest dot-product with the query are retrieved from the database. Models used for embeddings are much smaller than LLMs, so generating an embedding demands less computational resources. Retrieval from the vector database also provides a score for how close the embeddings are to the query vector, so that a perfect match has a score of 1.

The top k𝑘kitalic\_k embeddings are used for retrieval-augmented generation (RAG) \\parencitelewisRetrievalAugmentedGenerationKnowledgeIntensive2021. In RAG mode, the pipeline first queries the vector database. A threshold on the similarity of the embeddings has been set such that embeddings above this are exact matches. If there is an embedding with a score above this threshold, these are provided to the user. If there is no very close match, the embeddings are inserted into a prompt, which serves as input to the LLM, as discussed next. The rationale is that close embeddings may either contain the answer, which the LLM can select, or hints as to what might be close to the right answer.

#### 2.3.2 LLM

Llettuce uses Llama.cpp \\parencitellama-cpp to run the latest Llama LLM from Meta \\parencitedubeyLlamaHerdModels2024. Llama.cpp provides an API for running transformer inference. It detects the available hardware and uses optimisations for efficient inference running on central processing units (CPUs).

The version of Llama tested in our case study has 8 billion parameters (Llama 3.1 8B). Models are trained with each parameter as a 32-bit floating point number. Quantisation was employed to reduce the size of the model, with little loss of accuracy \\parencitedettmersCase4bitPrecision2023, jacobQuantizationTrainingNeural2017. The full precision Llama 3.1 8B requires over 32 Gb RAM to run, whereas the 4-bit quantised model requires less than 5 Gb. Most consumer laptops are therefore able to keep the model in memory.

Llettuce uses Haystack \\parencitehaystack2024 to orchestrate its LLM pipelines. For LLM-only pipelines there is a component that takes an informal name and inserts it into a prompt template, and another which delivers this prompt to the LLM. The prompt used in these cases uses techniques recommended for Llama models \\parenciteMetallamaLlamarecipes2024.

For example, the prompt for RAG contains detailed, explicit instructions

[⬇](data:text/plain;base64,ICAgWW91IGFyZSBhbiBhc3Npc3RhbnQgdGhhdCBzdWdnZXN0cyBmb3JtYWwgUnhOb3JtIG5hbWVzIGZvciBhIG1lZGljYXRpb24uIFlvdSB3aWxsIGJlIGdpdmVuIHRoZSBuYW1lIG9mIGEgbWVkaWNhdGlvbiwgYWxvbmcgd2l0aCBzb21lIHBvc3NpYmx5IHJlbGF0ZWQgUnhOb3JtIHRlcm1zLiBJZiB5b3UgZG8gbm90IHRoaW5rIHRoZXNlIHRlcm1zIGFyZSByZWxhdGVkLCBpZ25vcmUgdGhlbSB3aGVuIG1ha2luZyB5b3VyIHN1Z2dlc3Rpb24uCgogICAgUmVzcG9uZCBvbmx5IHdpdGggdGhlIGZvcm1hbCBuYW1lIG9mIHRoZSBtZWRpY2F0aW9uLCB3aXRob3V0IGFueSBleHRyYSBleHBsYW5hdGlvbi4=)

You are an assistant that suggests formal RxNorm names for a medication. You will be given the name of a medication, along with some possibly related RxNorm terms. If you do not think these terms are related, ignore them when making your suggestion.

Respond only with the formal name of the medication, without any extra explanation.

This part of the prompt also gives the LLM a role, which has been shown to improve consistency in responses\\parencitekongBetterZeroShotReasoning2024. Importantly, the prompt includes providing examples of informal name/formal name pairs, an effective tactic for LLM prompting \\parencitebrownLanguageModelsAre2020:

[⬇](data:text/plain;base64,ICAgIEluZm9ybWFsIG5hbWU6IFR5bGVub2wKICAgIFJlc3BvbnNlOiBBY2V0YW1pbm9waGVuCgogICAgSW5mb3JtYWwgbmFtZTogQWR2aWwKICAgIFJlc3BvbnNlOiBJYnVwcm9mZW4KCiAgICBJbmZvcm1hbCBuYW1lOiBNb3RyaW4KICAgIFJlc3BvbnNlOiBJYnVwcm9mZW4KCiAgICBJbmZvcm1hbCBuYW1lOiBBbGV2ZQogICAgUmVzcG9uc2U6IE5hcHJveGVu)

Informal name: Tylenol

Response: Acetaminophen

Informal name: Advil

Response: Ibuprofen

Informal name: Motrin

Response: Ibuprofen

Informal name: Aleve

Response: Naproxen

Once the LLM has inferred a formal name for the informal name provided, this formal name is used as a concept name in a parameterised OMOP CDM query.

#### 2.3.3 Concept Matches

To retrieve the details of any concept through a Llettuce pipeline, an OMOP CDM database is queried. OMOP CDM queries are generated using an object-relational mapping through SQLAlchemy \\parencitesqlalchemy. The string used for the concept name field is first preprocessed by removing punctuation and stop words and splitting up the words with the pipe character for compatibility with PostgreSQL in-database text search. For example, the string “paracetamol and caffeine” has the stop-word “and” removed, and the remaining words used to build the string “paracetamol | caffeine”. The words of this search term are used for a text search query against the concept names of the selected OMOP vocabularies. Optionally, concept synonyms can be included in this query. The retrieved concept names are then compared with the input by fuzzy string matching, and any names above the threshold are presented to the user.

## 3.   Output

Llettuce pipelines emit JSON containing the results of the pipeline. For example, for a pipeline running the LLM and OMOP query, an input request as follows:

[⬇](data:text/plain;base64,ICAgIHsibmFtZXMiOiBbIkJldG5vdmF0ZSBTY2FscCBBcHBsaWNhdGlvbiJdfQ==)

{"names": \["Betnovate Scalp Application"\]}

returns JSON output for the “events” llm\_output and omop\_output for each name sent to Llettuce.

The llm\_output contains a reply of the LLM’s response, the informal\_name supplied in the request, and meta describing metadata about the LLM’s run.

[⬇](data:text/plain;base64,ewogICAgInJlcGx5IjogIkJldGFtZXRoYXNvbmUiLAogICAgImluZm9ybWFsX25hbWUiOiAiQmV0bm92YXRlIFNjYWxwIEFwcGxpY2F0aW9uIiwKICAgICJtZXRhIjogWwogICAgICAgICAgICB7CiAgICAgICAgICAgICAiaWQiOiAiY21wbC0yMTU3NTQ3Ni1iZDBmLTQyZGUtYmE1My0zMTQzNDFkMGRjMGMiLAogICAgICAgICAgICAgIm9iamVjdCI6ICJ0ZXh0X2NvbXBsZXRpb24iLAogICAgICAgICAgICAgImNyZWF0ZWQiOiAxNzIzODAxMjE5LAogICAgICAgICAgICAgIm1vZGVsIjogPHBhdGggdG8gbW9kZWw+LAogICAgICAgICAgICAgImNob2ljZXMiOiBbewogICAgICAgICAgICAgICAgICAgICJ0ZXh0IjogIkJldGFtZXRoYXNvbmUiLAogICAgICAgICAgICAgICAgICAgICJpbmRleCI6IDAsCiAgICAgICAgICAgICAgICAgICAgImxvZ3Byb2JzIjogbnVsbCwKICAgICAgICAgICAgICAgICAgICAiZmluaXNoX3JlYXNvbiI6ICJzdG9wIgogICAgICAgICAgICAgICAgfV0sCiAgICAgICAgICAgICAidXNhZ2UiOiB7CiAgICAgICAgICAgICAgICAicHJvbXB0X3Rva2VucyI6IDEwMCwKICAgICAgICAgICAgICAgICJjb21wbGV0aW9uX3Rva2VucyI6IDYsCiAgICAgICAgICAgICAgICAidG90YWxfdG9rZW5zIjogMTA1CiAgICAgICAgICAgIH0KICAgICAgICB9CiAgICBdCn0=)

{

"reply": "Betamethasone",

"informal\_name": "Betnovate Scalp Application",

"meta": \[

{

"id": "cmpl\-21575476-bd0f\-42de\-ba53\-314341d0dc0c",

"object": "text\_completion",

"created": 1723801219,

"model": <path to model\>,

"choices": \[{

"text": "Betamethasone",

"index": 0,

"logprobs": null,

"finish\_reason": "stop"

}\],

"usage": {

"prompt\_tokens": 100,

"completion\_tokens": 6,

"total\_tokens": 105

}

}

\]

}

The omop\_output event contains the search\_term sent to the OMOP-CDM, then a CONCEPT array, where each item is a match meeting the threshold set on fuzzy string matching. Each item describes the concept\_name, concept\_id, vocabulary\_id, and concept\_code from the OMOP-CDM’s concept table, followed by the concept\_name\_similarity\_score calculated in Llettuce. Llettuce also has the option to fetch further information from the OMOP-CDM, not enabled in the default configuration, which is included in the entry for each concept.

[⬇](data:text/plain;base64,ewogICAgInNlYXJjaF90ZXJtIjogIkJldGFtZXRoYXNvbmUiLAogICAgIkNPTkNFUFQiOgogICAgICAgIFsKICAgICAgICAgICAgewogICAgICAgICAgICAgICAgImNvbmNlcHRfbmFtZSI6ICJiZXRhbWV0aGFzb25lIiwKICAgICAgICAgICAgICAgICJjb25jZXB0X2lkIjogOTIwNDU4LAogICAgICAgICAgICAgICAgInZvY2FidWxhcnlfaWQiOiAiUnhOb3JtIiwKICAgICAgICAgICAgICAgICJjb25jZXB0X2NvZGUiOiAiMTUxNCIsCiAgICAgICAgICAgICAgICAiY29uY2VwdF9uYW1lX3NpbWlsYXJpdHlfc2NvcmUiOiAxMDAuMCwKICAgICAgICAgICAgICAgICJDT05DRVBUX1NZTk9OWU0iOiBbXSwKICAgICAgICAgICAgICAgICJDT05DRVBUX0FOQ0VTVE9SIjogW10sCiAgICAgICAgICAgICAgICAiQ09OQ0VQVF9SRUxBVElPTlNISVAiOiBbXQogICAgICAgICAgICB9LAogICAgICAgICAgICB7CiAgICAgICAgICAgICAgICAiY29uY2VwdF9uYW1lIjogImJldGFtZXRoYXNvbmUgMSBNRyIsCiAgICAgICAgICAgICAgICAiY29uY2VwdF9pZCI6IDkyMDgyNywKICAgICAgICAgICAgICAgICJ2b2NhYnVsYXJ5X2lkIjogIlJ4Tm9ybSIsCiAgICAgICAgICAgICAgICAiY29uY2VwdF9jb2RlIjogIjMzMjYxNiIsCiAgICAgICAgICAgICAgICAiY29uY2VwdF9uYW1lX3NpbWlsYXJpdHlfc2NvcmUiOiA4My44NzA5Njc3NDE5MzU0OSwKICAgICAgICAgICAgICAgICJDT05DRVBUX1NZTk9OWU0iOiBbXSwKICAgICAgICAgICAgICAgICJDT05DRVBUX0FOQ0VTVE9SIjogW10sCiAgICAgICAgICAgICAgICAiQ09OQ0VQVF9SRUxBVElPTlNISVAiOiBbXQogICAgICAgICAgICB9LAogICAgICAgICAgICAuLi48ZGVzY3JpcHRpb25zIG9mIGZ1cnRoZXIgY29uY2VwdHM+CiAgICAgICAgXQp9)

{

"search\_term": "Betamethasone",

"CONCEPT":

\[

{

"concept\_name": "betamethasone",

"concept\_id": 920458,

"vocabulary\_id": "RxNorm",

"concept\_code": "1514",

"concept\_name\_similarity\_score": 100.0,

"CONCEPT\_SYNONYM": \[\],

"CONCEPT\_ANCESTOR": \[\],

"CONCEPT\_RELATIONSHIP": \[\]

},

{

"concept\_name": "betamethasone 1 MG",

"concept\_id": 920827,

"vocabulary\_id": "RxNorm",

"concept\_code": "332616",

"concept\_name\_similarity\_score": 83.87096774193549,

"CONCEPT\_SYNONYM": \[\],

"CONCEPT\_ANCESTOR": \[\],

"CONCEPT\_RELATIONSHIP": \[\]

},

...<descriptions of further concepts\>

\]

}

The GUI parses this and displays it in a more user-friendly format.

## 4.   Case Study: Medication Dataset

Medication data were obtained from the Health for Life in Singapore (HELIOS) study (IRB approval by Nanyang Technological University: IRB-2016-11-030), a phenotyped longitudinal population cohort study comprising 10,004 multi-ethnic Asian population of Singapore aged 30-85 years \\parencitewangHealthLifeSingapore2024. Participants in the HELIOS study were recruited from the Singapore general population between 2018 and 2022 and underwent extensive clinical, behavioural, molecular and genetic characterisation. With rich baseline data and long-term follow-up through linkage to national health data, the HELIOS study provides a unique and world class resource for biomedical researchers across a wide range of disciplines to understand the aetiology and pathogenesis of diverse disease outcomes in Asia, with potential to improve health and advance healthcare for Asian populations.

To facilitate scalable and collaborative research, the HELIOS study implements the OMOP-CDM. However, mapping medication data to OMOP concepts poses significant challenges, primarily due to the complexities involved in standardising medication names. In the HELIOS study, medication data were self-reported and manually entered via nurse-administered questionnaires, therefore, medications with brand name, abbreviations, typographic misspellings or phonetic errors, or combined medications could be recorded. All of these sources of imprecision make mapping to a controlled medical vocabulary more difficult and require significant manual data cleaning.

### 4.1 Data Description

The first 400 examples from the medication dataset were selected for our experiments and comparison. For each instance, the best OMOP concept, as well as a broader set of concepts which could match the informal name were compiled by human annotation.

For example, for “Memantine HCl”, the best OMOP concept is “memantine hydrochloride”, although “memantine” is another acceptable answer. For a branded medication, the concept representing the branded product is the most appropriate OMOP concept. The generic ingredient names can be included in a broader set of acceptable concepts, provided all the ingredients are listed within the concept. For example, for “cocodamol capsule”, “Acetaminophen / Codeine Oral Capsule \[Co-codamol\]” would be the best match, but “acetaminophen/codeine” would be accepted as a broader definition. This also further illustrates the challenges with mapping and the potential uncertainties that the problem presents.

Of the 400 examples, 25 were graded as “Not Parsable”. These were either formulations containing several ingredients where the formulation has no concept in the OMOP CDM, e.g. “lipesco”, which contains lipoic acid and four vitamins and is not in the OMOP CDM; or where the name could not be resolved, e.g. “Hollister (gout)”.

### 4.2 Experimental Design

The data instances were run through the vector search and LLM portions of the pipeline and compared with the human annotations. The top 5 results from the vector search were used. Responses were assessed by:

1.  1.
    
    Whether the input is an exact match to an OMOP concept
    
2.  2.
    
    Whether the correct OMOP concept is in the result of the vector search
    
3.  3.
    
    Whether the LLM provides the correct answer
    
4.  4.
    
    If the answer was incorrect, whether it is a relevant OMOP concept
    

The same examples were used as input for Usagi and vector search. For each example and both methods, the top 5 results were taken and each response was classified by whether the correct mapping or a relevant mapping was found.

### 4.3 Results

Table [1](https://arxiv.org/html/2410.09076v1#S4.T1 "Table 1 ‣ 4.3.1 Comparison between vector search and Usagi ‣ 4.3 Results ‣ 4. Case Study: Medication Dataset ‣ Llettuce: An Open Source Natural Language Processing Tool for the Translation of Medical Terms into Uniform Clinical Encoding") describes the results of comparing Usagi with Llettuce’s vector search. The number of results with at least one relevant concept in the top 5 was very similar between the methods (68% for both). However, Llettuce outperformed Usagi in returning the correct concept in the top 5 (44% for Usagi, 54% for Llettuce).

#### 4.3.1 Comparison between vector search and Usagi

Method

Correct in top 5

Relevant in top 5

Usagi

177

272

LLettuce

214

271

Table 1: Comparison of Usagi and Llettuce results

Score

Concept name

Concept ID

0.28

Folplex (folate 2.2 MG / cyanocobalamin 1 MG / pyridoxine 25 MG) Oral Tablet

1387722

0.24

CLOSTRIDIUM TETANI TOXOID ANTIGEN (FORMALDEHYDE INACTIVATED)

36858760

0.23

lamotrigine Blue (For Patients Taking Valproate)

19128212

0.21

oliceridine 30 MG per 30 ML (For PCA Use Only) Injection

37003593

0.21

Iferex 150 Forte (folate 1 MG / polysaccharide iron complex 150 MG / cyanocobalamin 0.025 MG) Oral Capsule

40234455

Table 2: The top five results searching Usagi for “Nasonex (for each nostril)”

Usagi performs well when used to find concepts where the input has a typographical error. Its shortcomings can be illustrated by how it responds to various descriptions of the mometasone furoate nasal spray, “nasonex”. In the examples, dosage information, such as “Nasonex (for each nostril)” produces the output shown in Table [2](https://arxiv.org/html/2410.09076v1#S4.T2 "Table 2 ‣ 4.3.1 Comparison between vector search and Usagi ‣ 4.3 Results ‣ 4. Case Study: Medication Dataset ‣ Llettuce: An Open Source Natural Language Processing Tool for the Translation of Medical Terms into Uniform Clinical Encoding") for the top five results.

#### 4.3.2 Comparison with GPT-3

![Refer to caption](extracted/5901955/evaluation_sankey.png)

Figure 2: Sankey diagram of outputs from the LLettuce NLP pipeline

Correct

Incorrect

Total

Not parsable

25

Parsable

Exact match

39

Not exact match

Answer in vector search

139

36

175

Answer not in vector search

54

107

161

Total

193

143

400

Table 3: Outputs from the LLettuce NLP pipeline

Of the 336 examples where the input was parsable into an OMOP concept, and the input was not an exact match to an OMOP concept, Llettuce could correctly identify 193, or 48.25%. GPT-3 could correctly identify 57.75%. Both provided inexact but matching concepts, 44 (11%) for Llettuce and 67 (16.75%) for GPT-3. The top 5 vector matches retrieved the correct concept for 21 of the 99 inputs incorrectly answered by Llettuce. 232 informal names could be directly mapped onto the best available OMOP concept (if exact matches are included). Of the remaining concepts, 78 had no output that neither included the correct concept nor produced a relevant OMOP concept. Llettuce’s pipeline does not perform as well as GPT-3, which is only absolutely incorrect on 38 names. However, it achieves this run locally on consumer hardware, using a much smaller model and preserving confidentiality.

![Refer to caption](extracted/5901955/gpt3_lettuce_comparison.png)

Figure 3: Comparison of results between GPT-3 and Llettuce

The time taken to run the Llettuce pipeline on 400 concepts was 55 minutes, 15 seconds, using a 2.8GHz quad-core Intel i7 CPU, 16 Gb RAM. The median time to run inference was 8.7 seconds.

![Refer to caption](extracted/5901955/inference_times.png)

Figure 4: Inference times (run on macOS, 2.8GHz quad-core Intel i7, 16 Gb RAM)

## 5.   Conclusions

Llettuce demonstrates the possibilities of using deep-learning approaches to map data to OMOP concepts. Combining vector search with a large language model results in comparable performance with the larger GPT-3 model. This shows that the advantages of neural-network based natural language processing can be leveraged to produce medical encodings, even in a setting where confidentiality is essential.

The comparison with string matching methods is also informative.String matching cannot learn the salience of different parts of the string. In the example above, the part of the string "(for each nostril)", as it is longer, is treated as more important; the algorithm doesn’t know to ignore that part. By contrast, Llettuce’s vector search correctly includes Nasonex in almost all of its inputs, and correctly identifies the active ingredient. It should be noted that in this version of Llettuce only the RxNorm vocabulary was vectorised, where Usagi also used the RxNorm extension. This dataset is also one at which Usagi is relatively good, as it mostly involves extracting a single word, or correcting typographical errors. Anecdotally, Usagi performs worse on other tasks, where the input is longer and semantics are more important. This is where vector search is likely to perform far better. Crucially, an embedding model is trainable, where string comparison is not.

Optimisations will be possible in later versions. The models used for both embeddings and text generation are general purpose models (bge-small-en-v1.5 and Llama-3.1-8B respectively). Existing specialist models either fine-tuned or trained ab initio \\parencitepubmedbert on biomedical literature will be tested for performance on Llettuce tasks. Further development will come from fine-tuned models developed in-house. Our local deployment of Llettuce will implement data collection and record prompts and responses, alongside the final mapping made. This data will be used to fine-tune the models used. It’s important to emphasise that this data collection will be strictly limited to our specific local deployment of the tool. The publicly available version will not collect any user data or interactions, maintaining the confidentiality and privacy of health information processed by other users.

## Funding

This research was funded by the NIHR Nottingham Biomedical Research Centre.

## Data Availability

Data access requests can be submitted to the HELIOS Data Access Committee by emailing helios\_science@ntu.edu.sg for details.

## Acknowledgments

The authors thank those people or institutions that have helped you in the preparation of the manuscript.

\\printbibliography
