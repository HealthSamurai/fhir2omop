#!/usr/bin/env bun

/**
 * Search OMOP CDM tables and fields using DuckDB
 *
 * Usage:
 *   bun scripts/omop-table.ts <search>         # Search tables by name
 *   bun scripts/omop-table.ts person           # Show person table
 *   bun scripts/omop-table.ts --list           # List all tables
 *   bun scripts/omop-table.ts --pretty person  # Compact output
 *   bun scripts/omop-table.ts --schema CDM     # Filter by schema
 */

import duckdb from "duckdb";

const CDM_DIR = "./CommonDataModel/inst/csv";
const TABLE_FILE = `${CDM_DIR}/OMOP_CDMv5.4_Table_Level.csv`;
const FIELD_FILE = `${CDM_DIR}/OMOP_CDMv5.4_Field_Level.csv`;

const db = new duckdb.Database(":memory:");

function query<T>(sql: string): Promise<T[]> {
  return new Promise((resolve, reject) => {
    db.all(sql, (err, rows) => {
      if (err) reject(err);
      else resolve(rows as T[]);
    });
  });
}

interface Table {
  cdmTableName: string;
  schema: string;
  isRequired: boolean | string;
  tableDescription: string;
}

interface Field {
  cdmTableName: string;
  cdmFieldName: string;
  isRequired: boolean | string;
  cdmDatatype: string;
  userGuidance: string;
  isPrimaryKey: string;
  isForeignKey: boolean | string;
  fkTableName: string;
}

async function loadData() {
  // Create views for the CSV files with proper quoting options
  await query(`CREATE VIEW tables AS SELECT * FROM read_csv_auto('${TABLE_FILE}')`);
  await query(`
    CREATE VIEW fields AS SELECT * FROM read_csv('${FIELD_FILE}',
      header = true,
      quote = '"',
      escape = '"',
      ignore_errors = true,
      null_padding = true,
      parallel = false
    )
  `);
}

async function getTables(search?: string, schema?: string): Promise<Table[]> {
  let where = "WHERE 1=1";
  if (search) where += ` AND lower(cdmTableName) LIKE '%${search.toLowerCase()}%'`;
  if (schema) where += ` AND upper(schema) = '${schema.toUpperCase()}'`;
  return query<Table>(`SELECT cdmTableName, schema, isRequired, tableDescription FROM tables ${where} ORDER BY cdmTableName`);
}

async function getFields(tableName: string): Promise<Field[]> {
  return query<Field>(`
    SELECT cdmTableName, cdmFieldName, isRequired, cdmDatatype, userGuidance,
           isPrimaryKey, isForeignKey, fkTableName
    FROM fields
    WHERE lower(cdmTableName) = '${tableName.toLowerCase()}'
  `);
}

async function getTableStats(): Promise<{ schema: string; count: number }[]> {
  return query(`SELECT schema, COUNT(*) as count FROM tables GROUP BY schema ORDER BY schema`);
}

function isYes(val: boolean | string): boolean {
  return val === true || val === "Yes";
}

function printPretty(table: Table, fields: Field[], showDesc = false) {
  const req = isYes(table.isRequired) ? "*" : "";
  console.log(`${table.cdmTableName}${req} (${table.schema})`);

  if (fields.length === 0) return;

  const rows = fields.map((f) => {
    const pk = f.isPrimaryKey === "Yes" ? "PK" : "";
    const fk = isYes(f.isForeignKey) ? `FK->${f.fkTableName}` : "";
    const req = isYes(f.isRequired) ? "*" : "";
    const key = pk || fk || "";
    const desc = f.userGuidance && f.userGuidance !== "NA" ? f.userGuidance : "";
    return { name: f.cdmFieldName + req, type: f.cdmDatatype, key, desc };
  });

  const maxName = Math.max(...rows.map((r) => r.name.length));
  const maxType = Math.max(...rows.map((r) => r.type.length));
  const maxKey = Math.max(...rows.map((r) => r.key.length));

  for (const row of rows) {
    let line = `  ${row.name.padEnd(maxName)} ${row.type.padEnd(maxType)} ${row.key.padEnd(maxKey)}`;
    if (showDesc && row.desc) {
      const descLen = Math.min(60, row.desc.length);
      line += ` ${row.desc.slice(0, descLen)}${row.desc.length > descLen ? "..." : ""}`;
    }
    console.log(line);
  }
  console.log();
}

async function main() {
  const args = process.argv.slice(2);

  if (args.includes("--help") || args.includes("-h")) {
    console.log(`Usage: bun scripts/omop-table.ts [options] <search>

Options:
  --list            List all tables
  --schema <schema> Filter by schema: CDM, VOCAB, RESULTS
  --pretty          Compact pretty print (token-efficient)
  --desc            Add field descriptions to pretty print
  --full            Show full definition with descriptions
  --sql <query>     Run custom SQL query on tables/fields
  --json            Output as JSON
  -h, --help        Show this help

Examples:
  bun scripts/omop-table.ts person
  bun scripts/omop-table.ts --pretty person
  bun scripts/omop-table.ts --pretty --desc person
  bun scripts/omop-table.ts --list --schema CDM
  bun scripts/omop-table.ts --sql "SELECT * FROM fields WHERE cdmDatatype = 'date'"
`);
    return;
  }

  await loadData();

  const listAll = args.includes("--list");
  const showFull = args.includes("--full");
  const showPretty = args.includes("--pretty");
  const showDesc = args.includes("--desc");
  const outputJson = args.includes("--json");

  // Custom SQL query
  const sqlIdx = args.indexOf("--sql");
  if (sqlIdx !== -1 && args[sqlIdx + 1]) {
    const result = await query(args[sqlIdx + 1]);
    console.log(outputJson ? JSON.stringify(result, null, 2) : result);
    return;
  }

  let schemaFilter: string | undefined;
  const schemaIdx = args.indexOf("--schema");
  if (schemaIdx !== -1 && args[schemaIdx + 1]) {
    schemaFilter = args[schemaIdx + 1];
  }

  const searchTerm = args.filter(
    (a) => !a.startsWith("--") && a !== schemaFilter
  ).pop();

  let tables = await getTables(listAll ? undefined : searchTerm, schemaFilter);

  if (outputJson) {
    if (showFull || showPretty) {
      const data = await Promise.all(
        tables.map(async (t) => ({ ...t, fields: await getFields(t.cdmTableName) }))
      );
      console.log(JSON.stringify(data, null, 2));
    } else {
      console.log(JSON.stringify(tables, null, 2));
    }
    return;
  }

  // Exact match for pretty/full
  if ((showFull || showPretty) && searchTerm) {
    const exact = tables.find((t) => t.cdmTableName.toLowerCase() === searchTerm.toLowerCase());
    if (exact) tables = [exact];
  }

  // Pretty print
  if (showPretty) {
    for (const t of tables) {
      const fields = await getFields(t.cdmTableName);
      printPretty(t, fields, showDesc);
    }
    return;
  }

  // Full mode
  if (showFull) {
    for (const t of tables) {
      console.log(`${t.cdmTableName} (${t.schema})`);
      if (t.tableDescription) {
        console.log(`  ${t.tableDescription.slice(0, 200)}${t.tableDescription.length > 200 ? "..." : ""}`);
      }
      const fields = await getFields(t.cdmTableName);
      console.log(`\n  Fields (${fields.length}):`);
      for (const f of fields) {
        const req = isYes(f.isRequired) ? "*" : "";
        const pk = f.isPrimaryKey === "Yes" ? " [PK]" : "";
        const fk = f.isForeignKey === "Yes" ? ` [FK->${f.fkTableName}]` : "";
        const desc = f.userGuidance && f.userGuidance !== "NA" ? ` - ${f.userGuidance.slice(0, 60)}...` : "";
        console.log(`    ${f.cdmFieldName}${req} ${f.cdmDatatype}${pk}${fk}${desc}`);
      }
      console.log();
    }
    return;
  }

  // List mode
  if (listAll || tables.length > 5) {
    console.log(`Found ${tables.length} tables:\n`);
    const bySchema: Record<string, Table[]> = {};
    for (const t of tables) {
      bySchema[t.schema] = bySchema[t.schema] || [];
      bySchema[t.schema].push(t);
    }

    for (const schema of ["CDM", "VOCAB", "RESULTS"]) {
      const items = bySchema[schema];
      if (!items) continue;
      console.log(`${schema} (${items.length}):`);
      for (const t of items) {
        const req = isYes(t.isRequired) ? "*" : " ";
        const fields = await getFields(t.cdmTableName);
        console.log(`  ${req} ${t.cdmTableName.padEnd(25)} (${fields.length} fields)`);
      }
      console.log();
    }
  } else if (tables.length === 0) {
    console.log(`No tables found matching "${searchTerm}"`);
  } else {
    for (const t of tables) {
      const fields = await getFields(t.cdmTableName);
      printPretty(t, fields, showDesc);
    }
  }
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
