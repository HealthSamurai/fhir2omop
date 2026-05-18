// Get column names in spec-defined order from a (possibly un-normalized)
// ViewDefinition. Port of sof-js get_columns().

import { normalize } from "./normalize";

type AnyDef = any;

function collect_columns(acc: string[], def: AnyDef): string[] {
    switch (def.type) {
        case "select":
        case "forEach":
        case "forEachNull":
        case "forEachOrNull":
        case "repeat":
            return (def.select || []).reduce(
                (a: string[], s: AnyDef) => collect_columns(a, s),
                acc,
            );
        case "unionAll": {
            const unions: string[][] = (def.unionAll || []).map((s: AnyDef) => collect_columns([], s));
            if (unions.length > 1) {
                const first = unions[0]!;
                for (let i = 1; i < unions.length; ++i) {
                    if (JSON.stringify(unions[i]) !== JSON.stringify(first)) {
                        throw new Error(`Union columns mismatch: ${JSON.stringify(unions)}`);
                    }
                }
            }
            return acc.concat(unions[0] || []);
        }
        case "column":
            return (def.column || []).reduce((a: string[], c: any) => {
                a.push(c.name || c.path);
                return a;
            }, acc);
        default:
            return acc;
    }
}

export function getColumns(def: AnyDef): string[] {
    return collect_columns([], normalize(def));
}

// ctx.fns.viewdef.columns(ctx, { viewDefinition }) → ["id", "gender", …]
export default function (_ctx: Context, opts: { viewDefinition: AnyDef }): string[] {
    return getColumns(opts.viewDefinition);
}
