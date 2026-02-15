import { test, expect, describe } from "bun:test";
import { mapProcedure } from "../src/mapper/procedure";
import type { Procedure } from "../src/types/fhir";
import { MappingContext, IdRegistry } from "../src/mapping-context";

function makeProcedure(overrides: Partial<Procedure> = {}): Procedure {
  return {
    resourceType: "Procedure",
    id: "proc-1",
    status: "completed",
    code: {
      coding: [{ system: "http://snomed.info/sct", code: "80146002", display: "Appendectomy" }],
    },
    subject: { reference: "Patient/1" },
    performedDateTime: "2023-03-15T10:00:00Z",
    ...overrides,
  };
}

// ============================================================
// Status filtering
// ============================================================

describe("Procedure status filter", () => {
  test("completed → mapped", () => {
    const result = mapProcedure(makeProcedure());
    expect(result).not.toBeNull();
  });

  test("in-progress → skipped", () => {
    const result = mapProcedure(makeProcedure({ status: "in-progress" }));
    expect(result).toBeNull();
  });

  test("preparation → skipped", () => {
    const result = mapProcedure(makeProcedure({ status: "preparation" }));
    expect(result).toBeNull();
  });

  test("not-done → skipped", () => {
    const result = mapProcedure(makeProcedure({ status: "not-done" }));
    expect(result).toBeNull();
  });

  test("entered-in-error → skipped", () => {
    const result = mapProcedure(makeProcedure({ status: "entered-in-error" }));
    expect(result).toBeNull();
  });

  test("stopped → skipped", () => {
    const result = mapProcedure(makeProcedure({ status: "stopped" }));
    expect(result).toBeNull();
  });

  test("on-hold → skipped", () => {
    const result = mapProcedure(makeProcedure({ status: "on-hold" }));
    expect(result).toBeNull();
  });

  test("unknown → skipped", () => {
    const result = mapProcedure(makeProcedure({ status: "unknown" }));
    expect(result).toBeNull();
  });
});

// ============================================================
// Field mapping
// ============================================================

describe("Procedure field mapping", () => {
  test("code → procedure_source_value", () => {
    const result = mapProcedure(makeProcedure());
    expect(result!.procedure_source_value).toBe("80146002");
  });

  test("performedDateTime → procedure_date + procedure_datetime", () => {
    const result = mapProcedure(makeProcedure({ performedDateTime: "2023-03-15T10:00:00Z" }));
    expect(result!.procedure_date).toBe("2023-03-15");
    expect(result!.procedure_datetime).toBe("2023-03-15T10:00:00Z");
  });

  test("performedPeriod → procedure_date from start, procedure_end_date from end", () => {
    const result = mapProcedure(makeProcedure({
      performedDateTime: undefined,
      performedPeriod: { start: "2023-03-15T08:00:00Z", end: "2023-03-15T12:00:00Z" },
    }));
    expect(result!.procedure_date).toBe("2023-03-15");
    expect(result!.procedure_datetime).toBe("2023-03-15T08:00:00Z");
    expect(result!.procedure_end_date).toBe("2023-03-15");
    expect(result!.procedure_end_datetime).toBe("2023-03-15T12:00:00Z");
  });

  test("performedDateTime preferred over performedPeriod", () => {
    const result = mapProcedure(makeProcedure({
      performedDateTime: "2023-04-01T09:00:00Z",
      performedPeriod: { start: "2023-03-15T08:00:00Z", end: "2023-03-15T12:00:00Z" },
    }));
    expect(result!.procedure_date).toBe("2023-04-01");
    expect(result!.procedure_datetime).toBe("2023-04-01T09:00:00Z");
  });

  test("no performedPeriod.end → null end dates", () => {
    const result = mapProcedure(makeProcedure({
      performedDateTime: undefined,
      performedPeriod: { start: "2023-03-15T08:00:00Z" },
    }));
    expect(result!.procedure_end_date).toBeNull();
    expect(result!.procedure_end_datetime).toBeNull();
  });

  test("bodySite → modifier_source_value", () => {
    const result = mapProcedure(makeProcedure({
      bodySite: [{ coding: [{ system: "http://snomed.info/sct", code: "66754008", display: "Appendix" }] }],
    }));
    expect(result!.modifier_source_value).toBe("66754008");
  });

  test("no bodySite → null modifier_source_value", () => {
    const result = mapProcedure(makeProcedure({ bodySite: undefined }));
    expect(result!.modifier_source_value).toBeNull();
  });

  test("type_concept_id defaults to 32817 (EHR)", () => {
    const result = mapProcedure(makeProcedure());
    expect(result!.procedure_type_concept_id).toBe(32817);
  });

  test("missing performedDateTime and performedPeriod → skipped", () => {
    const result = mapProcedure(makeProcedure({
      performedDateTime: undefined,
      performedPeriod: undefined,
    }));
    expect(result).toBeNull();
  });

  test("no code → skipped", () => {
    const result = mapProcedure(makeProcedure({ code: undefined }));
    expect(result).toBeNull();
  });

  test("empty code.coding → skipped", () => {
    const result = mapProcedure(makeProcedure({ code: { coding: [] } }));
    expect(result).toBeNull();
  });
});

// ============================================================
// References
// ============================================================

describe("Procedure references", () => {
  test("subject → person_id", () => {
    const ctx = new MappingContext();
    const result = mapProcedure(makeProcedure({ subject: { reference: "Patient/42" } }), ctx);
    expect(result!.person_id).toBeGreaterThan(0);
  });

  test("encounter → visit_occurrence_id", () => {
    const ctx = new MappingContext();
    const result = mapProcedure(makeProcedure({ encounter: { reference: "Encounter/99" } }), ctx);
    expect(result!.visit_occurrence_id).toBeGreaterThan(0);
  });

  test("performer[0].actor → provider_id", () => {
    const ctx = new MappingContext();
    const result = mapProcedure(makeProcedure({
      performer: [{ actor: { reference: "Practitioner/5" } }],
    }), ctx);
    expect(result!.provider_id).toBeGreaterThan(0);
  });

  test("no performer → null provider_id", () => {
    const ctx = new MappingContext();
    const result = mapProcedure(makeProcedure({ performer: undefined }), ctx);
    expect(result!.provider_id).toBeNull();
  });

  test("procedure gets its own ID from registry", () => {
    const ctx = new MappingContext();
    const result = mapProcedure(makeProcedure({ id: "proc-abc-uuid" }), ctx);
    expect(result!.procedure_occurrence_id).toBeGreaterThan(0);
  });
});

// ============================================================
// Hash mode integration
// ============================================================

describe("Procedure mapping with hash mode", () => {
  test("hash mode produces deterministic IDs across runs", () => {
    const proc = makeProcedure({ id: "proc-uuid-123" });
    const ctx1 = new MappingContext(new IdRegistry("hash"));
    const ctx2 = new MappingContext(new IdRegistry("hash"));
    const r1 = mapProcedure(proc, ctx1);
    const r2 = mapProcedure(proc, ctx2);
    expect(r1!.procedure_occurrence_id).toBe(r2!.procedure_occurrence_id);
    expect(r1!.person_id).toBe(r2!.person_id);
  });

  test("references resolve deterministically in hash mode", () => {
    const proc = makeProcedure({
      id: "proc-1",
      subject: { reference: "Patient/pt-uuid" },
      encounter: { reference: "Encounter/enc-uuid" },
      performer: [{ actor: { reference: "Practitioner/dr-uuid" } }],
    });
    const ctx1 = new MappingContext(new IdRegistry("hash"));
    const ctx2 = new MappingContext(new IdRegistry("hash"));
    const r1 = mapProcedure(proc, ctx1);
    const r2 = mapProcedure(proc, ctx2);
    expect(r1!.person_id).toBe(r2!.person_id);
    expect(r1!.visit_occurrence_id).toBe(r2!.visit_occurrence_id);
    expect(r1!.provider_id).toBe(r2!.provider_id);
  });

  test("no collisions for typical procedure mapping", () => {
    const ctx = new MappingContext(new IdRegistry("hash"));
    for (let i = 0; i < 100; i++) {
      mapProcedure(makeProcedure({ id: `proc-${i}` }), ctx);
    }
    expect(ctx.ids.hasCollisions()).toBe(false);
  });
});

// ============================================================
// Code prioritization
// ============================================================

describe("Procedure code prioritization", () => {
  test("SNOMED preferred over CPT4", () => {
    const result = mapProcedure(makeProcedure({
      code: {
        coding: [
          { system: "http://www.ama-assn.org/go/cpt", code: "44950", display: "Appendectomy" },
          { system: "http://snomed.info/sct", code: "80146002", display: "Appendectomy" },
        ],
      },
    }));
    expect(result!.procedure_source_value).toBe("80146002");
  });

  test("CPT4 used when no SNOMED available", () => {
    const result = mapProcedure(makeProcedure({
      code: {
        coding: [
          { system: "http://www.ama-assn.org/go/cpt", code: "44950", display: "Appendectomy" },
        ],
      },
    }));
    expect(result!.procedure_source_value).toBe("44950");
  });
});
