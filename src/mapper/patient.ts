import type { Patient, Address, Identifier } from "../types/fhir";
import type { Person, Location, Death, PatientMappingResult } from "../types/omop";
import { parseFhirDate, toBirthDatetime, toDate } from "../utils/date";
import { resolveReferenceAsNumber } from "../utils/reference";

/** FHIR gender → OMOP gender_concept_id */
const GENDER_CONCEPT: Record<string, number> = {
  male: 8507,
  female: 8532,
  other: 8521,
  unknown: 8551,
};

/** EHR type concept for death records */
const DEATH_TYPE_EHR = 32817;

/** Map a FHIR Patient to OMOP PERSON + LOCATION + DEATH */
export function mapPatient(patient: Patient): PatientMappingResult {
  // year_of_birth is required — skip if no birthDate
  if (!patient.birthDate) {
    return { person: null, location: null, death: null };
  }

  const { year, month, day } = parseFhirDate(patient.birthDate);

  const person: Person = {
    gender_concept_id: patient.gender ? (GENDER_CONCEPT[patient.gender] ?? 0) : 0,
    year_of_birth: year,
    month_of_birth: month,
    day_of_birth: day,
    birth_datetime: toBirthDatetime(patient.birthDate),
    race_concept_id: mapRaceConcept(patient),
    ethnicity_concept_id: mapEthnicityConcept(patient),
    person_source_value: selectIdentifier(patient),
    gender_source_value: patient.gender ?? null,
    gender_source_concept_id: 0,
    race_source_value: getRaceSourceValue(patient),
    race_source_concept_id: 0,
    ethnicity_source_value: getEthnicitySourceValue(patient),
    ethnicity_source_concept_id: 0,
    provider_id: resolveReferenceAsNumber(patient.generalPractitioner?.[0]),
    care_site_id: resolveReferenceAsNumber(patient.managingOrganization),
  };

  const location = mapLocation(patient);
  const death = mapDeath(patient);

  return { person, location, death };
}

/** Select the best identifier for person_source_value */
export function selectIdentifier(patient: Patient): string {
  const identifiers = patient.identifier;
  if (!identifiers?.length) {
    return patient.id ?? "";
  }

  // Priority 1: SSN
  const ssn = identifiers.find(
    (id) => id.system === "http://hl7.org/fhir/sid/us-ssn"
  );
  if (ssn) return formatIdentifier(ssn);

  // Priority 2: MRN (type.coding.code = "MR")
  const mrn = identifiers.find((id) =>
    id.type?.coding?.some((c) => c.code === "MR")
  );
  if (mrn) return formatIdentifier(mrn);

  // Priority 3: first identifier
  return formatIdentifier(identifiers[0]);
}

function formatIdentifier(id: Identifier): string {
  if (id.system && id.value) {
    const formatted = `${id.system}|${id.value}`;
    // Truncate to varchar(50) limit
    if (formatted.length > 50) {
      return formatted.substring(0, 50);
    }
    return formatted;
  }
  return id.value ?? "";
}

/** Select the address for LOCATION mapping */
export function selectAddress(patient: Patient): Address | null {
  const addresses = patient.address;
  if (!addresses?.length) return null;

  // Find home addresses (excluding "old")
  const homeAddresses = addresses.filter(
    (a) => a.use === "home"
  );
  if (homeAddresses.length > 0) {
    return homeAddresses[homeAddresses.length - 1]; // last = most recent
  }

  // Fallback: first address (skip "old" if possible)
  const nonOld = addresses.filter((a) => a.use !== "old");
  return nonOld.length > 0 ? nonOld[0] : addresses[0];
}

function mapLocation(patient: Patient): Location | null {
  const addr = selectAddress(patient);
  if (!addr) return null;

  const locationParts = [
    addr.line?.join(", "),
    addr.city,
    addr.state,
    addr.postalCode,
    addr.country,
  ].filter(Boolean);

  return {
    address_1: addr.line?.[0]?.substring(0, 50) ?? null,
    address_2: addr.line?.[1]?.substring(0, 50) ?? null,
    city: addr.city ?? null,
    state: addr.state?.substring(0, 2) ?? null,
    zip: addr.postalCode?.substring(0, 9) ?? null,
    county: addr.district?.substring(0, 20) ?? null,
    country_concept_id: 0,
    country_source_value: addr.country ?? null,
    location_source_value: locationParts.join(", ").substring(0, 50) || null,
  };
}

function mapDeath(patient: Patient): Death | null {
  if (!patient.deceasedDateTime) {
    if (patient.deceasedBoolean === true) {
      // deceased but no datetime — we know they died but not when
      // Still need death_date (required), so we can't create a proper record
      return null;
    }
    return null;
  }

  return {
    person_id: 0, // to be set by caller
    death_date: toDate(patient.deceasedDateTime),
    death_datetime: patient.deceasedDateTime,
    death_type_concept_id: DEATH_TYPE_EHR,
    cause_concept_id: 0,
    cause_source_value: null,
    cause_source_concept_id: 0,
  };
}

// US Core Race extension URL
const RACE_EXT_URL = "http://hl7.org/fhir/us/core/StructureDefinition/us-core-race";
const ETHNICITY_EXT_URL = "http://hl7.org/fhir/us/core/StructureDefinition/us-core-ethnicity";
const OMB_CATEGORY_URL = "ombCategory";

/** OMB race category code → OMOP concept_id */
const RACE_CONCEPT: Record<string, number> = {
  "1002-5": 8657,  // American Indian or Alaska Native
  "2028-9": 8515,  // Asian
  "2054-5": 8516,  // Black or African American
  "2076-8": 8557,  // Native Hawaiian or Other Pacific Islander
  "2106-3": 8527,  // White
};

/** OMB ethnicity category code → OMOP concept_id */
const ETHNICITY_CONCEPT: Record<string, number> = {
  "2135-2": 38003563, // Hispanic or Latino
  "2186-5": 38003564, // Not Hispanic or Latino
};

function findExtension(patient: Patient, url: string) {
  return patient.extension?.find((e) => e.url === url);
}

function getOmbCategoryCoding(ext: { extension?: { url: string; valueCoding?: { code?: string; display?: string } }[] } | undefined) {
  if (!ext?.extension) return null;
  const omb = ext.extension.find((e) => e.url === OMB_CATEGORY_URL);
  return omb?.valueCoding ?? null;
}

function mapRaceConcept(patient: Patient): number {
  const ext = findExtension(patient, RACE_EXT_URL);
  const coding = getOmbCategoryCoding(ext);
  if (coding?.code && RACE_CONCEPT[coding.code]) {
    return RACE_CONCEPT[coding.code];
  }
  return 0;
}

function mapEthnicityConcept(patient: Patient): number {
  const ext = findExtension(patient, ETHNICITY_EXT_URL);
  const coding = getOmbCategoryCoding(ext);
  if (coding?.code && ETHNICITY_CONCEPT[coding.code]) {
    return ETHNICITY_CONCEPT[coding.code];
  }
  return 0;
}

function getRaceSourceValue(patient: Patient): string | null {
  const ext = findExtension(patient, RACE_EXT_URL);
  const coding = getOmbCategoryCoding(ext);
  return coding?.display ?? coding?.code ?? null;
}

function getEthnicitySourceValue(patient: Patient): string | null {
  const ext = findExtension(patient, ETHNICITY_EXT_URL);
  const coding = getOmbCategoryCoding(ext);
  return coding?.display ?? coding?.code ?? null;
}
