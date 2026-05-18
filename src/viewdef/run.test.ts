import { test, expect } from "bun:test";
import run from "./run";
import columns from "./columns";

const ctx = {} as Context;

const patient = {
    resourceType: "Patient",
    id: "p1",
    gender: "male",
    birthDate: "1990-05-15",
    name: [{ family: "Smith", given: ["John", "Q"] }],
    address: [
        { city: "Boston", state: "MA" },
        { city: "Cambridge", state: "MA" },
    ],
    extension: [
        {
            url: "http://hl7.org/fhir/us/core/StructureDefinition/us-core-race",
            extension: [
                { url: "ombCategory", valueCoding: { code: "2106-3", display: "White" } },
                { url: "text", valueString: "White" },
            ],
        },
        {
            url: "http://hl7.org/fhir/us/core/StructureDefinition/us-core-birthsex",
            valueCode: "M",
        },
    ],
};

test("flat select with primitive paths", () => {
    const vd = {
        resourceType: "ViewDefinition",
        resource: "Patient",
        select: [{
            column: [
                { name: "id",     path: "Patient.id" },
                { name: "gender", path: "Patient.gender" },
                { name: "birth",  path: "Patient.birthDate" },
            ],
        }],
    };
    expect(columns(ctx, { viewDefinition: vd })).toEqual(["id", "gender", "birth"]);
    expect(run(ctx, { resource: patient, viewDefinition: vd })).toEqual([
        ["p1", "male", "1990-05-15"],
    ]);
});

test("forEach fan-out: one Patient → two address rows", () => {
    const vd = {
        resourceType: "ViewDefinition",
        resource: "Patient",
        select: [
            { column: [{ name: "id", path: "Patient.id" }] },
            {
                forEach: "Patient.address",
                column: [
                    { name: "city",  path: "city" },
                    { name: "state", path: "state" },
                ],
            },
        ],
    };
    expect(columns(ctx, { viewDefinition: vd })).toEqual(["id", "city", "state"]);
    expect(run(ctx, { resource: patient, viewDefinition: vd })).toEqual([
        ["p1", "Boston",    "MA"],
        ["p1", "Cambridge", "MA"],
    ]);
});

test("where filter — patient does NOT match → empty rows", () => {
    const vd = {
        resourceType: "ViewDefinition",
        resource: "Patient",
        where: [{ path: "Patient.gender = 'female'" }],
        select: [{ column: [{ name: "id", path: "Patient.id" }] }],
    };
    expect(run(ctx, { resource: patient, viewDefinition: vd })).toEqual([]);
});

test("resourceType mismatch returns empty", () => {
    const vd = {
        resourceType: "ViewDefinition",
        resource: "Observation",
        select: [{ column: [{ name: "id", path: "Observation.id" }] }],
    };
    expect(run(ctx, { resource: patient, viewDefinition: vd })).toEqual([]);
});

test("nested extension via where(url=…) — US Core race ombCategory", () => {
    const vd = {
        resourceType: "ViewDefinition",
        resource: "Patient",
        select: [{
            column: [
                { name: "id", path: "Patient.id" },
                {
                    name: "race_code",
                    path: "Patient.extension.where(url='http://hl7.org/fhir/us/core/StructureDefinition/us-core-race').extension.where(url='ombCategory').valueCoding.code.first()",
                },
                {
                    name: "race_text",
                    path: "Patient.extension.where(url='http://hl7.org/fhir/us/core/StructureDefinition/us-core-race').extension.where(url='text').valueString.first()",
                },
                {
                    name: "birthsex",
                    path: "Patient.extension.where(url='http://hl7.org/fhir/us/core/StructureDefinition/us-core-birthsex').valueCode.first()",
                },
            ],
        }],
    };
    expect(run(ctx, { resource: patient, viewDefinition: vd })).toEqual([
        ["p1", "2106-3", "White", "M"],
    ]);
});

test("collection: true keeps array result", () => {
    const vd = {
        resourceType: "ViewDefinition",
        resource: "Patient",
        select: [{
            column: [
                { name: "id",    path: "Patient.id" },
                { name: "given", path: "Patient.name.first().given", collection: true },
            ],
        }],
    };
    expect(run(ctx, { resource: patient, viewDefinition: vd })).toEqual([
        ["p1", ["John", "Q"]],
    ]);
});

test("absent path → null", () => {
    const vd = {
        resourceType: "ViewDefinition",
        resource: "Patient",
        select: [{
            column: [
                { name: "id",       path: "Patient.id" },
                { name: "deceased", path: "Patient.deceasedDateTime" },
            ],
        }],
    };
    expect(run(ctx, { resource: patient, viewDefinition: vd })).toEqual([
        ["p1", null],
    ]);
});

test("input array of resources → flat array of rows", () => {
    const p2 = { ...patient, id: "p2", gender: "female" };
    const vd = {
        resourceType: "ViewDefinition",
        resource: "Patient",
        select: [{
            column: [
                { name: "id",     path: "Patient.id" },
                { name: "gender", path: "Patient.gender" },
            ],
        }],
    };
    expect(run(ctx, { resource: [patient, p2], viewDefinition: vd })).toEqual([
        ["p1", "male"],
        ["p2", "female"],
    ]);
});

test("real Patient__person.view.json style — gender + birthDate + birthsex", () => {
    const vd = {
        resourceType: "ViewDefinition",
        resource: "Patient",
        select: [{
            column: [
                { name: "id",          path: "Patient.id" },
                { name: "gender",      path: "Patient.gender" },
                {
                    name: "us_core_birthsex",
                    path: "Patient.extension.where(url='http://hl7.org/fhir/us/core/StructureDefinition/us-core-birthsex').valueCode.first()",
                },
                { name: "birth_date",  path: "Patient.birthDate" },
            ],
        }],
    };
    expect(columns(ctx, { viewDefinition: vd })).toEqual([
        "id", "gender", "us_core_birthsex", "birth_date",
    ]);
    expect(run(ctx, { resource: patient, viewDefinition: vd })).toEqual([
        ["p1", "male", "M", "1990-05-15"],
    ]);
});
