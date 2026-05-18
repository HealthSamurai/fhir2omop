import { SQL } from "bun";

const DSN = process.env.ATHENA_DSN
    ?? process.env.FHIR_DSN
    ?? "postgresql://athena:athena@localhost:54392/athena";

let _sql: SQL | null = null;

export function getSql(): SQL {
    if (!_sql) _sql = new SQL(DSN);
    return _sql;
}

export default function (_ctx: Context): SQL {
    return getSql();
}
