#!/usr/bin/env bun

/**
 * Search FHIR R4 ValueSets by name
 *
 * Usage:
 *   bun scripts/fhir-valueset.ts <search>        # Search by name
 *   bun scripts/fhir-valueset.ts gender          # Find gender-related ValueSets
 *   bun scripts/fhir-valueset.ts --list          # List all ValueSets
 *   bun scripts/fhir-valueset.ts --pretty gender # Compact output
 */

const FHIR_CORE_DIR = "./fhir-core";
const VS_FILE = `${FHIR_CORE_DIR}/ValueSet.ndjson`;

interface ValueSet {
  resourceType: "ValueSet";
  id: string;
  url: string;
  name: string;
  title?: string;
  status: string;
  version?: string;
  description?: string;
  compose?: {
    include?: Array<{
      system?: string;
      valueSet?: string[];
      concept?: Array<{ code: string; display?: string }>;
      filter?: Array<{ property: string; op: string; value: string }>;
    }>;
    exclude?: Array<{
      system?: string;
      concept?: Array<{ code: string; display?: string }>;
    }>;
  };
  expansion?: {
    total?: number;
    contains?: Array<{ system?: string; code: string; display?: string }>;
  };
}

async function loadValueSets(): Promise<ValueSet[]> {
  const file = Bun.file(VS_FILE);
  if (!(await file.exists())) {
    console.error(`Error: ${VS_FILE} not found. Run: bun src/load-fhir-core.ts`);
    process.exit(1);
  }

  const text = await file.text();
  const lines = text.trim().split("\n");
  return lines.map((line) => JSON.parse(line));
}

function getIncludedSystems(vs: ValueSet): string[] {
  const systems: string[] = [];
  if (vs.compose?.include) {
    for (const inc of vs.compose.include) {
      if (inc.system) {
        // Shorten common URIs
        let sys = inc.system
          .replace("http://hl7.org/fhir/", "")
          .replace("http://terminology.hl7.org/CodeSystem/", "hl7:")
          .replace("http://snomed.info/sct", "SNOMED")
          .replace("http://loinc.org", "LOINC")
          .replace("http://www.nlm.nih.gov/research/umls/rxnorm", "RxNorm")
          .replace("http://unitsofmeasure.org", "UCUM")
          .replace("urn:iso:std:iso:", "ISO:");
        systems.push(sys);
      }
      if (inc.valueSet) {
        for (const vsRef of inc.valueSet) {
          systems.push(`VS:${vsRef.split("/").pop()}`);
        }
      }
    }
  }
  return systems;
}

function getConceptCount(vs: ValueSet): number | string {
  if (vs.expansion?.total !== undefined) {
    return vs.expansion.total;
  }
  if (vs.expansion?.contains) {
    return vs.expansion.contains.length;
  }
  let count = 0;
  if (vs.compose?.include) {
    for (const inc of vs.compose.include) {
      if (inc.concept) {
        count += inc.concept.length;
      } else if (inc.filter) {
        return "filtered";
      } else {
        return "all";
      }
    }
  }
  return count || "?";
}

function printPretty(vs: ValueSet) {
  const systems = getIncludedSystems(vs);
  const count = getConceptCount(vs);
  console.log(`${vs.name} [${count}]`);
  console.log(`  ${vs.url}`);
  if (systems.length > 0) {
    console.log(`  from: ${systems.join(", ")}`);
  }
  console.log();
}

function printFull(vs: ValueSet) {
  console.log(`${vs.name}`);
  console.log(`  id:     ${vs.id}`);
  console.log(`  url:    ${vs.url}`);
  console.log(`  status: ${vs.status}`);
  if (vs.title && vs.title !== vs.name) {
    console.log(`  title:  ${vs.title}`);
  }
  if (vs.description) {
    const desc = vs.description.slice(0, 150);
    console.log(`  desc:   ${desc}${vs.description.length > 150 ? "..." : ""}`);
  }

  // Show compose
  if (vs.compose?.include) {
    console.log(`\n  Include (${vs.compose.include.length}):`);
    for (const inc of vs.compose.include.slice(0, 10)) {
      if (inc.system) {
        const sys = inc.system.replace("http://hl7.org/fhir/", "");
        if (inc.concept) {
          console.log(`    ${sys} (${inc.concept.length} concepts)`);
          for (const c of inc.concept.slice(0, 5)) {
            console.log(`      ${c.code}${c.display ? ` - ${c.display}` : ""}`);
          }
          if (inc.concept.length > 5) {
            console.log(`      ... +${inc.concept.length - 5} more`);
          }
        } else if (inc.filter) {
          console.log(`    ${sys} (filtered: ${inc.filter.map((f) => `${f.property} ${f.op} ${f.value}`).join(", ")})`);
        } else {
          console.log(`    ${sys} (all)`);
        }
      }
      if (inc.valueSet) {
        for (const vsRef of inc.valueSet) {
          console.log(`    ValueSet: ${vsRef.split("/").pop()}`);
        }
      }
    }
    if (vs.compose.include.length > 10) {
      console.log(`    ... +${vs.compose.include.length - 10} more includes`);
    }
  }

  // Show expansion if available
  if (vs.expansion?.contains) {
    const total = vs.expansion.total ?? vs.expansion.contains.length;
    console.log(`\n  Expansion (${total} concepts):`);
    for (const c of vs.expansion.contains.slice(0, 10)) {
      console.log(`    ${c.code}${c.display ? ` - ${c.display}` : ""}`);
    }
    if (vs.expansion.contains.length > 10) {
      console.log(`    ... +${vs.expansion.contains.length - 10} more`);
    }
  }
  console.log();
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
    console.log(`Usage: bun scripts/fhir-valueset.ts [options] <search>

Options:
  --list           List all ValueSets
  --status <s>     Filter by status: active, draft, retired
  --pretty         Compact pretty print (token-efficient)
  --full           Show full definition with concepts
  --json           Output as JSON
  -h, --help       Show this help

Examples:
  bun scripts/fhir-valueset.ts gender
  bun scripts/fhir-valueset.ts --pretty observation
  bun scripts/fhir-valueset.ts --full administrative-gender
  bun scripts/fhir-valueset.ts --list --status active
`);
    return;
  }

  const valueSets = await loadValueSets();

  const listAll = args.includes("--list");
  const showFull = args.includes("--full");
  const showPretty = args.includes("--pretty");
  const outputJson = args.includes("--json");

  let statusFilter: string | null = null;
  const statusIdx = args.indexOf("--status");
  if (statusIdx !== -1 && args[statusIdx + 1]) {
    statusFilter = args[statusIdx + 1];
  }

  // Get search term
  const searchTerm = args.filter(
    (a) => !a.startsWith("--") && a !== statusFilter
  ).pop();

  let results = valueSets;

  // Filter by status
  if (statusFilter) {
    results = results.filter((vs) => vs.status === statusFilter);
  }

  // Filter by search term
  if (searchTerm && !listAll) {
    const search = searchTerm.toLowerCase();
    results = results.filter(
      (vs) =>
        vs.name?.toLowerCase().includes(search) ||
        vs.id?.toLowerCase().includes(search) ||
        vs.title?.toLowerCase().includes(search) ||
        vs.url?.toLowerCase().includes(search)
    );
  }

  // Sort by name
  results.sort((a, b) => (a.name || a.id).localeCompare(b.name || b.id));

  if (outputJson) {
    console.log(JSON.stringify(showFull ? results : results.map((vs) => ({
      name: vs.name,
      id: vs.id,
      url: vs.url,
      status: vs.status,
      title: vs.title,
    })), null, 2));
    return;
  }

  // Check for exact match when --full or --pretty is used
  if ((showFull || showPretty) && searchTerm) {
    const exactMatch = results.find(
      (vs) => vs.name?.toLowerCase() === searchTerm.toLowerCase() ||
              vs.id?.toLowerCase() === searchTerm.toLowerCase()
    );
    if (exactMatch) {
      results = [exactMatch];
    }
  }

  // Pretty print mode
  if (showPretty) {
    for (const vs of results) {
      printPretty(vs);
    }
    return;
  }

  // Full mode
  if (showFull) {
    for (const vs of results) {
      printFull(vs);
    }
    return;
  }

  // List mode or many results
  if (listAll || results.length > 10) {
    console.log(`Found ${results.length} ValueSets:\n`);
    // Group by first letter
    const byLetter: Record<string, ValueSet[]> = {};
    for (const vs of results) {
      const letter = (vs.name || vs.id)[0].toUpperCase();
      byLetter[letter] = byLetter[letter] || [];
      byLetter[letter].push(vs);
    }

    for (const letter of Object.keys(byLetter).sort()) {
      const items = byLetter[letter];
      const names = items.map((vs) => vs.name || vs.id);
      // Print in columns
      const cols = 3;
      const maxLen = Math.max(...names.map((n) => n.length)) + 2;
      for (let i = 0; i < names.length; i += cols) {
        const row = names.slice(i, i + cols);
        console.log(row.map((n) => n.padEnd(maxLen)).join(""));
      }
    }
  } else if (results.length === 0) {
    console.log(`No ValueSets found matching "${searchTerm}"`);
  } else {
    // Default: show pretty for few results
    for (const vs of results) {
      printPretty(vs);
    }
  }
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
