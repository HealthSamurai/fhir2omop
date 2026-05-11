#!/usr/bin/env bun
// One-shot bootstrap: download the Athena vocabulary bundle from our GCS
// bucket, unzip it, and load it into the local Postgres container.
//
// Usage:
//   docker compose up -d
//   bun script/init-athena.ts
//   bun script/init-athena.ts gs://atomic-ehr-athena-vocab/bundles/other.zip
//
// Auth: requires `gcloud auth application-default login` or `gcloud auth login`
// with access to project atomic-ehr. The bucket is readable to project
// editors/owners under uniform bucket-level access.

import { $ } from "bun";
import { existsSync, statSync } from "node:fs";
import { basename, join } from "node:path";

const DEFAULT_URI =
  "gs://atomic-ehr-athena-vocab/bundles/athena-bundle-20260511-v20260227.zip";

const ATHENA_DIR = join(import.meta.dir, "..", "athena");
const DOWNLOAD_DIR = join(ATHENA_DIR, "downloads");
const BUNDLE_DIR = join(ATHENA_DIR, "bundle");

const uri = process.argv[2] ?? DEFAULT_URI;
const zipName = basename(uri);
const zipPath = join(DOWNLOAD_DIR, zipName);

console.log(`Bundle URI: ${uri}`);
console.log(`Local path: ${zipPath}`);

await $`mkdir -p ${DOWNLOAD_DIR} ${BUNDLE_DIR}`;

// --- Download (skip if already present and non-empty) ---
if (existsSync(zipPath) && statSync(zipPath).size > 0) {
  console.log("ZIP already downloaded, skipping.");
} else {
  console.log("Downloading from GCS…");
  await $`gcloud storage cp ${uri} ${zipPath}`;
}

// --- Unzip into bundle/ (overwrite) ---
console.log(`Extracting to ${BUNDLE_DIR}…`);
await $`unzip -o ${zipPath} -d ${BUNDLE_DIR}`.quiet();

// --- Wait for postgres ---
const DSN = process.env.ATHENA_DSN
  ?? "postgresql://athena:athena@localhost:54392/athena";

console.log(`Waiting for Postgres at ${DSN}…`);
for (let i = 0; i < 30; i++) {
  const r = await $`psql ${DSN} -tAc "SELECT 1"`.quiet().nothrow();
  if (r.exitCode === 0) { console.log("Postgres ready."); break; }
  await Bun.sleep(1000);
  if (i === 29) {
    console.error("Postgres did not become ready. Run `docker compose up -d` first.");
    process.exit(1);
  }
}

// --- Load ---
console.log("Loading vocab tables…");
await $`bun ${join(import.meta.dir, "load-athena.ts")} ${BUNDLE_DIR}`;

console.log("\nInitialization complete.");
