#!/usr/bin/env bun
/**
 * OMOP FHIR Profile CLI — validate FHIR resources against OMOP profiles.
 *
 * Usage:
 *   bun scripts/profile.ts list                              # List profiles
 *   bun scripts/profile.ts show <profile>                    # Show profile constraints
 *   bun scripts/profile.ts validate <profile> [file.json]    # Validate resource
 *   bun scripts/profile.ts validate <profile> < resource.json
 */

import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const PROFILES_DIR = resolve(join(import.meta.dir, "..", "profiles"));

// --- FSH Parser (minimal, sufficient for our profiles) ---

interface FshValueSet {
  name: string;
  id: string;
  title: string;
  description: string;
  systems: string[];
  concepts: { system: string; code: string; display?: string }[];
}

interface FshConstraint {
  path: string;
  kind: "cardinality" | "type" | "flag" | "binding" | "only";
  min?: number;
  max?: string;
  types?: string[];
  flags?: string[];
  valueSet?: string;
  strength?: string;
}

interface FshProfile {
  name: string;
  parent: string;
  id: string;
  title: string;
  description: string;
  constraints: FshConstraint[];
}

function parseFshFiles(): { profiles: FshProfile[]; valueSets: FshValueSet[] } {
  const profiles: FshProfile[] = [];
  const valueSets: FshValueSet[] = [];
  const files = readdirSync(PROFILES_DIR).filter((f) => f.endsWith(".fsh"));

  for (const file of files) {
    const content = readFileSync(join(PROFILES_DIR, file), "utf-8");
    const lines = content.split("\n");

    let currentProfile: FshProfile | null = null;
    let currentVS: FshValueSet | null = null;
    let descBuffer: string[] = [];
    let inDesc = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      // Skip comments
      if (trimmed.startsWith("//")) continue;

      // Multi-line description handling
      if (inDesc) {
        if (trimmed === '"""') {
          const desc = descBuffer.join(" ").trim();
          if (currentProfile) currentProfile.description = desc;
          if (currentVS) currentVS.description = desc;
          inDesc = false;
          descBuffer = [];
          continue;
        }
        descBuffer.push(trimmed);
        continue;
      }

      // Profile start
      const profileMatch = trimmed.match(/^Profile:\s*(.+)/);
      if (profileMatch) {
        currentProfile = { name: profileMatch[1], parent: "", id: "", title: "", description: "", constraints: [] };
        currentVS = null;
        profiles.push(currentProfile);
        continue;
      }

      // ValueSet start
      const vsMatch = trimmed.match(/^ValueSet:\s*(.+)/);
      if (vsMatch) {
        currentVS = { name: vsMatch[1], id: "", title: "", description: "", systems: [], concepts: [] };
        currentProfile = null;
        valueSets.push(currentVS);
        continue;
      }

      // Metadata fields
      if (currentProfile || currentVS) {
        const parentMatch = trimmed.match(/^Parent:\s*(.+)/);
        if (parentMatch && currentProfile) { currentProfile.parent = parentMatch[1]; continue; }

        const idMatch = trimmed.match(/^Id:\s*(.+)/);
        if (idMatch) {
          if (currentProfile) currentProfile.id = idMatch[1];
          if (currentVS) currentVS.id = idMatch[1];
          continue;
        }

        const titleMatch = trimmed.match(/^Title:\s*"(.+)"/);
        if (titleMatch) {
          if (currentProfile) currentProfile.title = titleMatch[1];
          if (currentVS) currentVS.title = titleMatch[1];
          continue;
        }

        const descSingle = trimmed.match(/^Description:\s*"(.+)"/);
        if (descSingle) {
          if (currentProfile) currentProfile.description = descSingle[1];
          if (currentVS) currentVS.description = descSingle[1];
          continue;
        }

        if (trimmed.startsWith('Description: """')) {
          inDesc = true;
          descBuffer = [];
          continue;
        }
      }

      // ValueSet includes
      if (currentVS) {
        const systemInclude = trimmed.match(/^\*\s+codes\s+from\s+system\s+(\S+)/);
        if (systemInclude) {
          currentVS.systems.push(systemInclude[1]);
          continue;
        }
        const conceptInclude = trimmed.match(/^\*\s+(\S+)#(\S+)\s*(".*")?/);
        if (conceptInclude) {
          currentVS.concepts.push({
            system: conceptInclude[1],
            code: conceptInclude[2],
            display: conceptInclude[3]?.replace(/"/g, ""),
          });
          continue;
        }
      }

      // Profile constraints
      if (currentProfile && trimmed.startsWith("*")) {
        const rule = trimmed.substring(1).trim();
        parseConstraint(rule, currentProfile);
      }
    }
  }

  return { profiles, valueSets };
}

function parseConstraint(rule: string, profile: FshProfile) {
  // "path from ValueSetName (strength)"
  const bindingMatch = rule.match(/^(\S+)\s+from\s+(\S+)\s*\((\w+)\)/);
  if (bindingMatch) {
    profile.constraints.push({
      path: bindingMatch[1],
      kind: "binding",
      valueSet: bindingMatch[2],
      strength: bindingMatch[3],
    });
    return;
  }

  // "path only Type1 | Type2"
  const onlyMatch = rule.match(/^(\S+)\s+only\s+(.+)/);
  if (onlyMatch) {
    const types = onlyMatch[2].split("|").map((t) => t.trim().replace(/^Reference\((.+)\)$/, "$1"));
    profile.constraints.push({ path: onlyMatch[1], kind: "only", types });
    return;
  }

  // "path min..max flags"
  const cardMatch = rule.match(/^(\S+)\s+(\d+)\.\.(\S+)\s*(.*)/);
  if (cardMatch) {
    const flags = cardMatch[4].trim().split(/\s+/).filter(Boolean);
    profile.constraints.push({
      path: cardMatch[1],
      kind: "cardinality",
      min: parseInt(cardMatch[2]),
      max: cardMatch[3],
      flags,
    });
    return;
  }

  // "path MS" or other flags
  const flagMatch = rule.match(/^(\S+)\s+(MS|SU|TU|NP|D)\b/);
  if (flagMatch) {
    profile.constraints.push({
      path: flagMatch[1],
      kind: "flag",
      flags: [flagMatch[2]],
    });
    return;
  }
}

// --- Validator ---

interface Issue {
  severity: "error" | "warning";
  path: string;
  message: string;
}

/**
 * Resolve a dotted path on a FHIR resource.
 * Handles choice types (effective[x]) and arrays transparently:
 * if an intermediate value is an array, checks all items and returns
 * the first match (for existence checks) or undefined.
 */
function getNestedValue(obj: any, path: string): any {
  const parts = path.split(".");
  let current = obj;
  for (const part of parts) {
    if (current == null) return undefined;
    // Handle [x] choice types
    if (part.endsWith("[x]")) {
      const base = part.slice(0, -3);
      for (const key of Object.keys(current)) {
        if (key.startsWith(base) && key !== base) {
          return current[key];
        }
      }
      return undefined;
    }
    // If current is an array, check that all items have the property
    if (Array.isArray(current)) {
      // Return the property from first item for existence check
      if (current.length === 0) return undefined;
      return current[0][part];
    }
    current = current[part];
  }
  return current;
}

/**
 * Check whether all items in an array have a required child property.
 * Returns issues for items missing the property.
 */
function checkArrayChildRequired(obj: any, path: string, min: number): Issue[] {
  const issues: Issue[] = [];
  const parts = path.split(".");

  // Walk down to find where the array is
  let current = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (current == null) return [];
    if (Array.isArray(current)) {
      // The rest of the path applies to each item
      const remaining = parts.slice(i).join(".");
      const prefix = parts.slice(0, i).join(".");
      for (let j = 0; j < current.length; j++) {
        const childVal = getNestedValue(current[j], remaining);
        if (childVal === undefined || childVal === null) {
          issues.push({
            severity: "error",
            path: `${prefix}[${j}].${remaining}`,
            message: `Required element "${parts[parts.length - 1]}" is missing in ${prefix}[${j}]`,
          });
        }
      }
      return issues;
    }
    const part = parts[i];
    if (part.endsWith("[x]")) {
      const base = part.slice(0, -3);
      let found = false;
      for (const key of Object.keys(current)) {
        if (key.startsWith(base) && key !== base) {
          current = current[key];
          found = true;
          break;
        }
      }
      if (!found) return [];
    } else {
      current = current[part];
    }
  }

  // Check the final property
  const lastPart = parts[parts.length - 1];
  if (current == null) return [];

  if (Array.isArray(current)) {
    const parentPath = parts.slice(0, -1).join(".");
    for (let j = 0; j < current.length; j++) {
      if (current[j][lastPart] === undefined || current[j][lastPart] === null) {
        issues.push({
          severity: "error",
          path: `${parentPath}[${j}].${lastPart}`,
          message: `Required element "${lastPart}" is missing in ${parentPath}[${j}]`,
        });
      }
    }
  }

  return issues;
}

function validateResource(
  resource: any,
  profile: FshProfile,
  valueSets: FshValueSet[]
): { valid: boolean; issues: Issue[] } {
  const issues: Issue[] = [];
  const vsMap = new Map(valueSets.map((vs) => [vs.name, vs]));

  for (const constraint of profile.constraints) {
    const path = constraint.path;

    switch (constraint.kind) {
      case "cardinality": {
        if (constraint.min && constraint.min > 0) {
          const value = getNestedValue(resource, path);
          if (value === undefined || value === null) {
            // For nested paths (e.g., coding.system), check if parent is array
            const arrayIssues = checkArrayChildRequired(resource, path, constraint.min);
            if (arrayIssues.length > 0) {
              issues.push(...arrayIssues);
            } else {
              issues.push({
                severity: "error",
                path,
                message: `Required element "${path}" is missing (min: ${constraint.min})`,
              });
            }
          } else if (Array.isArray(value) && value.length < constraint.min) {
            issues.push({
              severity: "error",
              path,
              message: `"${path}" has ${value.length} items, minimum is ${constraint.min}`,
            });
          }
        }
        break;
      }

      case "only": {
        if (constraint.types?.includes("CodeableConcept")) {
          // medication[x] only CodeableConcept — check that it's not a Reference
          const refKey = path.replace("[x]", "Reference");
          if (resource[refKey]) {
            issues.push({
              severity: "error",
              path,
              message: `"${path}" must be a CodeableConcept, not a Reference`,
            });
          }
          const ccKey = path.replace("[x]", "CodeableConcept");
          if (!resource[ccKey] && !getNestedValue(resource, path)) {
            // Will be caught by cardinality check
          }
        }
        break;
      }

      case "binding": {
        const vs = vsMap.get(constraint.valueSet ?? "");
        if (!vs) break;

        const value = getNestedValue(resource, path);
        if (value === undefined || value === null) break; // Presence checked by cardinality

        // For status (code type)
        if (typeof value === "string") {
          if (vs.concepts.length > 0) {
            const validCodes = vs.concepts.map((c) => c.code);
            if (!validCodes.includes(value)) {
              issues.push({
                severity: constraint.strength === "required" ? "error" : "warning",
                path,
                message: `Value "${value}" is not in ValueSet ${vs.name} (${validCodes.join(", ")})`,
              });
            }
          }
          break;
        }

        // For CodeableConcept type
        if (typeof value === "object" && value.coding) {
          if (vs.systems.length > 0) {
            const hasRecognized = value.coding.some(
              (c: any) => c.system && vs.systems.includes(c.system)
            );
            if (!hasRecognized) {
              const foundSystems = value.coding.map((c: any) => c.system).filter(Boolean).join(", ");
              issues.push({
                severity: constraint.strength === "required" ? "error" : "warning",
                path,
                message: `No coding from recognized systems in ValueSet ${vs.name}. Found: ${foundSystems || "none"}. Expected one of: ${vs.systems.join(", ")}`,
              });
            }
          }
          break;
        }
        break;
      }

      case "flag": {
        // MS (must-support) — warn if missing
        if (constraint.flags?.includes("MS")) {
          const value = getNestedValue(resource, path);
          if (value === undefined || value === null) {
            issues.push({
              severity: "warning",
              path,
              message: `Must-support element "${path}" is not present`,
            });
          }
        }
        break;
      }
    }
  }

  return {
    valid: issues.every((i) => i.severity !== "error"),
    issues,
  };
}

// --- CLI ---

const args = process.argv.slice(2);
const command = args[0];

const { profiles, valueSets } = parseFshFiles();

switch (command) {
  case "list": {
    console.log("Profiles:");
    for (const p of profiles) {
      console.log(`  ${p.name} (${p.parent}) — ${p.title}`);
    }
    console.log("\nValueSets:");
    for (const vs of valueSets) {
      console.log(`  ${vs.name} — ${vs.title}`);
      if (vs.systems.length > 0) {
        for (const s of vs.systems) console.log(`    system: ${s}`);
      }
      if (vs.concepts.length > 0) {
        for (const c of vs.concepts) console.log(`    #${c.code} ${c.display ?? ""}`);
      }
    }
    break;
  }

  case "show": {
    const name = args[1];
    const profile = profiles.find((p) => p.name === name || p.id === name);
    if (!profile) {
      console.error(`Profile not found: ${name}`);
      console.error(`Available: ${profiles.map((p) => p.name).join(", ")}`);
      process.exit(1);
    }
    console.log(`Profile: ${profile.name}`);
    console.log(`Parent: ${profile.parent}`);
    console.log(`Id: ${profile.id}`);
    console.log(`Title: ${profile.title}`);
    console.log(`Description: ${profile.description}`);
    console.log("\nConstraints:");
    for (const c of profile.constraints) {
      switch (c.kind) {
        case "cardinality":
          console.log(`  ${c.path} ${c.min}..${c.max} ${c.flags?.join(" ") ?? ""}`);
          break;
        case "binding":
          console.log(`  ${c.path} from ${c.valueSet} (${c.strength})`);
          break;
        case "only":
          console.log(`  ${c.path} only ${c.types?.join(" | ")}`);
          break;
        case "flag":
          console.log(`  ${c.path} ${c.flags?.join(" ")}`);
          break;
      }
    }
    // Show referenced value sets
    const referencedVS = profile.constraints
      .filter((c) => c.valueSet)
      .map((c) => c.valueSet!);
    for (const vsName of new Set(referencedVS)) {
      const vs = valueSets.find((v) => v.name === vsName);
      if (vs) {
        console.log(`\nValueSet: ${vs.name} — ${vs.title}`);
        if (vs.systems.length > 0) {
          for (const s of vs.systems) console.log(`  system: ${s}`);
        }
        if (vs.concepts.length > 0) {
          for (const c of vs.concepts) console.log(`  #${c.code} ${c.display ?? ""}`);
        }
      }
    }
    break;
  }

  case "validate": {
    const profileName = args[1];
    const filePath = args[2];

    if (!profileName) {
      console.error("Usage: bun scripts/profile.ts validate <profile> [file.json]");
      process.exit(1);
    }

    const profile = profiles.find((p) => p.name === profileName || p.id === profileName);
    if (!profile) {
      console.error(`Profile not found: ${profileName}`);
      console.error(`Available: ${profiles.map((p) => p.name).join(", ")}`);
      process.exit(1);
    }

    let input: string;
    if (filePath) {
      input = readFileSync(filePath, "utf-8");
    } else {
      // Read from stdin
      input = readFileSync("/dev/stdin", "utf-8");
    }

    const resource = JSON.parse(input);
    const result = validateResource(resource, profile, valueSets);

    if (result.issues.length === 0) {
      console.log(`✓ Valid against ${profile.name}`);
    } else {
      for (const issue of result.issues) {
        const icon = issue.severity === "error" ? "✗" : "⚠";
        console.log(`${icon} [${issue.severity}] ${issue.path}: ${issue.message}`);
      }
      console.log(`\n${result.valid ? "✓ Valid" : "✗ Invalid"} (${result.issues.filter((i) => i.severity === "error").length} errors, ${result.issues.filter((i) => i.severity === "warning").length} warnings)`);
    }

    process.exit(result.valid ? 0 : 1);
  }

  default:
    console.log("OMOP FHIR Profile Validator");
    console.log("");
    console.log("Usage:");
    console.log("  bun scripts/profile.ts list                           List profiles and value sets");
    console.log("  bun scripts/profile.ts show <profile>                 Show profile constraints");
    console.log("  bun scripts/profile.ts validate <profile> [file.json] Validate a resource");
    console.log("");
    console.log("Examples:");
    console.log('  bun scripts/profile.ts validate OmopMedicationStatement resource.json');
    console.log('  cat resource.json | bun scripts/profile.ts validate OmopMedicationStatement');
    break;
}
