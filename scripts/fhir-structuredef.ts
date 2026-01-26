#!/usr/bin/env bun

/**
 * Search FHIR R4 StructureDefinitions by name
 *
 * Usage:
 *   bun scripts/fhir-structuredef.ts <search>       # Search by name (case-insensitive)
 *   bun scripts/fhir-structuredef.ts Patient        # Find Patient resource
 *   bun scripts/fhir-structuredef.ts --list         # List all resource types
 *   bun scripts/fhir-structuredef.ts --kind resource  # Filter by kind
 *   bun scripts/fhir-structuredef.ts --full Patient # Show full definition
 */

const FHIR_CORE_DIR = "./fhir-core";
const SD_FILE = `${FHIR_CORE_DIR}/StructureDefinition.ndjson`;

interface StructureDefinition {
  resourceType: "StructureDefinition";
  id: string;
  url: string;
  name: string;
  title?: string;
  status: string;
  kind: "primitive-type" | "complex-type" | "resource" | "logical";
  abstract: boolean;
  type: string;
  baseDefinition?: string;
  description?: string;
  snapshot?: { element: any[] };
  differential?: { element: any[] };
}

async function loadStructureDefinitions(): Promise<StructureDefinition[]> {
  const file = Bun.file(SD_FILE);
  if (!(await file.exists())) {
    console.error(`Error: ${SD_FILE} not found. Run: bun src/load-fhir-core.ts`);
    process.exit(1);
  }

  const text = await file.text();
  const lines = text.trim().split("\n");
  return lines.map((line) => JSON.parse(line));
}

function printSummary(sd: StructureDefinition) {
  console.log(`${sd.name}`);
  console.log(`  id:    ${sd.id}`);
  console.log(`  kind:  ${sd.kind}${sd.abstract ? " (abstract)" : ""}`);
  console.log(`  type:  ${sd.type}`);
  if (sd.baseDefinition) {
    const base = sd.baseDefinition.split("/").pop();
    console.log(`  base:  ${base}`);
  }
  if (sd.title && sd.title !== sd.name) {
    console.log(`  title: ${sd.title}`);
  }
  console.log(`  url:   ${sd.url}`);
  console.log();
}

function printElements(sd: StructureDefinition) {
  const elements = sd.snapshot?.element || sd.differential?.element || [];
  if (elements.length === 0) {
    console.log("  (no elements)");
    return;
  }

  console.log(`  Elements (${elements.length}):`);
  for (const el of elements.slice(0, 50)) {
    const path = el.path;
    const types = el.type?.map((t: any) => t.code).join(" | ") || "";
    const card = `${el.min ?? ""}..${el.max ?? ""}`;
    const short = el.short ? ` - ${el.short}` : "";
    console.log(`    ${path} [${card}] ${types}${short}`);
  }
  if (elements.length > 50) {
    console.log(`    ... and ${elements.length - 50} more`);
  }
}

function printPretty(sd: StructureDefinition) {
  const elements = sd.snapshot?.element || sd.differential?.element || [];
  const base = sd.baseDefinition?.split("/").pop() || "";

  // Header line
  console.log(`${sd.name} : ${base} (${sd.kind})`);

  // Skip root element, filter to direct children only (no nested paths beyond one dot)
  const rootPath = sd.type;
  const directElements = elements.filter((el) => {
    const path = el.path;
    if (path === rootPath) return false; // skip root
    const suffix = path.slice(rootPath.length + 1);
    return suffix && !suffix.includes("."); // direct children only
  });

  if (directElements.length === 0) return;

  // Find max lengths for alignment
  const rows = directElements.map((el) => {
    const name = el.path.split(".").pop() || "";
    const card = `${el.min ?? 0}..${el.max ?? "*"}`;
    const types = el.type?.map((t: any) => t.code).join("|") || "";
    return { name, card, types };
  });

  const maxName = Math.max(...rows.map((r) => r.name.length));
  const maxCard = Math.max(...rows.map((r) => r.card.length));

  for (const row of rows) {
    console.log(`  ${row.name.padEnd(maxName)} ${row.card.padStart(maxCard)} ${row.types}`);
  }
  console.log();
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
    console.log(`Usage: bun scripts/fhir-structuredef.ts [options] <search>

Options:
  --list           List all StructureDefinitions
  --kind <kind>    Filter by kind: resource, complex-type, primitive-type, logical
  --pretty         Compact pretty print (token-efficient)
  --full           Show full definition with elements
  --json           Output as JSON
  -h, --help       Show this help

Examples:
  bun scripts/fhir-structuredef.ts Patient
  bun scripts/fhir-structuredef.ts --pretty Patient
  bun scripts/fhir-structuredef.ts --kind resource
  bun scripts/fhir-structuredef.ts --full Observation
  bun scripts/fhir-structuredef.ts --list --kind primitive-type
`);
    return;
  }

  const sds = await loadStructureDefinitions();

  const listAll = args.includes("--list");
  const showFull = args.includes("--full");
  const showPretty = args.includes("--pretty");
  const outputJson = args.includes("--json");

  let kindFilter: string | null = null;
  const kindIdx = args.indexOf("--kind");
  if (kindIdx !== -1 && args[kindIdx + 1]) {
    kindFilter = args[kindIdx + 1];
  }

  // Get search term (last non-flag argument)
  const searchTerm = args.filter(
    (a) => !a.startsWith("--") && a !== kindFilter
  ).pop();

  let results = sds;

  // Filter by kind
  if (kindFilter) {
    results = results.filter((sd) => sd.kind === kindFilter);
  }

  // Filter by search term
  if (searchTerm && !listAll) {
    const search = searchTerm.toLowerCase();
    results = results.filter(
      (sd) =>
        sd.name.toLowerCase().includes(search) ||
        sd.id.toLowerCase().includes(search) ||
        sd.type.toLowerCase().includes(search)
    );
  }

  // Sort by name
  results.sort((a, b) => a.name.localeCompare(b.name));

  if (outputJson) {
    if (showFull) {
      console.log(JSON.stringify(results, null, 2));
    } else {
      const summary = results.map((sd) => ({
        name: sd.name,
        id: sd.id,
        kind: sd.kind,
        type: sd.type,
        abstract: sd.abstract,
        url: sd.url,
      }));
      console.log(JSON.stringify(summary, null, 2));
    }
    return;
  }

  // Check for exact match when --full or --pretty is used
  if ((showFull || showPretty) && searchTerm) {
    const exactMatch = results.find(
      (sd) => sd.name.toLowerCase() === searchTerm.toLowerCase() ||
              sd.id.toLowerCase() === searchTerm.toLowerCase()
    );
    if (exactMatch) {
      results = [exactMatch];
    }
  }

  // Pretty print mode
  if (showPretty) {
    for (const sd of results) {
      printPretty(sd);
    }
    return;
  }

  if (listAll || (!showFull && results.length > 10)) {
    // Compact list format
    console.log(`Found ${results.length} StructureDefinitions:\n`);
    const byKind: Record<string, StructureDefinition[]> = {};
    for (const sd of results) {
      byKind[sd.kind] = byKind[sd.kind] || [];
      byKind[sd.kind].push(sd);
    }

    for (const kind of ["resource", "complex-type", "primitive-type", "logical"]) {
      const items = byKind[kind];
      if (!items) continue;
      console.log(`${kind} (${items.length}):`);
      const names = items.map((sd) => sd.name);
      // Print in columns
      const cols = 4;
      const maxLen = Math.max(...names.map((n) => n.length)) + 2;
      for (let i = 0; i < names.length; i += cols) {
        const row = names.slice(i, i + cols);
        console.log("  " + row.map((n) => n.padEnd(maxLen)).join(""));
      }
      console.log();
    }
  } else if (results.length === 0) {
    console.log(`No StructureDefinitions found matching "${searchTerm}"`);
  } else {
    // Detailed view for few results
    for (const sd of results) {
      printSummary(sd);
      if (showFull) {
        printElements(sd);
        console.log();
      }
    }
  }
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
