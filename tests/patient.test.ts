import { test, expect, describe } from "bun:test";
import { mapPatient, selectIdentifier, selectAddress } from "../src/mapper/patient";
import type { Patient } from "../src/types/fhir";

// --- Helpers ---

function makePatient(overrides: Partial<Patient> = {}): Patient {
  return {
    resourceType: "Patient",
    id: "test-patient-1",
    gender: "male",
    birthDate: "1990-03-15",
    ...overrides,
  };
}

// ============================================================
// Gender mapping
// ============================================================

describe("Patient.gender → gender_concept_id", () => {
  test("male → 8507", () => {
    const result = mapPatient(makePatient({ gender: "male" }));
    expect(result.person!.gender_concept_id).toBe(8507);
    expect(result.person!.gender_source_value).toBe("male");
  });

  test("female → 8532", () => {
    const result = mapPatient(makePatient({ gender: "female" }));
    expect(result.person!.gender_concept_id).toBe(8532);
    expect(result.person!.gender_source_value).toBe("female");
  });

  test("other → 8521 (not 0)", () => {
    const result = mapPatient(makePatient({ gender: "other" }));
    expect(result.person!.gender_concept_id).toBe(8521);
    expect(result.person!.gender_source_value).toBe("other");
  });

  test("unknown → 8551 (not 0)", () => {
    const result = mapPatient(makePatient({ gender: "unknown" }));
    expect(result.person!.gender_concept_id).toBe(8551);
    expect(result.person!.gender_source_value).toBe("unknown");
  });

  test("missing gender → concept 0", () => {
    const result = mapPatient(makePatient({ gender: undefined }));
    expect(result.person!.gender_concept_id).toBe(0);
    expect(result.person!.gender_source_value).toBeNull();
  });

  test("gender_source_concept_id is always 0 (no OMOP vocab for FHIR gender)", () => {
    const result = mapPatient(makePatient({ gender: "male" }));
    expect(result.person!.gender_source_concept_id).toBe(0);
  });
});

// ============================================================
// BirthDate mapping
// ============================================================

describe("Patient.birthDate → year/month/day/datetime", () => {
  test("full date 1990-03-15 → year=1990, month=3, day=15", () => {
    const result = mapPatient(makePatient({ birthDate: "1990-03-15" }));
    const p = result.person!;
    expect(p.year_of_birth).toBe(1990);
    expect(p.month_of_birth).toBe(3);
    expect(p.day_of_birth).toBe(15);
    expect(p.birth_datetime).toBe("1990-03-15T00:00:00");
  });

  test("partial date YYYY-MM → month set, day null", () => {
    const result = mapPatient(makePatient({ birthDate: "1990-03" }));
    const p = result.person!;
    expect(p.year_of_birth).toBe(1990);
    expect(p.month_of_birth).toBe(3);
    expect(p.day_of_birth).toBeNull();
    expect(p.birth_datetime).toBe("1990-03-01T00:00:00");
  });

  test("year-only YYYY → month and day null, datetime padded", () => {
    const result = mapPatient(makePatient({ birthDate: "1990" }));
    const p = result.person!;
    expect(p.year_of_birth).toBe(1990);
    expect(p.month_of_birth).toBeNull();
    expect(p.day_of_birth).toBeNull();
    expect(p.birth_datetime).toBe("1990-01-01T00:00:00");
  });

  test("missing birthDate → no PERSON record (returns null)", () => {
    const result = mapPatient(makePatient({ birthDate: undefined }));
    expect(result.person).toBeNull();
    expect(result.location).toBeNull();
    expect(result.death).toBeNull();
  });
});

// ============================================================
// Identifier mapping
// ============================================================

describe("Patient.identifier → person_source_value", () => {
  test("SSN has highest priority", () => {
    const patient = makePatient({
      identifier: [
        { system: "http://hospital.org/mrn", value: "MRN-123", type: { coding: [{ code: "MR" }] } },
        { system: "http://hl7.org/fhir/sid/us-ssn", value: "999-99-9999" },
      ],
    });
    const result = selectIdentifier(patient);
    expect(result).toBe("http://hl7.org/fhir/sid/us-ssn|999-99-9999");
  });

  test("MRN is second priority (when no SSN)", () => {
    const patient = makePatient({
      identifier: [
        { system: "http://other.org", value: "OTHER-1" },
        { system: "http://hospital.org/mrn", value: "MRN-123", type: { coding: [{ code: "MR" }] } },
      ],
    });
    const result = selectIdentifier(patient);
    expect(result).toBe("http://hospital.org/mrn|MRN-123");
  });

  test("first identifier used when no SSN or MRN", () => {
    const patient = makePatient({
      identifier: [
        { system: "http://other.org", value: "OTHER-1" },
        { system: "http://another.org", value: "OTHER-2" },
      ],
    });
    const result = selectIdentifier(patient);
    expect(result).toBe("http://other.org|OTHER-1");
  });

  test("Patient.id used as fallback when no identifiers", () => {
    const patient = makePatient({ id: "patient-uuid-123", identifier: undefined });
    const result = selectIdentifier(patient);
    expect(result).toBe("patient-uuid-123");
  });

  test("format is system|value", () => {
    const patient = makePatient({
      identifier: [{ system: "http://hospital.org/mrn", value: "12345" }],
    });
    const result = selectIdentifier(patient);
    expect(result).toBe("http://hospital.org/mrn|12345");
  });

  test("identifier without system uses just value", () => {
    const patient = makePatient({
      identifier: [{ value: "12345" }],
    });
    const result = selectIdentifier(patient);
    expect(result).toBe("12345");
  });

  test("long identifiers truncated to 50 chars", () => {
    const patient = makePatient({
      identifier: [{ system: "http://very-long-system-url.example.org/identifiers", value: "12345" }],
    });
    const result = selectIdentifier(patient);
    expect(result.length).toBeLessThanOrEqual(50);
  });
});

// ============================================================
// Address → LOCATION mapping
// ============================================================

describe("Patient.address → LOCATION", () => {
  test("home address selected over other types", () => {
    const patient = makePatient({
      address: [
        { use: "work", city: "WorkCity" },
        { use: "home", city: "HomeCity" },
      ],
    });
    const addr = selectAddress(patient);
    expect(addr!.city).toBe("HomeCity");
  });

  test("last home address selected (most recent)", () => {
    const patient = makePatient({
      address: [
        { use: "home", city: "OldHome" },
        { use: "home", city: "NewHome" },
      ],
    });
    const addr = selectAddress(patient);
    expect(addr!.city).toBe("NewHome");
  });

  test("first non-old address used when no home address", () => {
    const patient = makePatient({
      address: [
        { use: "old", city: "OldCity" },
        { use: "work", city: "WorkCity" },
      ],
    });
    const addr = selectAddress(patient);
    expect(addr!.city).toBe("WorkCity");
  });

  test("no addresses → location is null", () => {
    const result = mapPatient(makePatient({ address: undefined }));
    expect(result.location).toBeNull();
  });

  test("address fields map correctly to LOCATION", () => {
    const patient = makePatient({
      address: [
        {
          use: "home",
          line: ["123 Main St", "Apt 4B"],
          city: "Springfield",
          state: "IL",
          postalCode: "62701",
          district: "Sangamon",
          country: "US",
        },
      ],
    });
    const result = mapPatient(patient);
    const loc = result.location!;
    expect(loc.address_1).toBe("123 Main St");
    expect(loc.address_2).toBe("Apt 4B");
    expect(loc.city).toBe("Springfield");
    expect(loc.state).toBe("IL");
    expect(loc.zip).toBe("62701");
    expect(loc.county).toBe("Sangamon");
    expect(loc.country_source_value).toBe("US");
  });

  test("state truncated to 2 chars", () => {
    const patient = makePatient({
      address: [{ use: "home", state: "Illinois" }],
    });
    const result = mapPatient(patient);
    expect(result.location!.state).toBe("Il");
  });

  test("location_source_value contains full address as string", () => {
    const patient = makePatient({
      address: [{ use: "home", line: ["123 Main St"], city: "Springfield", state: "IL" }],
    });
    const result = mapPatient(patient);
    expect(result.location!.location_source_value).toContain("123 Main St");
    expect(result.location!.location_source_value).toContain("Springfield");
  });
});

// ============================================================
// Death mapping
// ============================================================

describe("Patient.deceased → DEATH", () => {
  test("deceasedDateTime creates death record", () => {
    const result = mapPatient(makePatient({ deceasedDateTime: "2023-06-15T10:30:00Z" }));
    const death = result.death!;
    expect(death).not.toBeNull();
    expect(death.death_date).toBe("2023-06-15");
    expect(death.death_datetime).toBe("2023-06-15T10:30:00Z");
    expect(death.death_type_concept_id).toBe(32817); // EHR
  });

  test("no deceased info → no death record", () => {
    const result = mapPatient(makePatient());
    expect(result.death).toBeNull();
  });

  test("deceasedBoolean=true without datetime → no death record (no date available)", () => {
    const result = mapPatient(makePatient({ deceasedBoolean: true }));
    expect(result.death).toBeNull();
  });
});

// ============================================================
// Race/Ethnicity via US Core extensions
// ============================================================

describe("US Core Race extension → race_concept_id", () => {
  test("White → 8527", () => {
    const patient = makePatient({
      extension: [
        {
          url: "http://hl7.org/fhir/us/core/StructureDefinition/us-core-race",
          extension: [
            { url: "ombCategory", valueCoding: { system: "urn:oid:2.16.840.1.113883.6.238", code: "2106-3", display: "White" } },
          ],
        },
      ],
    });
    const result = mapPatient(patient);
    expect(result.person!.race_concept_id).toBe(8527);
    expect(result.person!.race_source_value).toBe("White");
  });

  test("Black → 8516", () => {
    const patient = makePatient({
      extension: [
        {
          url: "http://hl7.org/fhir/us/core/StructureDefinition/us-core-race",
          extension: [
            { url: "ombCategory", valueCoding: { code: "2054-5", display: "Black or African American" } },
          ],
        },
      ],
    });
    const result = mapPatient(patient);
    expect(result.person!.race_concept_id).toBe(8516);
  });

  test("no race extension → 0", () => {
    const result = mapPatient(makePatient());
    expect(result.person!.race_concept_id).toBe(0);
    expect(result.person!.race_source_value).toBeNull();
  });
});

describe("US Core Ethnicity extension → ethnicity_concept_id", () => {
  test("Hispanic → 38003563", () => {
    const patient = makePatient({
      extension: [
        {
          url: "http://hl7.org/fhir/us/core/StructureDefinition/us-core-ethnicity",
          extension: [
            { url: "ombCategory", valueCoding: { code: "2135-2", display: "Hispanic or Latino" } },
          ],
        },
      ],
    });
    const result = mapPatient(patient);
    expect(result.person!.ethnicity_concept_id).toBe(38003563);
    expect(result.person!.ethnicity_source_value).toBe("Hispanic or Latino");
  });

  test("Not Hispanic → 38003564", () => {
    const patient = makePatient({
      extension: [
        {
          url: "http://hl7.org/fhir/us/core/StructureDefinition/us-core-ethnicity",
          extension: [
            { url: "ombCategory", valueCoding: { code: "2186-5", display: "Not Hispanic or Latino" } },
          ],
        },
      ],
    });
    const result = mapPatient(patient);
    expect(result.person!.ethnicity_concept_id).toBe(38003564);
  });

  test("no ethnicity extension → 0", () => {
    const result = mapPatient(makePatient());
    expect(result.person!.ethnicity_concept_id).toBe(0);
  });
});

// ============================================================
// References
// ============================================================

describe("Patient references → provider_id, care_site_id", () => {
  test("generalPractitioner maps to provider_id", () => {
    const patient = makePatient({
      generalPractitioner: [{ reference: "Practitioner/42" }],
    });
    const result = mapPatient(patient);
    expect(result.person!.provider_id).toBe(42);
  });

  test("managingOrganization maps to care_site_id", () => {
    const patient = makePatient({
      managingOrganization: { reference: "Organization/7" },
    });
    const result = mapPatient(patient);
    expect(result.person!.care_site_id).toBe(7);
  });

  test("no references → null", () => {
    const result = mapPatient(makePatient());
    expect(result.person!.provider_id).toBeNull();
    expect(result.person!.care_site_id).toBeNull();
  });
});

// ============================================================
// Full Patient integration test
// ============================================================

describe("Full Patient mapping", () => {
  test("complete patient produces person + location + death", () => {
    const patient: Patient = {
      resourceType: "Patient",
      id: "full-patient-1",
      identifier: [
        { system: "http://hl7.org/fhir/sid/us-ssn", value: "123-45-6789" },
        { system: "http://hospital.org/mrn", value: "MRN001", type: { coding: [{ code: "MR" }] } },
      ],
      gender: "female",
      birthDate: "1985-07-22",
      deceasedDateTime: "2023-01-15T14:30:00Z",
      address: [
        { use: "home", line: ["456 Oak Ave"], city: "Portland", state: "OR", postalCode: "97201", country: "US" },
      ],
      generalPractitioner: [{ reference: "Practitioner/100" }],
      managingOrganization: { reference: "Organization/50" },
      extension: [
        {
          url: "http://hl7.org/fhir/us/core/StructureDefinition/us-core-race",
          extension: [{ url: "ombCategory", valueCoding: { code: "2106-3", display: "White" } }],
        },
        {
          url: "http://hl7.org/fhir/us/core/StructureDefinition/us-core-ethnicity",
          extension: [{ url: "ombCategory", valueCoding: { code: "2186-5", display: "Not Hispanic or Latino" } }],
        },
      ],
    };

    const result = mapPatient(patient);

    // Person
    expect(result.person).not.toBeNull();
    expect(result.person!.gender_concept_id).toBe(8532);
    expect(result.person!.year_of_birth).toBe(1985);
    expect(result.person!.month_of_birth).toBe(7);
    expect(result.person!.day_of_birth).toBe(22);
    expect(result.person!.person_source_value).toBe("http://hl7.org/fhir/sid/us-ssn|123-45-6789");
    expect(result.person!.race_concept_id).toBe(8527);
    expect(result.person!.ethnicity_concept_id).toBe(38003564);
    expect(result.person!.provider_id).toBe(100);
    expect(result.person!.care_site_id).toBe(50);

    // Location
    expect(result.location).not.toBeNull();
    expect(result.location!.city).toBe("Portland");
    expect(result.location!.state).toBe("OR");

    // Death
    expect(result.death).not.toBeNull();
    expect(result.death!.death_date).toBe("2023-01-15");
  });

  test("minimal patient (only birthDate) produces person with defaults", () => {
    const patient: Patient = {
      resourceType: "Patient",
      birthDate: "2000",
    };

    const result = mapPatient(patient);
    expect(result.person).not.toBeNull();
    expect(result.person!.gender_concept_id).toBe(0);
    expect(result.person!.year_of_birth).toBe(2000);
    expect(result.person!.month_of_birth).toBeNull();
    expect(result.person!.person_source_value).toBe("");
    expect(result.person!.race_concept_id).toBe(0);
    expect(result.person!.ethnicity_concept_id).toBe(0);
    expect(result.location).toBeNull();
    expect(result.death).toBeNull();
  });
});
