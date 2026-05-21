export type Field = {
    table: string;
    name: string;
    type: string;
    required: boolean;
    isPrimaryKey: boolean;
    isForeignKey: boolean;
    fkTable?: string;
    fkField?: string;
    fkDomain?: string;
    fkClass?: string;
    userGuidance?: string;
    etlConventions?: string;
};
