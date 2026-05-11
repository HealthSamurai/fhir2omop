export type ValueSet = {
    resourceType: "ValueSet";
    id: string;
    url: string;
    name: string;
    title?: string;
    description?: string;
    domain?: string;
    expansionSql?: string;
    compose?: {
        include: Array<{
            system: string;
            concept?: Array<{ code: string; display?: string }>;
        }>;
    };
};
