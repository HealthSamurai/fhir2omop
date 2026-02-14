import { test, expect, describe } from "bun:test";
import { IdRegistry, MappingContext, fnv1a64 } from "../src/mapping-context";

// ============================================================
// IdRegistry — Sequential mode
// ============================================================

describe("IdRegistry (sequential)", () => {
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

  test("no collisions in sequential mode", () => {
    const reg = new IdRegistry();
    reg.getId("Patient", "aaa");
    reg.getId("Patient", "bbb");
    expect(reg.hasCollisions()).toBe(false);
    expect(reg.getCollisions()).toEqual([]);
  });
});

// ============================================================
// IdRegistry — Hash mode
// ============================================================

describe("IdRegistry (hash)", () => {
  describe("getId", () => {
    test("produces positive integers", () => {
      const reg = new IdRegistry("hash");
      const id = reg.getId("Patient", "abc-123");
      expect(id).toBeGreaterThan(0);
    });

    test("same input always produces same hash", () => {
      const reg = new IdRegistry("hash");
      const id1 = reg.getId("Patient", "abc-123");
      const id2 = reg.getId("Patient", "abc-123");
      expect(id1).toBe(id2);
    });

    test("different inputs produce different hashes", () => {
      const reg = new IdRegistry("hash");
      const id1 = reg.getId("Patient", "aaa");
      const id2 = reg.getId("Patient", "bbb");
      expect(id1).not.toBe(id2);
    });

    test("different resource types produce different hashes for same ID", () => {
      const reg = new IdRegistry("hash");
      const id1 = reg.getId("Patient", "abc");
      const id2 = reg.getId("Encounter", "abc");
      expect(id1).not.toBe(id2);
    });

    test("works with UUID-style IDs", () => {
      const reg = new IdRegistry("hash");
      const id = reg.getId("Patient", "a1b2c3d4-e5f6-7890-abcd-ef1234567890");
      expect(id).toBeGreaterThan(0);
      expect(reg.getId("Patient", "a1b2c3d4-e5f6-7890-abcd-ef1234567890")).toBe(id);
    });

    test("hash is deterministic across separate registry instances", () => {
      const reg1 = new IdRegistry("hash");
      const reg2 = new IdRegistry("hash");
      expect(reg1.getId("Patient", "abc-123")).toBe(reg2.getId("Patient", "abc-123"));
    });
  });

  describe("resolveRef", () => {
    test("resolves reference to deterministic hash", () => {
      const reg = new IdRegistry("hash");
      const id = reg.resolveRef({ reference: "Patient/abc-123" });
      expect(id).toBeGreaterThan(0);

      // Same reference in a separate registry → same hash
      const reg2 = new IdRegistry("hash");
      expect(reg2.resolveRef({ reference: "Patient/abc-123" })).toBe(id);
    });

    test("getId and resolveRef produce same hash for same resource", () => {
      const reg = new IdRegistry("hash");
      const directId = reg.getId("Patient", "abc-123");
      const refId = reg.resolveRef({ reference: "Patient/abc-123" });
      expect(directId).toBe(refId);
    });

    test("returns null for missing references", () => {
      const reg = new IdRegistry("hash");
      expect(reg.resolveRef(undefined)).toBeNull();
      expect(reg.resolveRef({ display: "test" })).toBeNull();
    });
  });

  describe("reverse lookup", () => {
    test("getFhirId works in hash mode", () => {
      const reg = new IdRegistry("hash");
      const id = reg.getId("Patient", "abc-123");
      expect(reg.getFhirId("Patient", id)).toBe("abc-123");
    });
  });
});

// ============================================================
// FNV-1a-64 hash function
// ============================================================

describe("fnv1a64", () => {
  test("produces positive integers", () => {
    expect(fnv1a64("test")).toBeGreaterThan(0);
  });

  test("deterministic — same input always same output", () => {
    expect(fnv1a64("hello")).toBe(fnv1a64("hello"));
  });

  test("different inputs produce different hashes", () => {
    expect(fnv1a64("hello")).not.toBe(fnv1a64("world"));
  });

  test("fits in signed BIGINT range (0 to 2^63-1)", () => {
    const MAX_BIGINT = 2 ** 63 - 1;
    const ids = ["test", "Patient:abc-123", "Encounter:uuid-456", "x".repeat(100)];
    for (const id of ids) {
      const hash = fnv1a64(id);
      expect(hash).toBeGreaterThanOrEqual(0);
      expect(hash).toBeLessThanOrEqual(MAX_BIGINT);
    }
  });

  test("namespaced inputs differ", () => {
    expect(fnv1a64("Patient:abc")).not.toBe(fnv1a64("Encounter:abc"));
  });

  test("handles empty string", () => {
    const hash = fnv1a64("");
    expect(hash).toBeGreaterThan(0);
  });
});

// ============================================================
// Collision detection
// ============================================================

describe("Collision detection (hash mode)", () => {
  test("no collisions for distinct inputs", () => {
    const reg = new IdRegistry("hash");
    reg.getId("Patient", "aaa");
    reg.getId("Patient", "bbb");
    reg.getId("Patient", "ccc");
    expect(reg.hasCollisions()).toBe(false);
    expect(reg.getCollisions()).toEqual([]);
  });

  test("repeated same input is NOT a collision", () => {
    const reg = new IdRegistry("hash");
    reg.getId("Patient", "aaa");
    reg.getId("Patient", "aaa");
    reg.getId("Patient", "aaa");
    expect(reg.hasCollisions()).toBe(false);
  });

  test("getCollisions returns copy (not internal state)", () => {
    const reg = new IdRegistry("hash");
    const c1 = reg.getCollisions();
    const c2 = reg.getCollisions();
    expect(c1).not.toBe(c2); // different array instances
    expect(c1).toEqual(c2);
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

  test("works with hash-mode IdRegistry", () => {
    const ids = new IdRegistry("hash");
    const ctx = new MappingContext(ids);
    const id = ctx.ids.getId("Patient", "uuid-abc");
    expect(id).toBeGreaterThan(0);
    expect(ctx.ids.getId("Patient", "uuid-abc")).toBe(id);
  });
});

// ============================================================
// Cross-resource consistency
// ============================================================

describe("Cross-resource ID consistency", () => {
  test("Patient and Condition share same person_id (sequential)", () => {
    const ctx = new MappingContext();
    const personId = ctx.ids.getId("Patient", "abc");
    const condPersonId = ctx.ids.resolveRef({ reference: "Patient/abc" });
    expect(personId).toBe(condPersonId);
  });

  test("Patient and Condition share same person_id (hash)", () => {
    const ctx = new MappingContext(new IdRegistry("hash"));
    const personId = ctx.ids.getId("Patient", "abc");
    const condPersonId = ctx.ids.resolveRef({ reference: "Patient/abc" });
    expect(personId).toBe(condPersonId);
  });

  test("Encounter and Observation share same visit_occurrence_id", () => {
    const ctx = new MappingContext();
    const visitId = ctx.ids.getId("Encounter", "enc-1");
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

  test("hash mode produces same IDs across independent MappingContexts", () => {
    const ctx1 = new MappingContext(new IdRegistry("hash"));
    const ctx2 = new MappingContext(new IdRegistry("hash"));

    const id1 = ctx1.ids.getId("Patient", "abc-uuid");
    const id2 = ctx2.ids.getId("Patient", "abc-uuid");
    expect(id1).toBe(id2);
  });
});
