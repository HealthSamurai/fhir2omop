# Security Policy

## Reporting a Vulnerability

If you find a security issue in fhir2omop, **please do not open a public
GitHub issue**. Email **security@health-samurai.io** (or
**niquola@health-samurai.io** as a fallback) with:

- A description of the issue and its impact
- Steps to reproduce
- Any suggested mitigation, if you have one

We aim to acknowledge reports within 3 business days and have an initial
assessment within 7 days.

## Scope

In-scope:
- This repository (mapspec, src, script, profiles, views)
- The Postgres/Athena bootstrap (`docker-compose.yml`, `script/init-athena.ts`)

Out of scope:
- The OMOP CDM submodule (report upstream to [OHDSI/CommonDataModel](https://github.com/OHDSI/CommonDataModel))
- Reference implementations under `refs/` — report to their respective projects
- FHIR R4 specification content

## Supported Versions

This project is in alpha. Only `master` is supported; tagged releases will
follow once the runtime stabilises.

## Known operational notes

- The Athena vocab bundle (`gs://atomic-ehr-athena-vocab/`) contains
  publicly licensed terminology only. CPT4 names require a UMLS API key
  to hydrate (`script/init-athena.ts` does not download CPT4 names).
- The dev server (`bun src/$main.ts`) is intended for local use; do not
  expose port 3000 publicly without an auth layer.
- The Postgres container in `docker-compose.yml` uses default credentials
  (`athena/athena`) for local development — change before deploying.
