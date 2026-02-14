import type { Reference } from "./types/fhir";

/**
 * IdRegistry assigns stable integer IDs to FHIR resource references.
 *
 * FHIR uses string IDs (often UUIDs), but OMOP requires integer PKs/FKs.
 * The registry maintains a per-resource-type map from FHIR ID → integer,
 * assigning sequential IDs starting from 1 on first encounter.
 *
 * Usage:
 *   const registry = new IdRegistry();
 *   registry.getId("Patient", "abc-123");  // → 1
 *   registry.getId("Patient", "abc-123");  // → 1 (same input → same output)
 *   registry.getId("Patient", "xyz-789");  // → 2
 *   registry.getId("Encounter", "abc-123"); // → 1 (separate namespace)
 */
export class IdRegistry {
  private maps = new Map<string, Map<string, number>>();
  private counters = new Map<string, number>();

  /** Get or assign an integer ID for a FHIR resource */
  getId(resourceType: string, fhirId: string): number {
    let map = this.maps.get(resourceType);
    if (!map) {
      map = new Map();
      this.maps.set(resourceType, map);
      this.counters.set(resourceType, 0);
    }

    let id = map.get(fhirId);
    if (id === undefined) {
      const counter = this.counters.get(resourceType)! + 1;
      this.counters.set(resourceType, counter);
      id = counter;
      map.set(fhirId, id);
    }

    return id;
  }

  /** Resolve a FHIR Reference to an integer ID, or null if no reference */
  resolveRef(ref?: Reference): number | null {
    if (!ref?.reference) return null;
    const parts = ref.reference.split("/");
    if (parts.length < 2) return null;
    const resourceType = parts.slice(0, -1).join("/");
    const fhirId = parts[parts.length - 1];
    return this.getId(resourceType, fhirId);
  }

  /** Get the FHIR ID for an assigned integer ID (reverse lookup) */
  getFhirId(resourceType: string, omopId: number): string | null {
    const map = this.maps.get(resourceType);
    if (!map) return null;
    for (const [fhirId, id] of map) {
      if (id === omopId) return fhirId;
    }
    return null;
  }

  /** Get all mappings for a resource type */
  getMappings(resourceType: string): Map<string, number> {
    return this.maps.get(resourceType) ?? new Map();
  }
}

/**
 * MappingContext is passed to all mappers to provide shared state.
 * Currently wraps IdRegistry; can be extended with vocabulary lookups etc.
 */
export class MappingContext {
  readonly ids: IdRegistry;

  constructor(ids?: IdRegistry) {
    this.ids = ids ?? new IdRegistry();
  }
}
