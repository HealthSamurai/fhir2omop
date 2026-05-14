# Changelog

All notable changes to this project will be documented in this file.
Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/);
versioning: [SemVer](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- `mapspec/GAPS.md` — single inventory of known mapping gaps with action checklist
- `mapspec/concept-id-analysis.md` + `concept-requests.json` — coverage analysis for all 64 `*_concept_id` columns + structured registry of OMOP-side proposals
- `mapspec/codesystem-mappings.md` + `profiles/system-aliases.json` — FHIR system URL ↔ OMOP `vocabulary_id` map
- `mapspec/views/` — 28 SQL-on-FHIR ViewDefinitions (Stage-1 flatteners) generated from edges
- OSS scaffolding: LICENSE (Apache 2.0), NOTICE, CONTRIBUTING.md, CODE_OF_CONDUCT.md, SECURITY.md, .github/ templates, CI workflow

### Changed
- Removed superseded pre-`mapspec/` docs (`MAPPING.md`, `SOF-MAPPING.md`, `mapping/`, `spec/`, `tasks/`, `plan.md`, `gap-analysis.md`, `state-of-the-art.md`, `TODO.md`)

## [0.1.0] — Initial public release (in progress)

### Added
- Postgres + Athena vocabulary loader (`docker-compose.yml`, `script/init-athena.ts`, `script/load-athena.ts`); 6.4M concepts, 75M ancestor rows
- 28 FHIR R4 → OMOP CDM v5.4 edge mapping specs (`mapspec/edges/*.json`)
- 28 FHIR profiles + 8 ValueSets (`mapspec/profiles/*.json`) gating conversion per OMOP target table
- Per-resource narrative docs (`mapspec/<R>/<table>.md`) with field maps, edge cases, and citations to ~12 reference implementations
- Bun-based documentation UI with htmx partial nav (Tailwind CDN, no build step) — routes `/`, `/profiles`, `/mapspec/<R>/<table>`, `/profiles/<id>`, `/source`
- Procedural `ctx.fns` architecture + REPL hot-reload (adapted from hyper-code2)
- 38 reference implementations vendored as git submodules under `refs/`

[Unreleased]: https://github.com/HealthSamurai/fhir2omop/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/HealthSamurai/fhir2omop/releases/tag/v0.1.0
