-- Indexes for vocab.* tables. The Athena bundle ships with zero indexes;
-- without them stage-2 ETL falls back to seq-scan over 6M-row vocab.concept
-- and 39M-row vocab.concept_relationship for every lookup.
--
-- Idempotent — CREATE INDEX IF NOT EXISTS.
-- Run once after `bun script/init-athena.ts`.

-- ── vocab.concept — primary lookup keys ─────────────────────────────────────
-- Most common predicate: (vocabulary_id, concept_code) plus optional
-- standard_concept = 'S' filter.
CREATE INDEX IF NOT EXISTS ix_concept_vocab_code        ON vocab.concept (vocabulary_id, concept_code);
CREATE INDEX IF NOT EXISTS ix_concept_id                ON vocab.concept (concept_id);
CREATE INDEX IF NOT EXISTS ix_concept_domain_standard   ON vocab.concept (domain_id, standard_concept) WHERE standard_concept = 'S';

-- ── vocab.concept_relationship — Maps-to walk is the only hot path ──────────
-- 4.5M Maps-to rows out of 39M total → partial index is 11% size.
CREATE INDEX IF NOT EXISTS ix_concept_relationship_mapsto
    ON vocab.concept_relationship (concept_id_1, concept_id_2)
    WHERE relationship_id = 'Maps to' AND invalid_reason IS NULL;

-- General relationship lookup (for other relationship types we might use).
CREATE INDEX IF NOT EXISTS ix_concept_relationship_id1_rel
    ON vocab.concept_relationship (concept_id_1, relationship_id);

-- ── vocab.concept_ancestor — used for hierarchy walks ───────────────────────
CREATE INDEX IF NOT EXISTS ix_concept_ancestor_ancestor   ON vocab.concept_ancestor (ancestor_concept_id);
CREATE INDEX IF NOT EXISTS ix_concept_ancestor_descendant ON vocab.concept_ancestor (descendant_concept_id);

-- ANALYZE so the planner sees the new indexes.
ANALYZE vocab.concept;
ANALYZE vocab.concept_relationship;
ANALYZE vocab.concept_ancestor;
