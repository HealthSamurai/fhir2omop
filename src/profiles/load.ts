import { readdirSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const EXT_TABLE = "https://fhir2omop.health-samurai.io/StructureDefinition/omop-target-table";
const EXT_EDGE = "https://fhir2omop.health-samurai.io/StructureDefinition/omop-edge";
const EXT_DOMAIN = "https://fhir2omop.health-samurai.io/StructureDefinition/omop-domain";
const EXT_SQL = "https://fhir2omop.health-samurai.io/StructureDefinition/omop-expansion-sql";

function readExt(arr: any[] | undefined, url: string): string | undefined {
    return arr?.find((e) => e.url === url)?.valueString;
}

export default async function (
    ctx: Context,
): Promise<{
    profiles: types.profiles.Profile[];
    valuesets: types.profiles.ValueSet[];
    views: types.profiles.ViewDefinition[];
    conceptmaps: any[];
}> {
    const profilesDir = resolve(import.meta.dir, "..", "..", "mapspec", "profiles");
    const viewsDir = resolve(import.meta.dir, "..", "..", "mapspec", "views");

    const profiles: types.profiles.Profile[] = [];
    const valuesets: types.profiles.ValueSet[] = [];
    const views: types.profiles.ViewDefinition[] = [];
    const conceptmaps: any[] = [];

    for (const name of readdirSync(profilesDir)) {
        if (!name.endsWith(".json")) continue;
        const raw = JSON.parse(await Bun.file(resolve(profilesDir, name)).text());
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
        } else if (raw.resourceType === "ConceptMap") {
            conceptmaps.push(raw);
        }
    }

    if (existsSync(viewsDir)) {
        for (const name of readdirSync(viewsDir)) {
            if (!name.endsWith(".json")) continue;
            const raw = JSON.parse(await Bun.file(resolve(viewsDir, name)).text());
            if (raw.resourceType === "ViewDefinition") {
                views.push({
                    ...raw,
                    targetTable: readExt(raw.extension, EXT_TABLE),
                    edgeKey: readExt(raw.extension, EXT_EDGE),
                });
            }
        }
    }

    profiles.sort((a, b) => a.id.localeCompare(b.id));
    valuesets.sort((a, b) => a.id.localeCompare(b.id));
    views.sort((a, b) => a.id.localeCompare(b.id));

    conceptmaps.sort((a, b) => a.id.localeCompare(b.id));
    return { profiles, valuesets, views, conceptmaps };
}
