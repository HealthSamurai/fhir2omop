// Minimal SQL-Server → PostgreSQL dialect translation.
// Replaces only the constructs ETL-Synthea actually uses (full SqlRender
// has 150+ rules; we need maybe 8). Applied AFTER `render` (placeholder
// substitution).
//
// Rules:
//   1. `if object_id('X', 'U') is not null drop table X` → `DROP TABLE IF EXISTS X`
//   2. `select … into TBL from …`                       → `CREATE TABLE TBL AS SELECT … FROM …`
//   3. `YEAR(x)`                                         → `EXTRACT(YEAR FROM (x))::int`
//   4. `MONTH(x)`                                        → `EXTRACT(MONTH FROM (x))::int`
//   5. `DAY(x)`                                          → `EXTRACT(DAY FROM (x))::int`
//   6. `iif(cond, a, b)`                                 → `CASE WHEN cond THEN a ELSE b END`
//   7. `isnull(a, b)`                                    → `COALESCE(a, b)`
//   8. `len(x)`                                          → `length(x)`
//   9. `[ident]`                                         → `"ident"` (sql-server bracket quoting)

export function translate(sql: string): string {
    let out = sql;

    // 0. SQL Server temp tables: `tempdb..#name` and `#name` → `tmp_name`.
    // Postgres identifiers can't start with `#`, and `tempdb` is meaningless.
    // Temp tables in Postgres are session-scoped automatically.
    out = out.replace(/\btempdb\.\.#?/gi, "");
    out = out.replace(/#(\w+)/g, "tmp_$1");

    // 1. IF object_id('X', 'U') IS NOT NULL DROP TABLE X
    // 1a. one-line form
    out = out.replace(
        /\bif\s+object_id\(\s*'([^']+)'\s*,\s*'U'\s*\)\s+is\s+not\s+null\s+drop\s+table\s+\S+\s*;/gi,
        (_, name) => `DROP TABLE IF EXISTS ${name};`,
    );
    // 1b. variant without 'U' arg
    out = out.replace(
        /\bif\s+object_id\(\s*'([^']+)'\s*\)\s+is\s+not\s+null\s+drop\s+table\s+\S+\s*;/gi,
        (_, name) => `DROP TABLE IF EXISTS ${name};`,
    );

    // 2. SELECT … INTO TBL FROM …  →  CREATE TABLE TBL AS <whole statement, INTO stripped>
    // The whole-script regex was wrong: it could swallow preceding CTEs.
    // Correct approach: split by `;`, process each statement independently.
    // For a statement that contains `INTO <ident> FROM`, drop that fragment
    // and prepend `CREATE TABLE <ident> AS `.
    out = out
        .split(/;\s*\n/)
        .map((stmt) => {
            const m = stmt.match(/\s+INTO\s+([\w."]+)\s+FROM\b/i);
            if (!m) return stmt;
            const tbl = m[1]!;
            const stripped = stmt.replace(/\s+INTO\s+[\w."]+\s+FROM\b/i, " FROM");
            return `CREATE TABLE ${tbl} AS ${stripped.trimStart()}`;
        })
        .join(";\n");

    // 2b. SQL Server `dateadd(day, N, X)` → Postgres `(X + N)`.
    out = out.replace(
        /\bdateadd\s*\(\s*day\s*,\s*([^,]+?)\s*,\s*([^)]+?)\s*\)/gi,
        (_, n, x) => `(${x.trim()} + (${n.trim()}))`,
    );

    // 2c. SQL Server `datediff(day, A, B)` → Postgres `((B - A)::int)`.
    out = out.replace(
        /\bdatediff\s*\(\s*day\s*,\s*([^,]+?)\s*,\s*([^)]+?)\s*\)/gi,
        (_, a, b) => `((${b.trim()} - ${a.trim()})::int)`,
    );

    // 3-5. Date extractors
    out = out.replace(/\bYEAR\s*\(/gi,  "EXTRACT(YEAR FROM ");
    out = out.replace(/\bMONTH\s*\(/gi, "EXTRACT(MONTH FROM ");
    out = out.replace(/\bDAY\s*\(/gi,   "EXTRACT(DAY FROM ");
    // Note: we don't append `)::int` — Postgres returns numeric which casts implicitly
    // in numeric columns. If needed, callers can add explicit casts.

    // 6. IIF(cond, a, b) → CASE WHEN cond THEN a ELSE b END
    out = out.replace(
        /\biif\s*\(\s*([^,]+?)\s*,\s*([^,]+?)\s*,\s*([^)]+?)\s*\)/gi,
        (_, c, a, b) => `CASE WHEN ${c} THEN ${a} ELSE ${b} END`,
    );

    // 7. ISNULL → COALESCE
    out = out.replace(/\bisnull\s*\(/gi, "COALESCE(");

    // 8. LEN → length
    out = out.replace(/\blen\s*\(/gi, "length(");

    // 8a. getdate() → now()
    out = out.replace(/\bgetdate\s*\(\s*\)/gi, "now()");

    // 8b. isnumeric(x) = 1  →  (x ~ '^[+-]?[0-9]+(\.[0-9]+)?$')
    // SQL Server's isnumeric returns 1/0; we splice in a Postgres regex match
    // that yields boolean directly. The trailing `= 1` (or `= 0`) is fused.
    out = out.replace(
        /\bisnumeric\s*\(\s*([^)]+?)\s*\)\s*=\s*1\b/gi,
        (_, v) => `(${v} ~ '^[+-]?[0-9]+(\\.[0-9]+)?$')`,
    );
    out = out.replace(
        /\bisnumeric\s*\(\s*([^)]+?)\s*\)\s*=\s*0\b/gi,
        (_, v) => `(${v} !~ '^[+-]?[0-9]+(\\.[0-9]+)?$')`,
    );

    // 9. [bracket quoted identifier] → "double-quoted"
    out = out.replace(/\[([A-Za-z_][\w]*)\]/g, '"$1"');

    return out;
}

export default function (_ctx: Context, opts: { sql: string }): string {
    return translate(opts.sql);
}
