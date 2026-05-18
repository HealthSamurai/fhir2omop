import { readdirSync } from "node:fs";
import { resolve } from "node:path";
import init from "./init";
import loadBundle from "./loadBundle";

// Walk a directory of *.json bundle files and load each via loadBundle, with
// a small worker pool (default 8 concurrent files) so Postgres roundtrips
// overlap. Progress reported every ~50 files. Returns aggregate counts.
export default async function (
    ctx: Context,
    opts: { dir: string; concurrency?: number },
): Promise<{ files: number; inserted: number; skipped: number; byType: Record<string, number>; ms: number }> {
    await init(ctx);

    const files = readdirSync(opts.dir).filter((f) => f.endsWith(".json")).sort();
    const concurrency = Math.max(1, opts.concurrency ?? 8);
    console.log(`[fhir.loadDir] ${files.length} bundles in ${opts.dir} (concurrency=${concurrency})`);

    let inserted = 0;
    let skipped = 0;
    const byType: Record<string, number> = {};
    const t0 = Date.now();
    let next = 0;
    let done = 0;
    let lastTick = 0;

    async function worker() {
        while (true) {
            const i = next++;
            if (i >= files.length) return;
            const fpath = resolve(opts.dir, files[i]!);
            try {
                const r = await loadBundle(ctx, { path: fpath });
                inserted += r.inserted;
                skipped  += r.skipped;
                for (const [k, v] of Object.entries(r.byType)) {
                    byType[k] = (byType[k] ?? 0) + v;
                }
            } catch (e: any) {
                console.error(`  ! ${files[i]}: ${e?.message ?? e}`);
                skipped++;
            }
            done++;
            if (done - lastTick >= 50 || done === files.length) {
                lastTick = done;
                const elapsed = (Date.now() - t0) / 1000;
                const eta = elapsed / done * (files.length - done);
                console.log(
                    `  ${done}/${files.length} · ${inserted.toLocaleString()} rows · ` +
                    `${elapsed.toFixed(0)}s elapsed · eta ${eta.toFixed(0)}s`,
                );
            }
        }
    }

    await Promise.all(Array.from({ length: concurrency }, () => worker()));

    const ms = Date.now() - t0;
    console.log(`[fhir.loadDir] done in ${(ms / 1000).toFixed(1)}s — ${inserted.toLocaleString()} rows, ${skipped} skipped`);
    console.log("[fhir.loadDir] by resource type:");
    for (const [k, v] of Object.entries(byType).sort((a, b) => b[1] - a[1])) {
        console.log(`  ${k.padEnd(25)} ${v.toLocaleString().padStart(10)}`);
    }
    return { files: files.length, inserted, skipped, byType, ms };
}
