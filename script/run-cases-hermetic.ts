#!/usr/bin/env bun
// Prove the cases run against ONLY the committed minimal vocab subset
// (cases/_vocab_seed.sql) instead of the full ~928MB Athena bundle.
//
// Loads the seed into a throwaway `vocab_seed` schema (NEVER the real vocab.*),
// then runs the whole case suite with RC_VOCAB=vocab_seed so every vocab.*
// reference in the pipeline resolves against the subset. cm.* (built from
// mapspec/profiles/*.cm.json) is reused as-is.
//
// In a real Athena-free CI the same seed loads into a fresh Postgres `vocab`
// schema (drop the rename below) and cm.* is built from profiles first.
//
//   bun script/run-cases-hermetic.ts
import { $ } from "bun";

const DSN = process.env.ATHENA_DSN ?? "postgresql://athena:athena@localhost:54392/athena";

// Rewrite the seed's `vocab` schema → `vocab_seed` so we never touch real vocab.
const seed = await Bun.file("cases/_vocab_seed.sql").text();
const rewritten = seed
    .replaceAll("EXISTS vocab;", "EXISTS vocab_seed;")
    .replaceAll("vocab.", "vocab_seed.");
await Bun.write("/tmp/_vocab_seed_vs.sql", `DROP SCHEMA IF EXISTS vocab_seed CASCADE;\n${rewritten}`);

console.log("[hermetic] loading cases/_vocab_seed.sql → vocab_seed schema");
await $`psql ${DSN} -q -v ON_ERROR_STOP=1 -f /tmp/_vocab_seed_vs.sql`;
const n = await $`psql ${DSN} -tA -c ${"SELECT count(*) FROM vocab_seed.concept"}`.text();
console.log(`[hermetic] vocab_seed.concept = ${n.trim()} rows — running cases against the subset\n`);

const proc = Bun.spawn(["bun", "script/run-cases.ts", ...process.argv.slice(2)], {
    env: { ...process.env, RC_VOCAB: "vocab_seed", RC_SUFFIX: "herm" },
    stdout: "inherit", stderr: "inherit",
});
const code = await proc.exited;
await $`psql ${DSN} -q -c ${"DROP SCHEMA IF EXISTS vocab_seed CASCADE"}`.nothrow();
process.exit(code);
