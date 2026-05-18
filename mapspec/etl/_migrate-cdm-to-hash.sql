-- ─────────────────────────────────────────────────────────────────────────────
-- One-shot: re-key the subset of cdm.* we currently diff against
-- (person, visit_occurrence, condition_occurrence, care_site) so that
-- person_id / visit_occurrence_id / care_site_id match the deterministic
-- 64-bit hashes our pipeline produces in cdm_ours_fhir.*.
-- ─────────────────────────────────────────────────────────────────────────────
-- Anchors (same on both sides):
--   person.person_id          = hash(person_source_value)     -- Patient UUID
--   visit_occurrence_id       = hash(visit_source_value)      -- Encounter UUID
--   care_site_id              = hash(care_site_source_value)  -- Org UUID
--
-- Out of scope today (extend when those edges land):
--   • measurement / observation / drug_exposure / procedure_occurrence /
--     device_exposure / note / specimen / *_period / *_era — heavy tables
--     (730k+ rows) we haven't built ETL for yet. Re-run this migration once
--     they matter, expanding the ALTER+UPDATE lists.
--   • provider_id  — cdm uses Practitioner UUID, ours uses NPI (different
--     hash inputs). Resolve by populating cdm.provider.npi from providers.csv
--     OR by switching ours to UUID + NPI→UUID lookup.
--   • location_id  — cdm uses ZIP only, ours uses (city|state|zip) composite.
--
-- Idempotent on already-bigint columns and re-runs of the remap (hash is
-- a pure function of source_value).

BEGIN;

-- ─── 1. INTEGER → BIGINT, only the columns we touch ─────────────────────────
ALTER TABLE cdm.person                ALTER COLUMN person_id              TYPE bigint USING person_id::bigint;
ALTER TABLE cdm.person                ALTER COLUMN care_site_id           TYPE bigint USING care_site_id::bigint;
ALTER TABLE cdm.visit_occurrence      ALTER COLUMN visit_occurrence_id    TYPE bigint USING visit_occurrence_id::bigint;
ALTER TABLE cdm.visit_occurrence      ALTER COLUMN person_id              TYPE bigint USING person_id::bigint;
ALTER TABLE cdm.visit_occurrence      ALTER COLUMN care_site_id           TYPE bigint USING care_site_id::bigint;
ALTER TABLE cdm.care_site             ALTER COLUMN care_site_id           TYPE bigint USING care_site_id::bigint;
ALTER TABLE cdm.condition_occurrence  ALTER COLUMN condition_occurrence_id TYPE bigint USING condition_occurrence_id::bigint;
ALTER TABLE cdm.condition_occurrence  ALTER COLUMN person_id              TYPE bigint USING person_id::bigint;
ALTER TABLE cdm.condition_occurrence  ALTER COLUMN visit_occurrence_id    TYPE bigint USING visit_occurrence_id::bigint;

-- ─── 2. person_id remap ─────────────────────────────────────────────────────
CREATE TEMP TABLE _person_remap ON COMMIT DROP AS
SELECT person_id                                              AS old_id,
       hashtextextended(person_source_value, 0)::bigint       AS new_id
  FROM cdm.person;
CREATE INDEX ON _person_remap(old_id);

UPDATE cdm.condition_occurrence t SET person_id = m.new_id FROM _person_remap m WHERE t.person_id = m.old_id;
UPDATE cdm.visit_occurrence     t SET person_id = m.new_id FROM _person_remap m WHERE t.person_id = m.old_id;
UPDATE cdm.person               t SET person_id = m.new_id FROM _person_remap m WHERE t.person_id = m.old_id;

-- ─── 3. visit_occurrence_id remap ───────────────────────────────────────────
CREATE TEMP TABLE _visit_remap ON COMMIT DROP AS
SELECT visit_occurrence_id                                    AS old_id,
       hashtextextended(visit_source_value, 0)::bigint        AS new_id
  FROM cdm.visit_occurrence;
CREATE INDEX ON _visit_remap(old_id);

UPDATE cdm.condition_occurrence t SET visit_occurrence_id = m.new_id FROM _visit_remap m WHERE t.visit_occurrence_id = m.old_id;
UPDATE cdm.visit_occurrence     t SET visit_occurrence_id = m.new_id FROM _visit_remap m WHERE t.visit_occurrence_id = m.old_id;

-- ─── 4. care_site_id remap ──────────────────────────────────────────────────
CREATE TEMP TABLE _care_site_remap ON COMMIT DROP AS
SELECT care_site_id                                           AS old_id,
       hashtextextended(care_site_source_value, 0)::bigint    AS new_id
  FROM cdm.care_site;
CREATE INDEX ON _care_site_remap(old_id);

UPDATE cdm.person           t SET care_site_id = m.new_id FROM _care_site_remap m WHERE t.care_site_id = m.old_id;
UPDATE cdm.visit_occurrence t SET care_site_id = m.new_id FROM _care_site_remap m WHERE t.care_site_id = m.old_id;
UPDATE cdm.care_site        t SET care_site_id = m.new_id FROM _care_site_remap m WHERE t.care_site_id = m.old_id;

COMMIT;
