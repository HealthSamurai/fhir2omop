// ViewDefinition runner.
//
//   ctx.fns.viewdef.run(ctx, { resource, viewDefinition })
//     → [[v1, v2, …], [v1, v2, …], …]   // rows in column order
//
// Port of sof-js evaluate() with a different output shape: arrays of values
// (column-ordered) instead of records (named keys). Column order comes from
// columns.getColumns(viewDefinition), so callers can fetch it once and match
// to the row arrays.
//
// Internals (do_eval / column / select / forEach / forEachOrNull / repeat /
// unionAll / row_product) mirror sof-js/src/index.js. The output mapping at
// the bottom converts the intermediate record list to row arrays.

import { evaluate as fhirpath_evaluate } from "./path";
import { normalize } from "./normalize";
import { getColumns } from "./columns";

type AnyDef = any;

function assert(cond: any, msg: string): asserts cond {
    if (!cond) throw new Error(msg);
}

function merge(a: Record<string, any>, b: Record<string, any>): Record<string, any> {
    return Object.assign({}, a, b);
}

function row_product(parts: Record<string, any>[][]): Record<string, any>[] {
    if (parts.length === 1) return parts[0]!;
    let rows: Record<string, any>[] = [{}];
    for (const partial_rows of parts) {
        const new_rows: Record<string, any>[] = [];
        for (const partial_row of partial_rows) {
            for (const row of rows) {
                new_rows.push(merge(partial_row, row));
            }
        }
        rows = new_rows;
    }
    return rows;
}

function arrays_eq(a: any[], b: any[]): boolean {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; ++i) if (a[i] !== b[i]) return false;
    return true;
}

function arrays_unique<T extends any[]>(arrays: T[]): T[] {
    return arrays.reduce<T[]>((acc, value) => {
        if (acc.length === 0) return [value];
        for (const x of acc) if (arrays_eq(x as any[], value as any[])) return acc;
        return acc.concat([value]);
    }, []);
}

function column(select_expr: AnyDef, node: any, def: AnyDef): Record<string, any>[] {
    assert(select_expr.column, "column required");
    const record: Record<string, any> = {};
    for (const c of select_expr.column) {
        const vs = fhirpath_evaluate(node, c.path, def.constant);
        const key = c.name || c.path;
        if (c.collection) {
            record[key] = vs;
        } else if (vs.length <= 1) {
            const v = vs[0];
            record[key] = v === undefined ? null : v;
        } else {
            throw new Error("Collection value for " + c.path + " => " + JSON.stringify(vs));
        }
    }
    return [record];
}

function select(select_expr: AnyDef, node: any, def: AnyDef): Record<string, any>[] {
    assert(select_expr.select, "select");
    if (select_expr.where) {
        const include = select_expr.where.every((w: any) => {
            const val = fhirpath_evaluate(node, w.path, def.constant)[0];
            assert(
                val === undefined || typeof val === "boolean",
                "'where' expression path should return 'boolean'",
            );
            return val;
        });
        if (!include) return [];
    }
    if (select_expr.resource) {
        if (select_expr.resource !== node.resourceType) return [];
    }
    return row_product(select_expr.select.map((s: AnyDef) => do_eval(s, node, def)));
}

function forEach(select_expr: AnyDef, node: any, def: AnyDef): Record<string, any>[] {
    assert(select_expr.forEach, "forEach required");
    const nodes = fhirpath_evaluate(node, select_expr.forEach, def.constant);
    return nodes.flatMap((n: any) => select({ select: select_expr.select }, n, def));
}

function forEachOrNull(select_expr: AnyDef, node: any, def: AnyDef): Record<string, any>[] {
    assert(select_expr.forEachOrNull, "forEachOrNull required");
    let nodes = fhirpath_evaluate(node, select_expr.forEachOrNull, def.constant);
    if (nodes.length === 0) nodes = [{}];
    return nodes.flatMap((n: any) => select({ select: select_expr.select }, n, def));
}

function recursiveTraverse(paths: string[], node: any, def: AnyDef): any[] {
    const result: any[] = [];
    const traverse = (currentNode: any, isRoot = false) => {
        if (!isRoot) result.push(currentNode);
        for (const p of paths) {
            const childNodes = fhirpath_evaluate(currentNode, p, def.constant);
            for (const c of childNodes) if (c && typeof c === "object") traverse(c, false);
        }
    };
    traverse(node, true);
    return result;
}

function repeat(select_expr: AnyDef, node: any, def: AnyDef): Record<string, any>[] {
    assert(select_expr.repeat, "repeat required");
    assert(Array.isArray(select_expr.repeat), "repeat must be an array");
    const nodes = recursiveTraverse(select_expr.repeat, node, def);
    return nodes.flatMap((n: any) => select({ select: select_expr.select }, n, def));
}

function unionAll(select_expr: AnyDef, node: any, def: AnyDef): Record<string, any>[] {
    assert(select_expr.unionAll, "unionAll");
    const result = select_expr.unionAll.flatMap((d: AnyDef) => do_eval(d, node, def));
    const unique = arrays_unique(result.map((x: Record<string, any>) => Object.keys(x)));
    assert(unique.length <= 1, `Union columns mismatch: ${JSON.stringify(unique)}`);
    return result;
}

const FNS: Record<string, (e: AnyDef, n: any, d: AnyDef) => Record<string, any>[]> = {
    forEach,
    forEachOrNull,
    repeat,
    unionAll,
    select,
    column,
    unknown: () => [],
};

function do_eval(select_expr: AnyDef, node: any, def: AnyDef): Record<string, any>[] {
    const f = FNS[select_expr.type] ?? FNS["unknown"]!;
    return f(select_expr, node, def);
}

// ctx.fns.viewdef.run — main entry.
//   opts.resource         — one FHIR resource (or an array)
//   opts.viewDefinition   — ViewDefinition JSON
//
// Returns rows as arrays of values, in column order from getColumns().
// For the column names themselves, call ctx.fns.viewdef.columns(...).
export default function (
    _ctx: Context,
    opts: { resource: any | any[]; viewDefinition: AnyDef },
): any[][] {
    const nodes = Array.isArray(opts.resource) ? opts.resource : [opts.resource];
    const original = opts.viewDefinition;
    const normal_def = normalize(original);
    const columns = getColumns(original);

    const records: Record<string, any>[] = nodes.flatMap((n) => do_eval(normal_def, n, original));

    return records.map((r) => columns.map((c) => (r[c] === undefined ? null : r[c])));
}
