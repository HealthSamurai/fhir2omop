// fhir/connect re-exports the shared db/connect singleton so fhir.* functions
// share the same SQL client (single Bun.SQL pool across the process).
export { getSql } from "../db/connect";
export { default } from "../db/connect";
