#!/usr/bin/env bun
// One-shot: make every variant's NON-fixture resource ids unique within a file.
//
// The runner loads a whole case file as ONE batch, so two variants both using
// `obs-1` would collide. Instead of namespacing at runtime, we give each
// variant's resources distinct ids in the JSON (obs-1, obs-2, …; cond-1 …
// cond-17) — honest about the batch model and readable. Fixtures (file-level
// + global) keep their shared ids; references to them are left untouched.
//
// Per variant we renumber each resource keeping its base (id with the trailing
// `-N` stripped) and pick the next free `base-N` not already used in the file,
// then rewrite that old id everywhere in the variant subtree: the resource
// `id`, `Type/id` and `urn:uuid:id` references, `ref:id` omop FKs, and bare
// string values (e.g. `*_source_value` that copy a dimension resource's id).
// `id:<token>` binding labels are NOT touched (they're symbolic, not ids).
import { readdirSync } from "node:fs";

const files = readdirSync("cases").filter((f) => f.endsWith(".json") && !f.startsWith("_")).sort();

function rewriteTree(node: any, map: Map<string, string>): any {
    if (typeof node === "string") {
        if (map.has(node)) return map.get(node);                                  // bare id (resource.id, source_value)
        let m = node.match(/^([A-Za-z][A-Za-z0-9]*)\/(.+)$/);                      // Type/id reference
        if (m && map.has(m[2]!)) return `${m[1]}/${map.get(m[2]!)}`;
        m = node.match(/^urn:uuid:(.+)$/);                                         // bundle-internal reference
        if (m && map.has(m[1]!)) return `urn:uuid:${map.get(m[1]!)}`;
        m = node.match(/^ref:(.+)$/);                                             // omop FK token
        if (m && map.has(m[1]!)) return `ref:${map.get(m[1]!)}`;
        return node;
    }
    if (Array.isArray(node)) return node.map((x) => rewriteTree(x, map));
    if (node && typeof node === "object") {
        const o: any = {};
        for (const [k, v] of Object.entries(node)) o[k] = rewriteTree(v, map);
        return o;
    }
    return node;
}

let totalFiles = 0, totalRenamed = 0;
for (const f of files) {
    const file = JSON.parse(await Bun.file(`cases/${f}`).text());
    if (!Array.isArray(file.cases)) continue;
    const fixtureIds = new Set<string>([...(file.fixtures ?? [])].map((r: any) => r?.id).filter(Boolean));
    const used = new Set<string>(fixtureIds);
    const counter = new Map<string, number>();
    const baseOf = (id: string) => id.replace(/-\d+$/, "");
    const nextId = (base: string) => {
        let n = (counter.get(base) ?? 0) + 1;
        while (used.has(`${base}-${n}`)) n++;
        counter.set(base, n);
        const id = `${base}-${n}`;
        used.add(id);
        return id;
    };

    let fileRenamed = 0;
    file.cases = file.cases.map((v: any) => {
        const fhir = Array.isArray(v.fhir) ? v.fhir : [];
        const map = new Map<string, string>();
        for (const r of fhir) {
            if (!r?.id || fixtureIds.has(r.id)) continue;       // skip fixtures (shouldn't appear in fhir[] anyway)
            const want = nextId(baseOf(String(r.id)));
            if (want !== r.id) { map.set(String(r.id), want); fileRenamed++; }
            else used.add(String(r.id));                        // already unique, reserve it
        }
        if (!map.size) return v;
        return { ...v, fhir: rewriteTree(fhir, map), omop: rewriteTree(v.omop, map) };
    });

    if (fileRenamed) {
        await Bun.write(`cases/${f}`, JSON.stringify(file, null, 2) + "\n");
        totalFiles++; totalRenamed += fileRenamed;
        console.log(`  ✎ ${f.padEnd(48)} renamed ${fileRenamed} resource ids`);
    } else {
        console.log(`  -- ${f}: already unique`);
    }
}
console.log(`\n${totalRenamed} resource ids made file-unique across ${totalFiles} files`);
