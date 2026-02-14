# fhir2omop

FHIR R4 to OMOP CDM v5.4 mapping project.

## Setup

```bash
git clone --recursive https://github.com/HealthSamurai/fhir2omop.git
cd fhir2omop
bun run init
```

Or if already cloned:

```bash
bun run init
```

This will:
1. Install dependencies
2. Initialize git submodules (OMOP CDM, reference implementations)
3. Download FHIR R4 Core definitions

## Scripts

```bash
# Search FHIR resources
bun scripts/fhir-structuredef.ts Patient
bun scripts/fhir-structuredef.ts --pretty Observation

# Search FHIR ValueSets and CodeSystems
bun scripts/fhir-valueset.ts gender
bun scripts/fhir-codesystem.ts --full administrative-gender

# Search OMOP tables
bun scripts/omop-table.ts person
bun scripts/omop-table.ts --pretty --desc condition_occurrence

# Custom SQL queries on OMOP CDM
bun scripts/omop-table.ts --sql "SELECT * FROM fields WHERE fkTableName = 'CONCEPT'"
```

## Project Structure

```
CommonDataModel/  # OMOP CDM submodule
fhir-core/        # Downloaded FHIR R4 definitions
refs/             # Reference implementations + summaries
scripts/          # Query utilities
spec/             # Mapping specifications
src/              # Source code
```

## Documentation

- `CLAUDE.md` - Project instructions and script reference
- `spec/overview.md` - FHIR to OMOP mapping overview
- `spec/patient.md` - Patient resource mapping specification
- `sources.md` - OMOP/OHDSI resources
- `cdm.md` - OMOP CDM table index

## License

Apache 2.0
