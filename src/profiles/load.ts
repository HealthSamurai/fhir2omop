import { readdirSync } from "node:fs";
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
): Promise<{ profiles: types.profiles.Profile[]; valuesets: types.profiles.ValueSet[] }> {
    const cached = (ctx.state as any).profiles;
    if (cached) return cached;

    const dir = resolve(import.meta.dir, "..", "..", "mapspec", "profiles");
    const profiles: types.profiles.Profile[] = [];
    const valuesets: types.profiles.ValueSet[] = [];

    for (const name of readdirSync(dir)) {
        if (!name.endsWith(".json")) continue;
        const raw = JSON.parse(await Bun.file(resolve(dir, name)).text());
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
    const result = { profiles, valuesets };
    (ctx.state as any).profiles = result;
    return result;
}
