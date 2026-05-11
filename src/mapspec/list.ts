import { readdirSync } from "node:fs";
import { resolve } from "node:path";

export interface Edge {
    fhir_resource: string;
    omop_table: string;
    direction: string;
    status: string;
    primary?: boolean;
    required?: boolean;
    condition?: string;
    narrative_md?: string;
    implementation_in_project?: string | null;
    fields: Array<{
        omop_column: string;
        fhir_path?: string | null;
        fhir_type?: string;
        omop_type: string;
        required?: boolean;
        pk?: boolean;
        fk?: string;
        transform?: string;
        concept_map?: string;
        constant?: any;
        notes?: string;
        sources?: Array<{
            comment: string;
            references: Array<{
                project: string;
                kind?: string;
                path?: string;
                lines?: [number, number];
                notes?: string;
            }>;
        }>;
    }>;
    vocabularies?: Array<{
        name: string;
        entries: Array<{
            source_code: string;
            source_display?: string;
            target_concept_id?: number | null;
            target_concept_name?: string;
            notes?: string;
        }>;
    }>;
    references?: Array<{
        project: string;
        kind?: string;
        path?: string;
        lines?: [number, number];
        notes?: string;
    }>;
    edge_cases?: Array<{
        case: string;
        handling: string;
        implementations?: string[];
    }>;
}

const edgesDir = resolve(import.meta.dir, "..", "..", "mapspec", "edges");

let _cache: Edge[] | null = null;

export function loadEdges(): Edge[] {
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
            const txt = require("fs").readFileSync(resolve(edgesDir, f), "utf-8");
            edges.push(JSON.parse(txt));
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

/** Group edges by FHIR resource */
export function byResource(edges: Edge[]): Map<string, Edge[]> {
    const m = new Map<string, Edge[]>();
    for (const e of edges) {
        const arr = m.get(e.fhir_resource) ?? [];
        arr.push(e);
        m.set(e.fhir_resource, arr);
    }
    return m;
}

/** Group edges by OMOP table */
export function byTable(edges: Edge[]): Map<string, Edge[]> {
    const m = new Map<string, Edge[]>();
    for (const e of edges) {
        const arr = m.get(e.omop_table) ?? [];
        arr.push(e);
        m.set(e.omop_table, arr);
    }
    return m;
}

/** Legacy format for backward compat */
export default function (_ctx: Context): Array<{ resource: string; tables: string[] }> {
    const edges = loadEdges();
    const grouped = byResource(edges);
    const out: Array<{ resource: string; tables: string[] }> = [];
    for (const [resource, resEdges] of [...grouped.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
        out.push({
            resource,
            tables: resEdges.map((e) => e.omop_table).sort(),
        });
    }
    // Also include old-style directories that don't have edge JSONs yet
    const dir = resolve(import.meta.dir, "..", "..", "mapspec");
    try {
        const names = readdirSync(dir);
        for (const name of names.sort()) {
            if (name.startsWith(".") || name.startsWith("_")) continue;
            if (["TODO.md", "edges", "resources", "tables", "schema"].includes(name)) continue;
            const sub = resolve(dir, name);
            let st;
            try { st = require("fs").statSync(sub); } catch { continue; }
            if (!st.isDirectory()) continue;
            if (out.some((r) => r.resource === name)) continue; // already have edge JSONs
            let files: string[];
            try { files = readdirSync(sub); } catch { continue; }
            const tables = files
                .filter((f: string) => f.endsWith(".md") && f !== "index.md")
                .map((f: string) => f.replace(/\.md$/, ""))
                .sort();
            out.push({ resource: name, tables });
        }
    } catch {}
    return out.sort((a, b) => a.resource.localeCompare(b.resource));
}
