// FHIR OMOP Profile types — defines constraints for OMOP-convertible FHIR resources

/** Severity of a validation issue */
export type IssueSeverity = "error" | "warning";

/** A single validation issue found during profile checking */
export interface ValidationIssue {
  severity: IssueSeverity;
  /** FHIRPath-like path to the problematic element */
  path: string;
  /** Human-readable description */
  message: string;
  /** Machine-readable rule identifier */
  rule: string;
}

/** Result of validating a resource against an OMOP profile */
export interface ValidationResult {
  /** Whether the resource conforms to the profile (no errors, warnings OK) */
  valid: boolean;
  /** Resource type that was validated */
  resourceType: string;
  /** All issues found */
  issues: ValidationIssue[];
}

/** A constraint rule within a profile */
export interface ProfileRule {
  /** Unique rule identifier (e.g., "patient-birthdate-required") */
  rule: string;
  severity: IssueSeverity;
  /** FHIRPath-like path this rule applies to */
  path: string;
  /** Human-readable description of what the rule checks */
  description: string;
  /** The check function — returns null if valid, or an error message if invalid */
  check: (resource: any) => string | null;
}

/** An OMOP profile for a FHIR resource type */
export interface OmopProfile {
  /** FHIR resource type this profile applies to */
  resourceType: string;
  /** Profile name */
  name: string;
  /** Human-readable description */
  description: string;
  /** Constraint rules */
  rules: ProfileRule[];
}
