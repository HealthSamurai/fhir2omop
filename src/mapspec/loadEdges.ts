import { readdirSync, readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

// Load all edge JSONs and decorate `status` from disk reality (view + sql
// presence overrides whatever the JSON says, because JSON's `status` field
// used to refer to the long-gone src/mapper/*.ts implementation).
//
//   ctx.fns.mapspec.loadEdges(ctx) → Edge[]
//
// Cached per-process; call invalidateCache via the standalone fn or just
// reload this module via repl.
export interface Edge {
    fhir_resource: string;
    omop_table: string;
    direction: string;
    status: string;
    primary?: boolean;
    required?: boolean;
    condition?: string;
    narrative_md?: string;
    fields: any[];
    vocabularies?: any[];
    references?: any[];
    edge_cases?: any[];
}

const mapspecDir = resolve(import.meta.dir, "..", "..", "mapspec");
const edgesDir   = resolve(mapspecDir, "edges");
const viewsDir   = resolve(mapspecDir, "views");
const etlDir     = resolve(mapspecDir, "etl");

let _cache: Edge[] | null = null;

function computeStatus(edge: Edge): string {
    const stem = `${edge.fhir_resource}__${edge.omop_table}`;
    const hasView = existsSync(resolve(viewsDir, `${stem}.view.json`));
    const hasSql  = existsSync(resolve(etlDir,   `${stem}.sql`));
    if (hasView && hasSql) return "implemented";
    if (hasView || hasSql) return "documented";
    return "stub";
}

export default function (_ctx: Context): Edge[] {
    if (_cache) return _cache;
    let files: string[];
    try {
        files = readdirSync(edgesDir).filter((f) => f.endsWith(".json")).sort();
    } catch {
        return [];
    }
    const edges: Edge[] = [];
    for (const f of files) {
        try {
            const edge = JSON.parse(readFileSync(resolve(edgesDir, f), "utf-8")) as Edge;
            edge.status = computeStatus(edge);
            edges.push(edge);
        } catch {
            continue;
        }
    }
    _cache = edges;
    return edges;
}

export function invalidateCache() {
    _cache = null;
}
