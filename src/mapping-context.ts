import type { Reference } from "./types/fhir";

/**
 * FNV-1a 64-bit hash.
 *
 * Deterministic, fast, zero-dependency hash producing a 64-bit integer.
 * Uses BigInt internally, returns a positive number safe for OMOP BIGINT.
 *
 * Reference: https://www.ietf.org/archive/id/draft-eastlake-fnv-21.html
 */
export function fnv1a64(input: string): number {
  const FNV_OFFSET_BASIS = 0xcbf29ce484222325n;
  const FNV_PRIME = 0x100000001b3n;
  const MASK_64 = 0xffffffffffffffffn;

  let hash = FNV_OFFSET_BASIS;
  for (let i = 0; i < input.length; i++) {
    hash ^= BigInt(input.charCodeAt(i));
    hash = (hash * FNV_PRIME) & MASK_64;
  }

  // Force positive: mask to 63 bits for signed BIGINT compatibility
  return Number(hash & 0x7fffffffffffffffn);
}

/** Collision entry: two different FHIR IDs mapped to the same hash */
export interface Collision {
  resourceType: string;
  fhirId: string;
  existingFhirId: string;
  hashValue: number;
}

export type IdMode = "sequential" | "hash";

/**
 * IdRegistry assigns stable integer IDs to FHIR resource references.
 *
 * Two modes:
 * - "sequential" (default): assigns 1, 2, 3... in order of first encounter.
 *   Deterministic within a single run but not across runs.
 * - "hash": uses FNV-1a-64 on "ResourceType:fhirId" to produce a
 *   deterministic integer. Same input always yields the same ID, even
 *   across independent ETL runs. Collision detection via reverse map.
 *
 * Usage:
 *   const reg = new IdRegistry("hash");
 *   reg.getId("Patient", "abc-123");  // → deterministic hash
 *   reg.getId("Patient", "abc-123");  // → same hash (idempotent)
 *   reg.getCollisions();              // → [] if no collisions
 */
export class IdRegistry {
  readonly mode: IdMode;
  /** Forward map: resourceType → (fhirId → integer) */
  private maps = new Map<string, Map<string, number>>();
  /** Reverse map for hash mode collision detection: resourceType → (hash → fhirId) */
  private reverseMaps = new Map<string, Map<number, string>>();
  /** Sequential counters per resource type */
  private counters = new Map<string, number>();
  /** Detected collisions */
  private collisions: Collision[] = [];

  constructor(mode: IdMode = "sequential") {
    this.mode = mode;
  }

  /** Get or assign an integer ID for a FHIR resource */
  getId(resourceType: string, fhirId: string): number {
    let map = this.maps.get(resourceType);
    if (!map) {
      map = new Map();
      this.maps.set(resourceType, map);
      this.counters.set(resourceType, 0);
      if (this.mode === "hash") {
        this.reverseMaps.set(resourceType, new Map());
      }
    }

    const existing = map.get(fhirId);
    if (existing !== undefined) return existing;

    let id: number;
    if (this.mode === "hash") {
      id = fnv1a64(`${resourceType}:${fhirId}`);

      // Collision detection via reverse map
      const reverseMap = this.reverseMaps.get(resourceType)!;
      const existingFhirId = reverseMap.get(id);
      if (existingFhirId !== undefined && existingFhirId !== fhirId) {
        this.collisions.push({ resourceType, fhirId, existingFhirId, hashValue: id });
      }
      reverseMap.set(id, fhirId);
    } else {
      const counter = this.counters.get(resourceType)! + 1;
      this.counters.set(resourceType, counter);
      id = counter;
    }

    map.set(fhirId, id);
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

  /** Get all detected hash collisions */
  getCollisions(): Collision[] {
    return [...this.collisions];
  }

  /** Check if any collisions were detected */
  hasCollisions(): boolean {
    return this.collisions.length > 0;
  }
}

/**
 * MappingContext is passed to all mappers to provide shared state.
 * Wraps IdRegistry; can be extended with vocabulary lookups etc.
 */
export class MappingContext {
  readonly ids: IdRegistry;

  constructor(ids?: IdRegistry) {
    this.ids = ids ?? new IdRegistry();
  }
}
