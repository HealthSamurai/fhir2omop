export type Profile = {
    resourceType: "StructureDefinition";
    id: string;
    url: string;
    name: string;
    title?: string;
    description?: string;
    type: string;
    baseDefinition?: string;
    derivation?: string;
    targetTable?: string;
    edgeKey?: string;
    differential?: { element: any[] };
};
