#!/usr/bin/env bun
// Generate SQL-on-FHIR ViewDefinition resources from mapspec/edges/*.json.
// Output: mapspec/views/<Resource>__<table>.view.json
//
// One ViewDefinition per edge. Each field with a concrete fhir_path becomes
// a select.column. Fields with constants or null fhir_path are skipped (they
// are populated downstream in the OMOP-shaped SQL, not by the VD flattener).

import { readdirSync } from "node:fs";
import { join, resolve, basename } from "node:path";

const ROOT = resolve(import.meta.dir, "..");
const EDGES_DIR = join(ROOT, "mapspec", "edges");
const VIEWS_DIR = join(ROOT, "mapspec", "views");

await Bun.$`mkdir -p ${VIEWS_DIR}`.quiet();

function viewIdFor(resource: string, table: string): string {
    return `omop-${resource.toLowerCase()}-${table.replace(/_/g, "-")}`;
}

function pickType(omopType: string | undefined, fhirType: string | undefined): string | undefined {
    if (fhirType && fhirType !== "null") return fhirType;
    if (!omopType) return undefined;
    if (/^varchar/i.test(omopType) || omopType === "text") return "string";
    if (/^int/i.test(omopType) || omopType === "integer") return "integer";
    if (omopType === "date") return "date";
    if (omopType === "datetime") return "dateTime";
    if (omopType === "numeric" || omopType === "decimal") return "decimal";
    return undefined;
}

type Edge = {
    fhir_resource: string;
    omop_table: string;
    condition?: string;
    narrative_md?: string;
    fields: Array<{
        omop_column: string;
        fhir_path?: string | null;
        fhir_type?: string;
        omop_type: string;
        notes?: string;
        constant?: any;
        transform?: string;
        required?: boolean;
        pk?: boolean;
    }>;
};

let written = 0;
let skipped = 0;

for (const file of readdirSync(EDGES_DIR).sort()) {
    if (!file.endsWith(".json")) continue;
    const edge = JSON.parse(await Bun.file(join(EDGES_DIR, file)).text()) as Edge;
    const id = viewIdFor(edge.fhir_resource, edge.omop_table);

    const columns = (edge.fields ?? [])
        .filter((f) => typeof f.fhir_path === "string" && f.fhir_path.trim() !== "" && f.constant === undefined)
        .map((f) => {
            const col: any = {
                name: f.omop_column,
                path: f.fhir_path!,
            };
            const t = pickType(f.omop_type, f.fhir_type);
            if (t) col.type = t;
            if (f.notes || f.transform) {
                col.description = [f.notes, f.transform ? `transform: ${f.transform}` : null]
                    .filter(Boolean).join(" — ");
            }
            return col;
        });

    if (columns.length === 0) {
        skipped++;
        console.log(`skip ${file} (no concrete fhir paths)`);
        continue;
    }

    const view: any = {
        resourceType: "ViewDefinition",
        id,
        url: `https://fhir2omop.health-samurai.io/ViewDefinition/${id}`,
        version: "0.1.0",
        name: `Omop${edge.fhir_resource}${edge.omop_table.split("_").map(s => s[0]?.toUpperCase() + s.slice(1)).join("")}View`,
        title: `${edge.fhir_resource} → ${edge.omop_table} (flat)`,
        status: "draft",
        experimental: true,
        description: edge.narrative_md
            ?? `Flat projection of FHIR ${edge.fhir_resource} for OMOP ${edge.omop_table} ETL. Stage 1 of ELT pipeline — Stage 2 joins on vocab.concept to assign concept_ids.`,
        extension: [
            { url: "https://fhir2omop.health-samurai.io/StructureDefinition/omop-target-table", valueString: edge.omop_table },
            { url: "https://fhir2omop.health-samurai.io/StructureDefinition/omop-edge", valueString: `${edge.fhir_resource}__${edge.omop_table}` },
        ],
        resource: edge.fhir_resource,
        select: [
            { column: columns },
        ],
    };

    if (edge.condition) {
        view.where = [{ path: "true", description: edge.condition }];
    }

    const out = join(VIEWS_DIR, `${edge.fhir_resource}__${edge.omop_table}.view.json`);
    await Bun.write(out, JSON.stringify(view, null, 2) + "\n");
    written++;
    console.log(`wrote ${basename(out)} (${columns.length} columns)`);
}

console.log(`\n${written} written, ${skipped} skipped`);
