export type ViewDefinition = {
    resourceType: "ViewDefinition";
    id: string;
    url: string;
    name: string;
    title?: string;
    description?: string;
    resource: string;
    targetTable?: string;
    edgeKey?: string;
    select?: Array<{
        column?: Array<{
            name: string;
            path: string;
            type?: string;
            description?: string;
        }>;
    }>;
    where?: Array<{ path: string; description?: string }>;
};
