#!/usr/bin/env bun

/**
 * Search FHIR R4 CodeSystems by name
 *
 * Usage:
 *   bun scripts/fhir-codesystem.ts <search>        # Search by name
 *   bun scripts/fhir-codesystem.ts gender          # Find gender-related CodeSystems
 *   bun scripts/fhir-codesystem.ts --list          # List all CodeSystems
 *   bun scripts/fhir-codesystem.ts --pretty gender # Compact output
 */

const FHIR_CORE_DIR = "./fhir-core";
const CS_FILE = `${FHIR_CORE_DIR}/CodeSystem.ndjson`;

interface Concept {
  code: string;
  display?: string;
  definition?: string;
  concept?: Concept[];
}

interface CodeSystem {
  resourceType: "CodeSystem";
  id: string;
  url: string;
  name: string;
  title?: string;
  status: string;
  version?: string;
  description?: string;
  content: "complete" | "fragment" | "not-present" | "supplement" | "example";
  caseSensitive?: boolean;
  hierarchyMeaning?: string;
  count?: number;
  concept?: Concept[];
}

async function loadCodeSystems(): Promise<CodeSystem[]> {
  const file = Bun.file(CS_FILE);
  if (!(await file.exists())) {
    console.error(`Error: ${CS_FILE} not found. Run: bun src/load-fhir-core.ts`);
    process.exit(1);
  }

  const text = await file.text();
  const lines = text.trim().split("\n");
  return lines.map((line) => JSON.parse(line));
}

function countConcepts(concepts?: Concept[]): number {
  if (!concepts) return 0;
  let count = concepts.length;
  for (const c of concepts) {
    if (c.concept) {
      count += countConcepts(c.concept);
    }
  }
  return count;
}

function getConceptCount(cs: CodeSystem): number | string {
  if (cs.count !== undefined) return cs.count;
  if (cs.concept) return countConcepts(cs.concept);
  if (cs.content === "not-present") return "external";
  return "?";
}

function printPretty(cs: CodeSystem) {
  const count = getConceptCount(cs);
  const content = cs.content !== "complete" ? ` (${cs.content})` : "";
  console.log(`${cs.name} [${count}]${content}`);
  console.log(`  ${cs.url}`);
  console.log();
}

function printConcepts(concepts: Concept[], indent = "    ", limit = 10): number {
  let shown = 0;
  for (const c of concepts.slice(0, limit)) {
    const display = c.display ? ` - ${c.display}` : "";
    console.log(`${indent}${c.code}${display}`);
    shown++;
    if (c.concept && c.concept.length > 0) {
      shown += printConcepts(c.concept, indent + "  ", Math.max(0, limit - shown));
    }
    if (shown >= limit) break;
  }
  return shown;
}

function printFull(cs: CodeSystem) {
  console.log(`${cs.name}`);
  console.log(`  id:      ${cs.id}`);
  console.log(`  url:     ${cs.url}`);
  console.log(`  status:  ${cs.status}`);
  console.log(`  content: ${cs.content}`);
  if (cs.caseSensitive !== undefined) {
    console.log(`  case:    ${cs.caseSensitive ? "sensitive" : "insensitive"}`);
  }
  if (cs.hierarchyMeaning) {
    console.log(`  hierarchy: ${cs.hierarchyMeaning}`);
  }
  if (cs.title && cs.title !== cs.name) {
    console.log(`  title:   ${cs.title}`);
  }
  if (cs.description) {
    const desc = cs.description.slice(0, 150);
    console.log(`  desc:    ${desc}${cs.description.length > 150 ? "..." : ""}`);
  }

  // Show concepts
  if (cs.concept && cs.concept.length > 0) {
    const total = countConcepts(cs.concept);
    console.log(`\n  Concepts (${total}):`);
    const shown = printConcepts(cs.concept, "    ", 15);
    if (total > shown) {
      console.log(`    ... +${total - shown} more`);
    }
  } else if (cs.content === "not-present") {
    console.log(`\n  Concepts: external (not included in FHIR core)`);
  }
  console.log();
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
    console.log(`Usage: bun scripts/fhir-codesystem.ts [options] <search>

Options:
  --list            List all CodeSystems
  --status <s>      Filter by status: active, draft, retired
  --content <c>     Filter by content: complete, fragment, not-present
  --pretty          Compact pretty print (token-efficient)
  --full            Show full definition with concepts
  --json            Output as JSON
  -h, --help        Show this help

Examples:
  bun scripts/fhir-codesystem.ts gender
  bun scripts/fhir-codesystem.ts --pretty observation
  bun scripts/fhir-codesystem.ts --full administrative-gender
  bun scripts/fhir-codesystem.ts --list --content complete
`);
    return;
  }

  const codeSystems = await loadCodeSystems();

  const listAll = args.includes("--list");
  const showFull = args.includes("--full");
  const showPretty = args.includes("--pretty");
  const outputJson = args.includes("--json");

  let statusFilter: string | null = null;
  const statusIdx = args.indexOf("--status");
  if (statusIdx !== -1 && args[statusIdx + 1]) {
    statusFilter = args[statusIdx + 1];
  }

  let contentFilter: string | null = null;
  const contentIdx = args.indexOf("--content");
  if (contentIdx !== -1 && args[contentIdx + 1]) {
    contentFilter = args[contentIdx + 1];
  }

  // Get search term
  const searchTerm = args.filter(
    (a) => !a.startsWith("--") && a !== statusFilter && a !== contentFilter
  ).pop();

  let results = codeSystems;

  // Filter by status
  if (statusFilter) {
    results = results.filter((cs) => cs.status === statusFilter);
  }

  // Filter by content
  if (contentFilter) {
    results = results.filter((cs) => cs.content === contentFilter);
  }

  // Filter by search term
  if (searchTerm && !listAll) {
    const search = searchTerm.toLowerCase();
    results = results.filter(
      (cs) =>
        cs.name?.toLowerCase().includes(search) ||
        cs.id?.toLowerCase().includes(search) ||
        cs.title?.toLowerCase().includes(search) ||
        cs.url?.toLowerCase().includes(search)
    );
  }

  // Sort by name
  results.sort((a, b) => (a.name || a.id).localeCompare(b.name || b.id));

  if (outputJson) {
    console.log(JSON.stringify(showFull ? results : results.map((cs) => ({
      name: cs.name,
      id: cs.id,
      url: cs.url,
      status: cs.status,
      content: cs.content,
      count: getConceptCount(cs),
    })), null, 2));
    return;
  }

  // Check for exact match when --full or --pretty is used
  if ((showFull || showPretty) && searchTerm) {
    const exactMatch = results.find(
      (cs) => cs.name?.toLowerCase() === searchTerm.toLowerCase() ||
              cs.id?.toLowerCase() === searchTerm.toLowerCase()
    );
    if (exactMatch) {
      results = [exactMatch];
    }
  }

  // Pretty print mode
  if (showPretty) {
    for (const cs of results) {
      printPretty(cs);
    }
    return;
  }

  // Full mode
  if (showFull) {
    for (const cs of results) {
      printFull(cs);
    }
    return;
  }

  // List mode or many results
  if (listAll || results.length > 10) {
    console.log(`Found ${results.length} CodeSystems:\n`);

    // Group by content type
    const byContent: Record<string, CodeSystem[]> = {};
    for (const cs of results) {
      byContent[cs.content] = byContent[cs.content] || [];
      byContent[cs.content].push(cs);
    }

    for (const content of ["complete", "fragment", "not-present", "supplement", "example"]) {
      const items = byContent[content];
      if (!items) continue;
      console.log(`${content} (${items.length}):`);
      const names = items.map((cs) => cs.name || cs.id);
      // Print in columns
      const cols = 3;
      const maxLen = Math.max(...names.map((n) => n.length)) + 2;
      for (let i = 0; i < names.length; i += cols) {
        const row = names.slice(i, i + cols);
        console.log("  " + row.map((n) => n.padEnd(maxLen)).join(""));
      }
      console.log();
    }
  } else if (results.length === 0) {
    console.log(`No CodeSystems found matching "${searchTerm}"`);
  } else {
    // Default: show pretty for few results
    for (const cs of results) {
      printPretty(cs);
    }
  }
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
