import { gunzipSync } from "bun";
import { mkdir } from "node:fs/promises";

const FHIR_CORE_URL = "https://fs.get-ig.org/rs/hl7.fhir.r4.core-4.0.1.ndjson.gz";
const OUTPUT_DIR = "./fhir-core";

async function loadFhirCore() {
  console.log("Downloading FHIR R4 Core metadata...");
  console.log(`URL: ${FHIR_CORE_URL}`);

  const response = await fetch(FHIR_CORE_URL);
  if (!response.ok) {
    throw new Error(`Failed to download: ${response.status} ${response.statusText}`);
  }

  console.log("Decompressing...");
  const compressed = await response.arrayBuffer();
  const decompressed = gunzipSync(compressed);
  const text = new TextDecoder().decode(decompressed);

  console.log("Parsing NDJSON...");
  const lines = text.trim().split("\n");
  console.log(`Found ${lines.length} resources`);

  // Create output directory
  await mkdir(OUTPUT_DIR, { recursive: true });

  // Group resources by type
  const byType: Record<string, any[]> = {};
  const byTypeAndId: Record<string, Record<string, any>> = {};

  for (const line of lines) {
    if (!line.trim()) continue;
    try {
      const resource = JSON.parse(line);
      const type = resource.resourceType;
      if (!type) continue;

      byType[type] = byType[type] || [];
      byType[type].push(resource);

      // Index by id for easy lookup
      if (resource.id) {
        byTypeAndId[type] = byTypeAndId[type] || {};
        byTypeAndId[type][resource.id] = resource;
      }
    } catch (e) {
      console.error("Failed to parse line:", line.slice(0, 100));
    }
  }

  // Print summary
  console.log("\nResource types:");
  const types = Object.keys(byType).sort();
  for (const type of types) {
    console.log(`  ${type}: ${byType[type].length}`);
  }

  // Save each resource type to a separate file
  console.log("\nSaving files...");
  for (const type of types) {
    const filePath = `${OUTPUT_DIR}/${type}.ndjson`;
    const content = byType[type].map((r) => JSON.stringify(r)).join("\n");
    await Bun.write(filePath, content);
    console.log(`  ${filePath}`);
  }

  // Save index file with all resource types and counts
  const index = {
    source: FHIR_CORE_URL,
    downloadedAt: new Date().toISOString(),
    resourceTypes: Object.fromEntries(
      types.map((t) => [t, byType[t].length])
    ),
  };
  await Bun.write(`${OUTPUT_DIR}/index.json`, JSON.stringify(index, null, 2));
  console.log(`  ${OUTPUT_DIR}/index.json`);

  // Save a combined lookup file for StructureDefinitions by type
  if (byTypeAndId["StructureDefinition"]) {
    const sdByType: Record<string, any> = {};
    for (const sd of byType["StructureDefinition"]) {
      if (sd.type) {
        sdByType[sd.type] = sdByType[sd.type] || [];
        sdByType[sd.type].push({
          id: sd.id,
          url: sd.url,
          name: sd.name,
          kind: sd.kind,
          abstract: sd.abstract,
          baseDefinition: sd.baseDefinition,
        });
      }
    }
    await Bun.write(
      `${OUTPUT_DIR}/StructureDefinition-by-type.json`,
      JSON.stringify(sdByType, null, 2)
    );
    console.log(`  ${OUTPUT_DIR}/StructureDefinition-by-type.json`);
  }

  console.log("\nDone!");
}

loadFhirCore().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
