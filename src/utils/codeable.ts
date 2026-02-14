import type { CodeableConcept, Coding } from "../types/fhir";

/** FHIR system URI → OMOP vocabulary_id */
const SYSTEM_TO_VOCAB: Record<string, string> = {
  "http://snomed.info/sct": "SNOMED",
  "http://loinc.org": "LOINC",
  "http://www.nlm.nih.gov/research/umls/rxnorm": "RxNorm",
  "http://hl7.org/fhir/sid/icd-10-cm": "ICD10CM",
  "http://hl7.org/fhir/sid/icd-10": "ICD10",
  "http://www.ama-assn.org/go/cpt": "CPT4",
  "http://hl7.org/fhir/sid/ndc": "NDC",
  "http://hl7.org/fhir/sid/cvx": "CVX",
};

/** Priority order for code system selection */
const VOCAB_PRIORITY = ["SNOMED", "RxNorm", "LOINC", "ICD10CM", "ICD10", "CPT4", "NDC", "CVX"];

/** Select the best coding from a CodeableConcept based on vocabulary priority */
export function selectBestCoding(concept?: CodeableConcept): Coding | null {
  if (!concept?.coding?.length) return null;
  if (concept.coding.length === 1) return concept.coding[0];

  let best: Coding | null = null;
  let bestPriority = Infinity;

  for (const coding of concept.coding) {
    const vocab = coding.system ? SYSTEM_TO_VOCAB[coding.system] : undefined;
    const priority = vocab ? VOCAB_PRIORITY.indexOf(vocab) : Infinity;
    if (priority < bestPriority) {
      bestPriority = priority;
      best = coding;
    }
  }

  return best ?? concept.coding[0];
}

/** Get the source value string from a CodeableConcept (first code or text) */
export function getSourceValue(concept?: CodeableConcept): string | null {
  if (!concept) return null;
  const coding = concept.coding?.[0];
  if (coding?.code) return coding.code;
  return concept.text ?? null;
}

/** Map a FHIR system URI to OMOP vocabulary_id */
export function systemToVocab(system?: string): string | null {
  if (!system) return null;
  return SYSTEM_TO_VOCAB[system] ?? null;
}
