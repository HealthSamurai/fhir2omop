import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const DIR = join(import.meta.dir, "..", "..", "mapspec", "profiles");

export type Profile = {
    resourceType: "StructureDefinition";
    id: string;
    url: string;
    name: string;
    title?: string;
    description?: string;
    type: string;
    baseDefinition?: string;
    derivation?: string;
    targetTable?: string;
    edgeKey?: string;
    differential?: { element: any[] };
};

export type ValueSet = {
    resourceType: "ValueSet";
    id: string;
    url: string;
    name: string;
    title?: string;
    description?: string;
    domain?: string;
    expansionSql?: string;
    compose?: { include: Array<{ system: string; concept?: Array<{ code: string; display?: string }> }> };
};

const EXT_TABLE = "https://fhir2omop.health-samurai.io/StructureDefinition/omop-target-table";
const EXT_EDGE = "https://fhir2omop.health-samurai.io/StructureDefinition/omop-edge";
const EXT_DOMAIN = "https://fhir2omop.health-samurai.io/StructureDefinition/omop-domain";
const EXT_SQL = "https://fhir2omop.health-samurai.io/StructureDefinition/omop-expansion-sql";

function readExt(arr: any[] | undefined, url: string): string | undefined {
    return arr?.find((e) => e.url === url)?.valueString;
}

let cache: { profiles: Profile[]; valuesets: ValueSet[] } | null = null;

export function loadAll(): { profiles: Profile[]; valuesets: ValueSet[] } {
    if (cache) return cache;
    const profiles: Profile[] = [];
    const valuesets: ValueSet[] = [];
    for (const name of readdirSync(DIR)) {
        if (!name.endsWith(".json")) continue;
        const raw = JSON.parse(readFileSync(join(DIR, name), "utf-8"));
        if (raw.resourceType === "StructureDefinition") {
            profiles.push({
                ...raw,
                targetTable: readExt(raw.extension, EXT_TABLE),
                edgeKey: readExt(raw.extension, EXT_EDGE),
            });
        } else if (raw.resourceType === "ValueSet") {
            valuesets.push({
                ...raw,
                domain: readExt(raw.extension, EXT_DOMAIN),
                expansionSql: readExt(raw.extension, EXT_SQL),
            });
        }
    }
    profiles.sort((a, b) => a.id.localeCompare(b.id));
    valuesets.sort((a, b) => a.id.localeCompare(b.id));
    cache = { profiles, valuesets };
    return cache;
}

export function byId(id: string): Profile | ValueSet | undefined {
    const { profiles, valuesets } = loadAll();
    return profiles.find((p) => p.id === id) ?? valuesets.find((v) => v.id === id);
}

export function valueSetByUrl(url: string): ValueSet | undefined {
    return loadAll().valuesets.find((v) => v.url === url);
}

export function profileForEdge(resource: string, table: string): Profile | undefined {
    const key = `${resource}__${table}`;
    return loadAll().profiles.find((p) => p.edgeKey === key);
}
