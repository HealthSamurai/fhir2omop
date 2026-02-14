import type { Reference } from "../types/fhir";

/** Extract resource ID from a FHIR reference string like "Patient/123" */
export function resolveReference(ref?: Reference): string | null {
  if (!ref?.reference) return null;
  const parts = ref.reference.split("/");
  return parts.length >= 2 ? parts[parts.length - 1] : ref.reference;
}

/** Extract numeric ID from a reference, returns null if not a number */
export function resolveReferenceAsNumber(ref?: Reference): number | null {
  const id = resolveReference(ref);
  if (id === null) return null;
  const num = parseInt(id, 10);
  return isNaN(num) ? null : num;
}
