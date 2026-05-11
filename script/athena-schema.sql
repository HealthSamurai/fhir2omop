-- OMOP CDM v5.4 vocabulary tables (subset distributed in Athena bundles).
-- Extracted from CommonDataModel/inst/ddl/5.4/postgresql/OMOPCDM_postgresql_5.4_ddl.sql.

CREATE SCHEMA IF NOT EXISTS vocab;
CREATE SCHEMA IF NOT EXISTS vocab_staging;

DROP TABLE IF EXISTS vocab.concept_ancestor;
DROP TABLE IF EXISTS vocab.concept_synonym;
DROP TABLE IF EXISTS vocab.concept_relationship;
DROP TABLE IF EXISTS vocab.relationship;
DROP TABLE IF EXISTS vocab.drug_strength;
DROP TABLE IF EXISTS vocab.concept;
DROP TABLE IF EXISTS vocab.concept_class;
DROP TABLE IF EXISTS vocab.domain;
DROP TABLE IF EXISTS vocab.vocabulary;

CREATE TABLE vocab.vocabulary (
    vocabulary_id          varchar(20)  NOT NULL,
    vocabulary_name        varchar(255) NOT NULL,
    vocabulary_reference   varchar(255),
    vocabulary_version     varchar(255),
    vocabulary_concept_id  integer      NOT NULL
);

CREATE TABLE vocab.domain (
    domain_id          varchar(20)  NOT NULL,
    domain_name        varchar(255) NOT NULL,
    domain_concept_id  integer      NOT NULL
);

CREATE TABLE vocab.concept_class (
    concept_class_id          varchar(20)  NOT NULL,
    concept_class_name        varchar(255) NOT NULL,
    concept_class_concept_id  integer      NOT NULL
);

CREATE TABLE vocab.concept (
    concept_id         integer      NOT NULL,
    concept_name       varchar(255) NOT NULL,
    domain_id          varchar(20)  NOT NULL,
    vocabulary_id      varchar(20)  NOT NULL,
    concept_class_id   varchar(20)  NOT NULL,
    standard_concept   varchar(1),
    concept_code       varchar(50)  NOT NULL,
    valid_start_date   date         NOT NULL,
    valid_end_date     date         NOT NULL,
    invalid_reason     varchar(1)
);

CREATE TABLE vocab.relationship (
    relationship_id           varchar(20)  NOT NULL,
    relationship_name         varchar(255) NOT NULL,
    is_hierarchical           varchar(1)   NOT NULL,
    defines_ancestry          varchar(1)   NOT NULL,
    reverse_relationship_id   varchar(20)  NOT NULL,
    relationship_concept_id   integer      NOT NULL
);

CREATE TABLE vocab.concept_relationship (
    concept_id_1      integer      NOT NULL,
    concept_id_2      integer      NOT NULL,
    relationship_id   varchar(20)  NOT NULL,
    valid_start_date  date         NOT NULL,
    valid_end_date    date         NOT NULL,
    invalid_reason    varchar(1)
);

CREATE TABLE vocab.concept_synonym (
    concept_id            integer       NOT NULL,
    concept_synonym_name  varchar(1000) NOT NULL,
    language_concept_id   integer       NOT NULL
);

CREATE TABLE vocab.concept_ancestor (
    ancestor_concept_id        integer NOT NULL,
    descendant_concept_id      integer NOT NULL,
    min_levels_of_separation   integer NOT NULL,
    max_levels_of_separation   integer NOT NULL
);

CREATE TABLE vocab.drug_strength (
    drug_concept_id              integer NOT NULL,
    ingredient_concept_id        integer NOT NULL,
    amount_value                 numeric,
    amount_unit_concept_id       integer,
    numerator_value              numeric,
    numerator_unit_concept_id    integer,
    denominator_value            numeric,
    denominator_unit_concept_id  integer,
    box_size                     integer,
    valid_start_date             date    NOT NULL,
    valid_end_date               date    NOT NULL,
    invalid_reason               varchar(1)
);
