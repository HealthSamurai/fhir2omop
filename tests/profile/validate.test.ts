import { test, expect, describe } from "bun:test";
import { validate } from "../../src/profile/validate";
import { getProfile, profiles } from "../../src/profile/index";
import { validateResource } from "../../src/profile/validate-and-map";
import type { OmopProfile } from "../../src/profile/types";

describe("validate", () => {
  test("returns valid=true when all rules pass", () => {
    const profile: OmopProfile = {
      resourceType: "Test",
      name: "TestProfile",
      description: "Test",
      rules: [
        {
          rule: "test-ok",
          severity: "error",
          path: "Test.field",
          description: "always passes",
          check: () => null,
        },
      ],
    };
    const result = validate({}, profile);
    expect(result.valid).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  test("returns valid=false when an error rule fails", () => {
    const profile: OmopProfile = {
      resourceType: "Test",
      name: "TestProfile",
      description: "Test",
      rules: [
        {
          rule: "test-fail",
          severity: "error",
          path: "Test.field",
          description: "always fails",
          check: () => "something is wrong",
        },
      ],
    };
    const result = validate({}, profile);
    expect(result.valid).toBe(false);
    expect(result.issues).toHaveLength(1);
    expect(result.issues[0].severity).toBe("error");
    expect(result.issues[0].message).toBe("something is wrong");
    expect(result.issues[0].rule).toBe("test-fail");
  });

  test("returns valid=true when only warnings are present", () => {
    const profile: OmopProfile = {
      resourceType: "Test",
      name: "TestProfile",
      description: "Test",
      rules: [
        {
          rule: "test-warn",
          severity: "warning",
          path: "Test.field",
          description: "always warns",
          check: () => "heads up",
        },
      ],
    };
    const result = validate({}, profile);
    expect(result.valid).toBe(true);
    expect(result.issues).toHaveLength(1);
    expect(result.issues[0].severity).toBe("warning");
  });

  test("collects multiple issues from multiple rules", () => {
    const profile: OmopProfile = {
      resourceType: "Test",
      name: "TestProfile",
      description: "Test",
      rules: [
        { rule: "r1", severity: "error", path: "a", description: "", check: () => "err1" },
        { rule: "r2", severity: "warning", path: "b", description: "", check: () => "warn1" },
        { rule: "r3", severity: "error", path: "c", description: "", check: () => null },
      ],
    };
    const result = validate({}, profile);
    expect(result.valid).toBe(false);
    expect(result.issues).toHaveLength(2);
  });
});

describe("getProfile", () => {
  test("returns profile for known resource types", () => {
    expect(getProfile("Patient")).toBeDefined();
    expect(getProfile("Encounter")).toBeDefined();
    expect(getProfile("Condition")).toBeDefined();
    expect(getProfile("Observation")).toBeDefined();
    expect(getProfile("MedicationRequest")).toBeDefined();
  });

  test("returns null for unknown resource types", () => {
    expect(getProfile("Procedure")).toBeNull();
    expect(getProfile("Unknown")).toBeNull();
  });
});

describe("validateResource", () => {
  test("returns error for unknown resource type", () => {
    const result = validateResource({ resourceType: "CarePlan" });
    expect(result.valid).toBe(false);
    expect(result.issues[0].rule).toBe("profile-exists");
  });

  test("validates known resource types", () => {
    const result = validateResource({
      resourceType: "Patient",
      birthDate: "1990-01-01",
      gender: "male",
    });
    expect(result.valid).toBe(true);
    expect(result.resourceType).toBe("Patient");
  });
});

describe("profiles registry", () => {
  test("has 5 profiles", () => {
    expect(Object.keys(profiles)).toHaveLength(5);
  });

  test("each profile has rules", () => {
    for (const [type, profile] of Object.entries(profiles)) {
      expect(profile.resourceType).toBe(type);
      expect(profile.rules.length).toBeGreaterThan(0);
      expect(profile.name).toBeTruthy();
      expect(profile.description).toBeTruthy();
    }
  });

  test("all rules have unique identifiers within a profile", () => {
    for (const profile of Object.values(profiles)) {
      const ruleIds = profile.rules.map((r) => r.rule);
      expect(new Set(ruleIds).size).toBe(ruleIds.length);
    }
  });
});
