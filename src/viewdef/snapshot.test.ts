// Snapshot tests for viewdef.run using the REAL mapspec/views/*.view.json
// against a handful of canonical FHIR fixtures. Catches regressions in
// FHIRPath evaluation or view-shape changes that the synthetic unit tests
// in run.test.ts wouldn't notice.

import { test, expect } from "bun:test";
import run from "./run";
import normalize from "./normalize";

const ctx = {} as Context;

async function loadView(stem: string) {
    const vd = JSON.parse(await Bun.file(`mapspec/views/${stem}.view.json`).text());
    return normalize(ctx, { viewDefinition: vd });
}

const patient = {
    resourceType: "Patient",
    id: "pat-1",
    gender: "female",
    birthDate: "1980-03-14",
    name: [{ family: "Doe", given: ["Jane"] }],
    address: [{ city: "Boston", state: "MA", postalCode: "02118", country: "US" }],
    extension: [
        {
            url: "http://hl7.org/fhir/us/core/StructureDefinition/us-core-race",
            extension: [
                { url: "ombCategory", valueCoding: { code: "2106-3", display: "White" } },
                { url: "text", valueString: "White" },
            ],
        },
        {
            url: "http://hl7.org/fhir/us/core/StructureDefinition/us-core-ethnicity",
            extension: [
                { url: "ombCategory", valueCoding: { code: "2186-5", display: "Not Hispanic or Latino" } },
                { url: "text", valueString: "Not Hispanic or Latino" },
            ],
        },
        {
            url: "http://hl7.org/fhir/us/core/StructureDefinition/us-core-birthsex",
            valueCode: "F",
        },
    ],
};

const bpObservation = {
    resourceType: "Observation",
    id: "obs-bp-1",
    status: "final",
    subject:    { reference: "Patient/pat-1" },
    encounter:  { reference: "Encounter/enc-1" },
    effectiveDateTime: "2024-04-10T08:30:00Z",
    code: { coding: [{ system: "http://loinc.org", code: "85354-9", display: "Blood pressure panel" }] },
    component: [
        {
            code:           { coding: [{ system: "http://loinc.org", code: "8480-6", display: "Systolic BP" }] },
            valueQuantity:  { value: 124, unit: "mmHg", system: "http://unitsofmeasure.org", code: "mm[Hg]" },
        },
        {
            code:           { coding: [{ system: "http://loinc.org", code: "8462-4", display: "Diastolic BP" }] },
            valueQuantity:  { value: 78,  unit: "mmHg", system: "http://unitsofmeasure.org", code: "mm[Hg]" },
        },
    ],
};

const condition = {
    resourceType: "Condition",
    id: "cond-1",
    subject:    { reference: "Patient/pat-1" },
    encounter:  { reference: "Encounter/enc-1" },
    clinicalStatus:     { coding: [{ system: "http://terminology.hl7.org/CodeSystem/condition-clinical",     code: "active" }] },
    verificationStatus: { coding: [{ system: "http://terminology.hl7.org/CodeSystem/condition-ver-status",   code: "confirmed" }] },
    category: [{ coding: [{ system: "http://terminology.hl7.org/CodeSystem/condition-category", code: "encounter-diagnosis" }] }],
    code: { coding: [
        { system: "http://snomed.info/sct", code: "44054006", display: "Diabetes mellitus type 2" },
        { system: "http://hl7.org/fhir/sid/icd-10-cm", code: "E11.9" },
    ]},
    onsetDateTime: "2022-06-01",
};

test("snap: Patient__person — gender + race + ethnicity + birthsex", async () => {
    const vd = await loadView("Patient__person");
    const rows = run(ctx, { resource: patient, viewDefinition: vd });
    expect(rows).toMatchSnapshot();
});

test("snap: Patient__location — single address row", async () => {
    const vd = await loadView("Patient__location");
    const rows = run(ctx, { resource: patient, viewDefinition: vd });
    expect(rows).toMatchSnapshot();
});

test("snap: Condition__condition_occurrence — SNOMED + ICD10CM fan-out", async () => {
    const vd = await loadView("Condition__condition_occurrence");
    const rows = run(ctx, { resource: condition, viewDefinition: vd });
    expect(rows).toMatchSnapshot();
});

test("snap: Observation_component__measurement — BP component fan-out", async () => {
    const vd = await loadView("Observation_component__measurement");
    const rows = run(ctx, { resource: bpObservation, viewDefinition: vd });
    // Expect 2 rows (systolic + diastolic), preserving parent encounter/effective
    expect(rows.length).toBe(2);
    expect(rows).toMatchSnapshot();
});
