#!/usr/bin/env bun

/**
 * Initialize the fhir2omop project from scratch.
 *
 * Usage: bun scripts/init.ts
 *
 * This script:
 * 1. Installs dependencies (bun install)
 * 2. Initializes git submodules
 * 3. Downloads FHIR R4 Core definitions
 */

import { $ } from "bun";

async function main() {
  console.log("=== Initializing fhir2omop project ===\n");

  // 1. Install dependencies
  console.log("1. Installing dependencies...");
  await $`bun install`;
  console.log();

  // 2. Initialize git submodules
  console.log("2. Initializing git submodules...");
  await $`git submodule update --init --recursive`;
  console.log();

  // 3. Download FHIR Core
  console.log("3. Downloading FHIR R4 Core definitions...");
  await $`bun src/load-fhir-core.ts`;
  console.log();

  console.log("=== Project initialized successfully ===");
  console.log("\nYou can now use:");
  console.log("  bun scripts/fhir-structuredef.ts Patient    # Search FHIR resources");
  console.log("  bun scripts/omop-table.ts person            # Search OMOP tables");
}

main().catch((err) => {
  console.error("Initialization failed:", err);
  process.exit(1);
});
