import type { OmopProfile, ValidationResult } from "./types";

/** Validate a FHIR resource against an OMOP profile */
export function validate(resource: any, profile: OmopProfile): ValidationResult {
  const issues = profile.rules
    .map((rule) => {
      const message = rule.check(resource);
      if (message === null) return null;
      return {
        severity: rule.severity,
        path: rule.path,
        message,
        rule: rule.rule,
      };
    })
    .filter((issue) => issue !== null);

  return {
    valid: issues.every((i) => i.severity !== "error"),
    resourceType: profile.resourceType,
    issues,
  };
}
