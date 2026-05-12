#!/usr/bin/env bun
/**
 * Regenerate mapspec/views/*.view.json as FHIR-flat ViewDefinitions.
 *
 * Premise: a ViewDefinition is the FIRST transformation step (FHIR resource ->
 * flat row in FHIR-native shape). Coded CodeableConcept fields fan out into one
 * column per allowed code system (e.g. code_snomed, code_icd10cm, code_loinc).
 * A SECOND step then translates those source-code columns into OMOP concept_ids
 * by joining vocab.concept (Athena). Each column records its downstream OMOP
 * target via an `omop-column-target` extension so the second step is fully
 * declarative.
 *
 * Source of truth: mapspec/edges/<R>__<T>.json.
 */
import { readdirSync } from "node:fs";
import { resolve } from "node:path";

type EdgeField = {
    omop_column: string;
    fhir_path?: string | null;
    fhir_type?: string;
    omop_type?: string;
    transform?: string;
    notes?: string;
    pk?: boolean;
    fk?: string;
    constant?: any;
};

type Edge = {
    fhir_resource: string;
    omop_table: string;
    direction: string;
    status: string;
    primary?: boolean;
    required?: boolean;
    condition?: string;
    narrative_md?: string;
    implementation_in_project?: string | null;
    fields: EdgeField[];
};

type Vocab = { id: string; system: string; suffix: string };

const VOCABS: Record<string, Vocab> = {
    SNOMED: { id: "SNOMED", system: "http://snomed.info/sct", suffix: "snomed" },
    ICD10CM: { id: "ICD10CM", system: "http://hl7.org/fhir/sid/icd-10-cm", suffix: "icd10cm" },
    ICD10: { id: "ICD10", system: "http://hl7.org/fhir/sid/icd-10", suffix: "icd10" },
    ICD9CM: { id: "ICD9CM", system: "http://hl7.org/fhir/sid/icd-9-cm", suffix: "icd9cm" },
    ICD10PCS: { id: "ICD10PCS", system: "http://www.cms.gov/Medicare/Coding/ICD10", suffix: "icd10pcs" },
    LOINC: { id: "LOINC", system: "http://loinc.org", suffix: "loinc" },
    CPT4: { id: "CPT4", system: "http://www.ama-assn.org/go/cpt", suffix: "cpt" },
    HCPCS: { id: "HCPCS", system: "https://www.cms.gov/Medicare/Coding/HCPCSReleaseCodeSets", suffix: "hcpcs" },
    CVX: { id: "CVX", system: "http://hl7.org/fhir/sid/cvx", suffix: "cvx" },
    RxNorm: { id: "RxNorm", system: "http://www.nlm.nih.gov/research/umls/rxnorm", suffix: "rxnorm" },
    NDC: { id: "NDC", system: "http://hl7.org/fhir/sid/ndc", suffix: "ndc" },
    ATC: { id: "ATC", system: "http://www.whocc.no/atc", suffix: "atc" },
    ActCode: { id: "ActCode", system: "http://terminology.hl7.org/CodeSystem/v3-ActCode", suffix: "actcode" },
    ActEncounterCode: { id: "ActEncounterCode", system: "http://terminology.hl7.org/CodeSystem/v3-ActCode", suffix: "actcode" },
    UCUM: { id: "UCUM", system: "http://unitsofmeasure.org", suffix: "ucum" },
    OMBRace: { id: "OMBRace", system: "urn:oid:2.16.840.1.113883.6.238", suffix: "omb" },
    OMBEthnicity: { id: "OMBEthnicity", system: "urn:oid:2.16.840.1.113883.6.238", suffix: "omb" },
};

/** Maps an edge "fhir_path | omop_column" -> fan-out plan. */
type FanOut = {
    /** Base FHIRPath, e.g. "Condition.code" */
    basePath: string;
    /** Output column prefix, e.g. "code" or "vaccine" or "medication" */
    prefix: string;
    /** Allowed vocabularies. */
    vocabs: string[];
    /** Plain-language column description. */
    desc?: string;
    /** Whether basePath resolves to a CodeableConcept (default) or a single Coding. */
    codingType?: "CodeableConcept" | "Coding";
};

const FAN_OUT: Record<string, FanOut> = {
    "Condition|condition_concept_id": { basePath: "Condition.code", prefix: "code", vocabs: ["SNOMED", "ICD10CM", "ICD9CM", "ICD10"], desc: "Condition code" },
    "Observation|measurement_concept_id": { basePath: "Observation.code", prefix: "code", vocabs: ["LOINC", "SNOMED"], desc: "Measurement code" },
    "Observation|observation_concept_id": { basePath: "Observation.code", prefix: "code", vocabs: ["LOINC", "SNOMED"], desc: "Observation code" },
    "Observation|value_as_concept_id": { basePath: "Observation.valueCodeableConcept", prefix: "value_code", vocabs: ["SNOMED", "LOINC"], desc: "Coded value (when value[x] is CodeableConcept)" },
    "Procedure|procedure_concept_id": { basePath: "Procedure.code", prefix: "code", vocabs: ["CPT4", "HCPCS", "SNOMED", "ICD10PCS", "ICD9CM"], desc: "Procedure code" },
    "AllergyIntolerance|observation_concept_id": { basePath: "AllergyIntolerance.code", prefix: "code", vocabs: ["SNOMED", "RxNorm"], desc: "Substance / allergy code" },
    "AllergyIntolerance|value_as_concept_id": { basePath: "AllergyIntolerance.code", prefix: "value_code", vocabs: ["SNOMED", "RxNorm"], desc: "Substance code as value" },
    "Immunization|drug_concept_id": { basePath: "Immunization.vaccineCode", prefix: "vaccine", vocabs: ["CVX", "NDC", "RxNorm"], desc: "Vaccine code" },
    "Medication|drug_concept_id": { basePath: "Medication.code", prefix: "drug", vocabs: ["RxNorm", "NDC", "ATC", "SNOMED"], desc: "Medication code" },
    "MedicationRequest|drug_concept_id": { basePath: "MedicationRequest.medicationCodeableConcept", prefix: "drug", vocabs: ["RxNorm", "NDC", "ATC", "SNOMED"], desc: "Medication code" },
    "MedicationStatement|drug_concept_id": { basePath: "MedicationStatement.medicationCodeableConcept", prefix: "drug", vocabs: ["RxNorm", "NDC", "ATC", "SNOMED"], desc: "Medication code" },
    "MedicationAdministration|drug_concept_id": { basePath: "MedicationAdministration.medicationCodeableConcept", prefix: "drug", vocabs: ["RxNorm", "NDC", "ATC", "SNOMED"], desc: "Medication code" },
    "MedicationDispense|drug_concept_id": { basePath: "MedicationDispense.medicationCodeableConcept", prefix: "drug", vocabs: ["RxNorm", "NDC", "ATC", "SNOMED"], desc: "Medication code" },
    "DiagnosticReport|measurement_concept_id": { basePath: "DiagnosticReport.code", prefix: "code", vocabs: ["LOINC", "SNOMED"], desc: "Report code" },
    "DiagnosticReport|observation_concept_id": { basePath: "DiagnosticReport.code", prefix: "code", vocabs: ["LOINC", "SNOMED"], desc: "Report code" },
    "DiagnosticReport|procedure_concept_id": { basePath: "DiagnosticReport.code", prefix: "code", vocabs: ["LOINC", "SNOMED", "CPT4"], desc: "Report code" },
    "DiagnosticReport|note_type_concept_id": { basePath: "DiagnosticReport.code", prefix: "code", vocabs: ["LOINC"], desc: "Report type / note code" },
    "Encounter|visit_concept_id": { basePath: "Encounter.class", prefix: "class", vocabs: ["ActCode"], desc: "Encounter class (AMB/IMP/EMER/...)" },
    "Encounter|visit_type_concept_id": { basePath: "Encounter.type", prefix: "type", vocabs: ["SNOMED", "CPT4"], desc: "Encounter type" },
    "Specimen|specimen_concept_id": { basePath: "Specimen.type", prefix: "type", vocabs: ["SNOMED"], desc: "Specimen type" },
    "Specimen|specimen_type_concept_id": { basePath: "Specimen.collection.bodySite", prefix: "body_site", vocabs: ["SNOMED"], desc: "Body site" },
    "Specimen|unit_concept_id": { basePath: "Specimen.collection.quantity.code", prefix: "unit", vocabs: ["UCUM"], desc: "Unit of measure" },
    "Device|device_concept_id": { basePath: "Device.type", prefix: "type", vocabs: ["SNOMED"], desc: "Device type" },
    "Patient|race_concept_id": { basePath: "Patient.extension('http://hl7.org/fhir/us/core/StructureDefinition/us-core-race').extension('ombCategory').value.ofType(Coding)", prefix: "race", vocabs: ["OMBRace"], desc: "OMB race category", codingType: "Coding" },
    "Patient|ethnicity_concept_id": { basePath: "Patient.extension('http://hl7.org/fhir/us/core/StructureDefinition/us-core-ethnicity').extension('ombCategory').value.ofType(Coding)", prefix: "ethnicity", vocabs: ["OMBEthnicity"], desc: "OMB ethnicity category", codingType: "Coding" },
};

/** OMOP columns that are intentionally omitted from the FHIR-flat view because
 * they are pure stage-2 artifacts (concept_id derived from a code that is already
 * exposed as a fan-out column, or constants/sequences). */
const STAGE2_ONLY: Set<string> = new Set([
    // gender_concept_id is derived from the gender column via inline value map.
    // We expose gender (enum) — stage 2 maps it to gender_concept_id.
    "death_type_concept_id",
    "condition_type_concept_id",
    "measurement_type_concept_id",
    "observation_type_concept_id",
    "procedure_type_concept_id",
    "drug_type_concept_id",
    "device_type_concept_id",
    "visit_type_concept_id",
    // *_source_concept_id is a denormalized copy of the source code; stage 2.
    "condition_source_concept_id",
    "measurement_source_concept_id",
    "observation_source_concept_id",
    "procedure_source_concept_id",
    "drug_source_concept_id",
    "device_source_concept_id",
    "specimen_source_concept_id",
    "unit_source_concept_id",
    "value_source_concept_id",
    "route_source_concept_id",
    "stop_reason_source_concept_id",
    "race_source_concept_id",
    "ethnicity_source_concept_id",
    "gender_source_concept_id",
]);

/** Plain-rename rules for non-coded omop columns -> FHIR-flat names. */
const NON_CODED_RENAMES: Record<string, string> = {
    // PKs handled below dynamically
    "person_id": "subject_id",
    "provider_id": "performer_id",
    "visit_occurrence_id": "encounter_id",
    "visit_detail_id": "encounter_detail_id",
    "care_site_id": "managing_organization_id",
    "location_id": "address_id",
};

/** Columns that map straight to a source value -> rename to <prefix>_text. */
const SOURCE_VALUE_RENAMES: Record<string, string> = {
    "condition_source_value": "code_text",
    "measurement_source_value": "code_text",
    "observation_source_value": "code_text",
    "procedure_source_value": "code_text",
    "drug_source_value": "drug_text",
    "device_source_value": "type_text",
    "specimen_source_value": "type_text",
    "race_source_value": "race_text",
    "ethnicity_source_value": "ethnicity_text",
    "gender_source_value": "gender_code",
    "value_source_value": "value_text",
    "unit_source_value": "unit_text",
    "visit_source_value": "class_text",
    "person_source_value": "identifier_value",
    "provider_source_value": "performer_identifier",
    "care_site_source_value": "managing_organization_identifier",
    "stop_reason_source_value": "stop_reason_text",
    "qualifier_source_value": "qualifier_text",
};

function vocabCol(prefix: string, vocab: Vocab, basePath: string, codingType: "CodeableConcept" | "Coding"): { name: string; path: string; type: string; description: string } {
    const path = codingType === "Coding"
        ? `${basePath}.where(system='${vocab.system}').code`
        : `${basePath}.coding.where(system='${vocab.system}').first().code`;
    return {
        name: `${prefix}_${vocab.suffix}`,
        path,
        type: "code",
        description: `${vocab.id} code from ${basePath}`,
    };
}

function textCol(prefix: string, basePath: string, codingType: "CodeableConcept" | "Coding"): { name: string; path: string; type: string; description: string } {
    const path = codingType === "Coding"
        ? `${basePath}.display`
        : `${basePath}.text`;
    return {
        name: `${prefix}_text`,
        path,
        type: "string",
        description: `Free text label from ${basePath}`,
    };
}

function omopExt(column: string, transform?: string) {
    const inner: any[] = [{ url: "column", valueString: column }];
    if (transform) inner.push({ url: "transform", valueString: transform });
    return [{
        url: "https://fhir2omop.health-samurai.io/StructureDefinition/omop-column-target",
        extension: inner,
    }];
}

function vocabTransform(vocab: Vocab): string {
    return `lookup vocab.concept WHERE vocabulary_id='${vocab.id}' AND concept_code = (this column); standard_concept='S' preferred`;
}

function flatFhirPath(p: string | null | undefined): string | undefined {
    if (!p) return undefined;
    // edge fhir_path often contains alternatives joined by " | "; take the first as primary
    return p.split("|")[0].trim();
}

function pkColumn(edge: Edge): { name: string; path: string; type: string; description: string; omop: string } {
    return {
        name: "id",
        path: `${edge.fhir_resource}.id`,
        type: "id",
        description: `FHIR ${edge.fhir_resource}.id; surrogate OMOP key derived (hash/sequence) downstream.`,
        omop: edge.fields.find((f) => f.pk)?.omop_column ?? `${edge.omop_table}_id`,
    };
}

function renameNonCoded(omopColumn: string): string {
    if (omopColumn in NON_CODED_RENAMES) return NON_CODED_RENAMES[omopColumn];
    if (omopColumn in SOURCE_VALUE_RENAMES) return SOURCE_VALUE_RENAMES[omopColumn];
    // strip _concept_id when caller decided not to fan-out (fallback)
    let base = omopColumn.replace(/_concept_id$/, "").replace(/_source_value$/, "_text");
    // strip leading <table>_ if it matches resource table
    return base;
}

function generateColumns(edge: Edge): any[] {
    const cols: any[] = [];
    const seenNames = new Set<string>();
    const push = (c: any) => {
        if (!seenNames.has(c.name)) {
            cols.push(c);
            seenNames.add(c.name);
        }
    };

    // 1. PK as `id`
    const pk = pkColumn(edge);
    push({
        name: pk.name,
        path: pk.path,
        type: pk.type,
        description: pk.description,
        extension: omopExt(pk.omop, "surrogate key from hash/sequence/lookup of FHIR id"),
    });

    // Track which omop columns we've handled.
    const handledOmop = new Set<string>();
    handledOmop.add(pk.omop);

    // 2. Fan-out coded fields.
    for (const f of edge.fields) {
        if (!f.omop_column) continue;
        const key = `${edge.fhir_resource}|${f.omop_column}`;
        const plan = FAN_OUT[key];
        if (!plan) continue;
        handledOmop.add(f.omop_column);

        const ct = plan.codingType ?? "CodeableConcept";
        for (const vid of plan.vocabs) {
            const v = VOCABS[vid];
            if (!v) continue;
            const c = vocabCol(plan.prefix, v, plan.basePath, ct);
            push({
                name: c.name,
                path: c.path,
                type: c.type,
                description: `${plan.desc ?? "coded value"} — ${v.id}`,
                extension: omopExt(f.omop_column, vocabTransform(v)),
            });
        }
        // _text column from the same base
        const t = textCol(plan.prefix, plan.basePath, ct);
        // Find sibling source_value omop column if any
        const sourceValueCol = edge.fields.find((g) =>
            g.omop_column.endsWith("_source_value") &&
            g.omop_column.replace(/_source_value$/, "_concept_id") === f.omop_column.replace(/_concept_id$/, "_concept_id")
        );
        const omopForText = sourceValueCol?.omop_column ?? `${f.omop_column.replace(/_concept_id$/, "")}_source_value`;
        push({
            name: t.name,
            path: t.path,
            type: t.type,
            description: t.description,
            extension: omopExt(omopForText, "copy text verbatim into OMOP source_value column"),
        });
        if (sourceValueCol) handledOmop.add(sourceValueCol.omop_column);
    }

    // 3. Non-coded straight-through fields.
    for (const f of edge.fields) {
        if (handledOmop.has(f.omop_column)) continue;
        if (f.pk) continue;
        if (STAGE2_ONLY.has(f.omop_column)) continue;
        const path = flatFhirPath(f.fhir_path);
        // Skip pure null / computed / constant-only fields (no source path).
        if (!path && f.constant === undefined) continue;
        const isConstant = f.constant !== undefined && !path;
        if (isConstant) {
            // Constants don't belong in the FHIR view — they're injected in stage 2.
            continue;
        }
        const name = renameNonCoded(f.omop_column);
        const transform = f.transform || (f.fk ? `resolve ${f.fk} reference; downstream maps to ${f.omop_column}` : undefined);
        push({
            name,
            path: path!,
            type: f.fhir_type ?? "string",
            description: f.notes ?? "",
            extension: omopExt(f.omop_column, transform),
        });
        handledOmop.add(f.omop_column);
    }
    return cols;
}

function buildView(edge: Edge): any {
    const cols = generateColumns(edge);
    const safeId = `omop-${edge.fhir_resource.toLowerCase().replace(/[^a-z0-9]/g, "")}-${edge.omop_table.replace(/_/g, "-")}`;
    return {
        resourceType: "ViewDefinition",
        id: safeId,
        url: `https://fhir2omop.health-samurai.io/ViewDefinition/${safeId}`,
        version: "0.2.0",
        name: `Omop${edge.fhir_resource}${capitalize(edge.omop_table)}View`,
        title: `${edge.fhir_resource} → ${edge.omop_table} (FHIR-flat, stage 1)`,
        status: "draft",
        experimental: true,
        description: (edge.narrative_md ?? "") + "\n\nStage 1 of FHIR→OMOP: produce a flat row keeping source codes per vocabulary. Stage 2 joins vocab.concept to resolve concept_ids.",
        extension: [
            { url: "https://fhir2omop.health-samurai.io/StructureDefinition/omop-target-table", valueString: edge.omop_table },
            { url: "https://fhir2omop.health-samurai.io/StructureDefinition/omop-edge", valueString: `${edge.fhir_resource}__${edge.omop_table}` },
        ],
        resource: edge.fhir_resource,
        select: [{ column: cols }],
    };
}

function capitalize(s: string): string {
    return s.split(/[_-]/g).map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join("");
}

async function main() {
    const edgesDir = resolve(import.meta.dir, "..", "mapspec", "edges");
    const outDir = resolve(import.meta.dir, "..", "mapspec", "views");
    const files = readdirSync(edgesDir).filter((f) => f.endsWith(".json")).sort();
    let written = 0;
    for (const f of files) {
        const edge = JSON.parse(await Bun.file(resolve(edgesDir, f)).text()) as Edge;
        const view = buildView(edge);
        const outPath = resolve(outDir, `${edge.fhir_resource}__${edge.omop_table}.view.json`);
        await Bun.write(outPath, JSON.stringify(view, null, 2) + "\n");
        console.log(`wrote ${edge.fhir_resource}__${edge.omop_table} (${view.select[0].column.length} cols)`);
        written++;
    }
    console.log(`\nTotal: ${written} view files regenerated.`);
}

main();
