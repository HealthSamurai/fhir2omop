// FHIR R4 type definitions (subset for mapping)

export interface Coding {
  system?: string;
  code?: string;
  display?: string;
  version?: string;
}

export interface CodeableConcept {
  coding?: Coding[];
  text?: string;
}

export interface Identifier {
  system?: string;
  value?: string;
  type?: CodeableConcept;
  use?: "usual" | "official" | "temp" | "secondary" | "old";
}

export interface Period {
  start?: string;
  end?: string;
}

export interface Quantity {
  value?: number;
  unit?: string;
  system?: string;
  code?: string;
}

export interface Range {
  low?: Quantity;
  high?: Quantity;
}

export interface Reference {
  reference?: string;
  display?: string;
}

export interface Address {
  use?: "home" | "work" | "temp" | "old" | "billing";
  line?: string[];
  city?: string;
  state?: string;
  postalCode?: string;
  district?: string;
  country?: string;
}

export interface Extension {
  url: string;
  valueString?: string;
  valueCoding?: Coding;
  valueCode?: string;
  extension?: Extension[];
}

export interface HumanName {
  use?: string;
  family?: string;
  given?: string[];
  prefix?: string[];
  suffix?: string[];
}

export interface Patient {
  resourceType: "Patient";
  id?: string;
  identifier?: Identifier[];
  name?: HumanName[];
  gender?: "male" | "female" | "other" | "unknown";
  birthDate?: string;
  deceasedBoolean?: boolean;
  deceasedDateTime?: string;
  address?: Address[];
  extension?: Extension[];
  generalPractitioner?: Reference[];
  managingOrganization?: Reference;
  active?: boolean;
}

export interface Encounter {
  resourceType: "Encounter";
  id?: string;
  status: "planned" | "arrived" | "triaged" | "in-progress" | "onleave" | "finished" | "cancelled" | "entered-in-error" | "unknown";
  class: Coding;
  type?: CodeableConcept[];
  subject?: Reference;
  participant?: { individual?: Reference }[];
  period?: Period;
  serviceProvider?: Reference;
  hospitalization?: {
    admitSource?: CodeableConcept;
    dischargeDisposition?: CodeableConcept;
  };
}

export interface Condition {
  resourceType: "Condition";
  id?: string;
  clinicalStatus?: CodeableConcept;
  verificationStatus?: CodeableConcept;
  category?: CodeableConcept[];
  code?: CodeableConcept;
  subject: Reference;
  encounter?: Reference;
  onsetDateTime?: string;
  abatementDateTime?: string;
  abatementString?: string;
  asserter?: Reference;
}

export interface Observation {
  resourceType: "Observation";
  id?: string;
  status: "registered" | "preliminary" | "final" | "amended" | "corrected" | "cancelled" | "entered-in-error" | "unknown";
  category?: CodeableConcept[];
  code: CodeableConcept;
  subject?: Reference;
  encounter?: Reference;
  effectiveDateTime?: string;
  performer?: Reference[];
  valueQuantity?: Quantity;
  valueCodeableConcept?: CodeableConcept;
  valueString?: string;
  referenceRange?: Range[];
}

export interface DosageDoseAndRate {
  doseQuantity?: Quantity;
}

export interface Dosage {
  route?: CodeableConcept;
  doseAndRate?: DosageDoseAndRate[];
}

export interface MedicationRequest {
  resourceType: "MedicationRequest";
  id?: string;
  status: "active" | "on-hold" | "cancelled" | "completed" | "entered-in-error" | "stopped" | "draft" | "unknown";
  intent: string;
  medicationCodeableConcept?: CodeableConcept;
  medicationReference?: Reference;
  subject: Reference;
  encounter?: Reference;
  authoredOn?: string;
  requester?: Reference;
  dosageInstruction?: Dosage[];
  dispenseRequest?: {
    validityPeriod?: Period;
    numberOfRepeatsAllowed?: number;
    quantity?: Quantity;
  };
}
