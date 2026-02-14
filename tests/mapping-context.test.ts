import { test, expect, describe } from "bun:test";
import { IdRegistry, MappingContext } from "../src/mapping-context";

// ============================================================
// IdRegistry
// ============================================================

describe("IdRegistry", () => {
  describe("getId", () => {
    test("assigns sequential IDs starting from 1", () => {
      const reg = new IdRegistry();
      expect(reg.getId("Patient", "aaa")).toBe(1);
      expect(reg.getId("Patient", "bbb")).toBe(2);
      expect(reg.getId("Patient", "ccc")).toBe(3);
    });

    test("same FHIR ID always returns same integer", () => {
      const reg = new IdRegistry();
      const id1 = reg.getId("Patient", "abc-123");
      const id2 = reg.getId("Patient", "abc-123");
      expect(id1).toBe(id2);
    });

    test("different resource types have independent counters", () => {
      const reg = new IdRegistry();
      expect(reg.getId("Patient", "abc")).toBe(1);
      expect(reg.getId("Encounter", "abc")).toBe(1);
      expect(reg.getId("Patient", "xyz")).toBe(2);
      expect(reg.getId("Encounter", "xyz")).toBe(2);
    });

    test("works with UUID-style IDs", () => {
      const reg = new IdRegistry();
      const id = reg.getId("Patient", "a1b2c3d4-e5f6-7890-abcd-ef1234567890");
      expect(id).toBe(1);
      expect(reg.getId("Patient", "a1b2c3d4-e5f6-7890-abcd-ef1234567890")).toBe(1);
    });

    test("works with numeric string IDs", () => {
      const reg = new IdRegistry();
      expect(reg.getId("Patient", "42")).toBe(1);
      expect(reg.getId("Patient", "43")).toBe(2);
    });
  });

  describe("resolveRef", () => {
    test("resolves Patient reference", () => {
      const reg = new IdRegistry();
      const id = reg.resolveRef({ reference: "Patient/abc-123" });
      expect(id).toBe(1);
    });

    test("resolves same reference to same ID", () => {
      const reg = new IdRegistry();
      const id1 = reg.resolveRef({ reference: "Patient/abc-123" });
      const id2 = reg.resolveRef({ reference: "Patient/abc-123" });
      expect(id1).toBe(id2);
    });

    test("different references get different IDs", () => {
      const reg = new IdRegistry();
      const id1 = reg.resolveRef({ reference: "Patient/aaa" });
      const id2 = reg.resolveRef({ reference: "Patient/bbb" });
      expect(id1).not.toBe(id2);
    });

    test("returns null for undefined ref", () => {
      const reg = new IdRegistry();
      expect(reg.resolveRef(undefined)).toBeNull();
    });

    test("returns null for ref without reference string", () => {
      const reg = new IdRegistry();
      expect(reg.resolveRef({ display: "Dr. Smith" })).toBeNull();
    });

    test("returns null for malformed reference (no slash)", () => {
      const reg = new IdRegistry();
      expect(reg.resolveRef({ reference: "abc" })).toBeNull();
    });

    test("resolves UUID reference", () => {
      const reg = new IdRegistry();
      const id = reg.resolveRef({ reference: "Practitioner/a1b2c3d4-e5f6-7890-abcd-ef1234567890" });
      expect(id).toBe(1);
    });

    test("getId and resolveRef share the same namespace", () => {
      const reg = new IdRegistry();
      const directId = reg.getId("Patient", "abc-123");
      const refId = reg.resolveRef({ reference: "Patient/abc-123" });
      expect(directId).toBe(refId);
    });
  });

  describe("getFhirId (reverse lookup)", () => {
    test("returns FHIR ID for assigned integer", () => {
      const reg = new IdRegistry();
      reg.getId("Patient", "abc-123");
      expect(reg.getFhirId("Patient", 1)).toBe("abc-123");
    });

    test("returns null for unknown integer ID", () => {
      const reg = new IdRegistry();
      expect(reg.getFhirId("Patient", 999)).toBeNull();
    });

    test("returns null for unknown resource type", () => {
      const reg = new IdRegistry();
      reg.getId("Patient", "abc");
      expect(reg.getFhirId("Encounter", 1)).toBeNull();
    });
  });

  describe("getMappings", () => {
    test("returns all mappings for a resource type", () => {
      const reg = new IdRegistry();
      reg.getId("Patient", "aaa");
      reg.getId("Patient", "bbb");
      const mappings = reg.getMappings("Patient");
      expect(mappings.size).toBe(2);
      expect(mappings.get("aaa")).toBe(1);
      expect(mappings.get("bbb")).toBe(2);
    });

    test("returns empty map for unknown resource type", () => {
      const reg = new IdRegistry();
      expect(reg.getMappings("Unknown").size).toBe(0);
    });
  });
});

// ============================================================
// MappingContext
// ============================================================

describe("MappingContext", () => {
  test("creates default IdRegistry if none provided", () => {
    const ctx = new MappingContext();
    expect(ctx.ids).toBeInstanceOf(IdRegistry);
  });

  test("uses provided IdRegistry", () => {
    const ids = new IdRegistry();
    ids.getId("Patient", "pre-existing");
    const ctx = new MappingContext(ids);
    expect(ctx.ids.getId("Patient", "pre-existing")).toBe(1);
  });
});

// ============================================================
// Cross-resource consistency
// ============================================================

describe("Cross-resource ID consistency", () => {
  test("Patient and Condition share same person_id for same patient reference", () => {
    const ctx = new MappingContext();

    // Simulate: Patient "abc" mapped first
    const personId = ctx.ids.getId("Patient", "abc");

    // Condition references Patient/abc
    const condPersonId = ctx.ids.resolveRef({ reference: "Patient/abc" });

    expect(personId).toBe(condPersonId);
  });

  test("Encounter and Observation share same visit_occurrence_id", () => {
    const ctx = new MappingContext();

    // Encounter "enc-1" mapped
    const visitId = ctx.ids.getId("Encounter", "enc-1");

    // Observation references Encounter/enc-1
    const obsVisitId = ctx.ids.resolveRef({ reference: "Encounter/enc-1" });

    expect(visitId).toBe(obsVisitId);
  });

  test("multiple resources referencing same patient get same person_id", () => {
    const ctx = new MappingContext();

    const id1 = ctx.ids.resolveRef({ reference: "Patient/uuid-patient" });
    const id2 = ctx.ids.resolveRef({ reference: "Patient/uuid-patient" });
    const id3 = ctx.ids.resolveRef({ reference: "Patient/uuid-patient" });

    expect(id1).toBe(id2);
    expect(id2).toBe(id3);
  });
});
