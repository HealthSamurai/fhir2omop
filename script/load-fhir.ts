#!/usr/bin/env bun
// Load FHIR Bundle .json files into Postgres as fhir.<resource_type>(id, resource jsonb).
//
// Usage:
//   bun script/load-fhir.ts                                # default dir
//   bun script/load-fhir.ts synthea2omop/output/fhir       # explicit dir
//   bun script/load-fhir.ts path/to/one-bundle.json        # single file
//
// Auth: connects via $ATHENA_DSN or postgresql://athena:athena@localhost:54392/athena
//
// Re-running is safe — INSERTs use ON CONFLICT (id) DO UPDATE.

import { statSync } from "node:fs";
import init from "../src/fhir/init";
import loadBundle from "../src/fhir/loadBundle";
import loadDir from "../src/fhir/loadDir";

const arg = process.argv[2] ?? "synthea2omop/output/fhir";
const ctx = { env: process.env } as any;

if (statSync(arg).isDirectory()) {
    const result = await loadDir(ctx, { dir: arg });
    console.log(JSON.stringify({ files: result.files, inserted: result.inserted, skipped: result.skipped }, null, 2));
} else {
    await init(ctx);
    const result = await loadBundle(ctx, { path: arg });
    console.log(JSON.stringify(result, null, 2));
}

process.exit(0);
