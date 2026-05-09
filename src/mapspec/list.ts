import { readdirSync, statSync } from "node:fs";
import { resolve } from "node:path";

export default function (_ctx: Context): Array<{ resource: string; tables: string[] }> {
    const dir = resolve(import.meta.dir, "..", "..", "mapspec");
    const out: Array<{ resource: string; tables: string[] }> = [];
    let names: string[];
    try {
        names = readdirSync(dir);
    } catch {
        return out;
    }
    for (const name of names.sort()) {
        if (name.startsWith(".") || name.startsWith("_")) continue;
        if (name === "TODO.md") continue;
        const sub = resolve(dir, name);
        let st;
        try { st = statSync(sub); } catch { continue; }
        if (!st.isDirectory()) continue;
        let files: string[];
        try { files = readdirSync(sub); } catch { continue; }
        const tables = files
            .filter((f) => f.endsWith(".md") && f !== "index.md")
            .map((f) => f.replace(/\.md$/, ""))
            .sort();
        out.push({ resource: name, tables });
    }
    return out;
}
