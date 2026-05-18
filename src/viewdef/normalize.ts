// Port of sof-js normalize(): rewrites the ViewDefinition tree into a canonical
// shape where every node carries a `type` (select / forEach / forEachOrNull /
// repeat / unionAll / column). The original ViewDefinition spec lets `column`,
// `forEach`, `unionAll` mingle at the same level — normalize() picks an
// unambiguous evaluation order:
//
//   forEach    + column / unionAll / select   →  forEach { select: [column?, unionAll?, ...] }
//   select     + column / unionAll            →  select  { select: [unionAll?, column?, ...] }
//   column-only / unionAll-only / select-only →  matching leaf
//
// See the comment block in sof-js/src/index.js for the original mapping.

type AnyDef = any;

function normalize_one(def: AnyDef): AnyDef {
    if (def.forEach) {
        def.select ||= [];
        def.type = "forEach";
        if (def.unionAll) { def.select.unshift({ unionAll: def.unionAll }); delete def.unionAll; }
        if (def.column)   { def.select.unshift({ column:    def.column    }); delete def.column;    }
        def.select = def.select.map(normalize_one);
        return def;
    }
    if (def.forEachOrNull) {
        def.select ||= [];
        def.type = "forEachOrNull";
        if (def.unionAll) { def.select.unshift({ unionAll: def.unionAll }); delete def.unionAll; }
        if (def.column)   { def.select.unshift({ column:    def.column    }); delete def.column;    }
        def.select = def.select.map(normalize_one);
        return def;
    }
    if (def.repeat) {
        def.select ||= [];
        def.type = "repeat";
        if (def.unionAll) { def.select.unshift({ unionAll: def.unionAll }); delete def.unionAll; }
        if (def.column)   { def.select.unshift({ column:    def.column    }); delete def.column;    }
        def.select = def.select.map(normalize_one);
        return def;
    }
    if (def.column && def.select && def.unionAll) {
        def.type = "select";
        def.select.unshift({ column: def.column });
        def.select.unshift({ unionAll: def.unionAll });
        delete def.column;
        delete def.unionAll;
        def.select = def.select.map(normalize_one);
        return def;
    }
    if (def.unionAll && def.select) {
        def.type = "select";
        def.select.unshift({ unionAll: def.unionAll });
        delete def.unionAll;
        def.select = def.select.map(normalize_one);
        return def;
    }
    if (def.select && def.column) {
        def.select.unshift({ column: def.column });
        delete def.column;
        def.type = "select";
        def.select = def.select.map(normalize_one);
        return def;
    }
    if (def.unionAll && def.column) {
        def.select ||= [];
        def.select.unshift({ unionAll: def.unionAll });
        def.select.unshift({ column:    def.column    });
        delete def.unionAll;
        delete def.column;
        def.type = "select";
        def.select = def.select.map(normalize_one);
        return def;
    }
    if (def.select) {
        def.type = "select";
        def.select = def.select.map(normalize_one);
        return def;
    }
    if (def.unionAll) {
        def.type = "unionAll";
        def.unionAll = def.unionAll.map(normalize_one);
        return def;
    }
    if (def.column)        { def.type = "column"; return def; }
    if (def.forEach)       { def.type = "forEach"; return def; }
    if (def.forEachOrNull) { def.type = "forEachOrNull"; return def; }
    if (def.repeat)        { def.type = "repeat"; return def; }
    return def;
}

export function normalize(def: AnyDef): AnyDef {
    return normalize_one(structuredClone(def));
}

// ctx.fns.viewdef.normalize(ctx, { viewDefinition }) — REPL-friendly
export default function (_ctx: Context, opts: { viewDefinition: AnyDef }): AnyDef {
    return normalize(opts.viewDefinition);
}
