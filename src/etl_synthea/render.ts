// Mirror of SqlRender::render — substitute @placeholder tokens with values.
// SqlRender supports a wider syntax (defaults, conditionals); we only need
// straight key-value replacement, which is what ETL-Synthea actually uses.
//
// Usage: render({"@cdm_schema": "cdm_ours", "@synthea_schema": "native_ours"})
//
// Tokens are case-sensitive, longest-first so "@cdm_schema_extra" doesn't get
// eaten by "@cdm_schema".

export function render(sql: string, params: Record<string, string>): string {
    // 1. Conditional blocks: `{<expr>} ? { <body> }` — keep body iff expr is true.
    // expr uses `@name == "value"` and `|` (OR), `&` (AND).
    // We evaluate against `params` (renamed without @).
    sql = renderConditionals(sql, params);

    // 2. Token replacement: @key → value
    const keys = Object.keys(params).sort((a, b) => b.length - a.length);
    let out = sql;
    for (const key of keys) {
        const token = key.startsWith("@") ? key : "@" + key;
        out = out.split(token).join(params[key]!);
    }
    return out;
}

function renderConditionals(sql: string, params: Record<string, string>): string {
    // Match `{<expr>} ? { <body> }` (body may contain newlines, balanced braces
    // not expected in ETL-Synthea conditionals).
    const re = /\{([^{}]+?)\}\s*\?\s*\{([\s\S]*?)\}/g;
    return sql.replace(re, (_, expr: string, body: string) => {
        return evalCond(expr, params) ? body : "";
    });
}

function evalCond(expr: string, params: Record<string, string>): boolean {
    // Splits on `|` (OR) then on `&` (AND). Each leaf: `@name == "value"`
    // or `@name != "value"`.
    return expr.split("|").some((orPart) =>
        orPart.split("&").every((andPart) => {
            const m = andPart.trim().match(/^@(\w+)\s*(==|!=)\s*"([^"]*)"$/);
            if (!m) return false;
            const [, name, op, val] = m;
            const actual = params[name!] ?? "";
            return op === "==" ? actual === val : actual !== val;
        }),
    );
}

export default function (
    _ctx: Context,
    opts: { sql: string; params: Record<string, string> },
): string {
    return render(opts.sql, opts.params);
}
