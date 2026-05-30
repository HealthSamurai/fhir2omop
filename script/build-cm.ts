#!/usr/bin/env bun
// Materialize cm.* (the source-code → OMOP concept lookup tables) from
// mapspec/profiles/*.cm.json into the database named by $ATHENA_DSN.
//
// Athena-light: a ConceptMap group only touches vocab.concept when it declares
// the `omop-source-vocabulary` extension (to fill source_concept_id) — and the
// committed cases/_vocab_seed.sql already carries those concepts. So this runs
// against the seed alone, which is what the hermetic CI uses (no full Athena).
//
//   bun script/build-cm.ts
const ctx: any = { env: process.env, fns: {}, state: {} };
ctx.fns.db = { query: (await import("../src/db/query")).default };
ctx.fns.profiles = { load: (await import("../src/profiles/load")).default };
const cmMat = (await import("../src/conceptmap/materialize")).default;

const { conceptmaps } = await ctx.fns.profiles.load(ctx);
let total = 0;
for (const cm of conceptmaps) {
    const r = await cmMat(ctx, { cm });
    total += r.rows;
    console.log(`  ${r.table.padEnd(44)} ${r.rows} rows`);
}
console.log(`built ${conceptmaps.length} cm.* tables, ${total} rows`);
process.exit(0);
