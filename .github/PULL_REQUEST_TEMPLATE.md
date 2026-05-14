## What's in this PR

<!-- One or two sentences. Reference the edge / profile / file. -->

## Why

<!-- The motivation. Link to issue if any. -->

## Changes

- [ ] `mapspec/edges/<R>__<t>.json` updated
- [ ] `mapspec/profiles/...` updated
- [ ] `mapspec/views/...` regenerated (`bun script/gen-views.ts`)
- [ ] Narrative docs updated (`mapspec/<R>/<t>.md`)
- [ ] Code (src/, script/) changed
- [ ] Tests added / updated

## Validation

- [ ] `bun script/repl.ts 'await ctx.fns.repl.load(ctx, { name: "profiles" })'` succeeds
- [ ] Affected `/mapspec/...` and `/profiles/...` URLs return 200 and render correctly
- [ ] `bunx tsc --noEmit` clean
- [ ] `bun test` clean (if applicable)

## Citations

<!-- Any reference impls / OHDSI docs / FHIR spec sections you consulted -->
