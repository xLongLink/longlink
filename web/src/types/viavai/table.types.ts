export type TableAlign = 'left' | 'center' | 'right';

export type TableColumn = {
    key: string;
    label?: string;
    align?: TableAlign;
    cell: string[];
};

export type TableSchema = {
    columns: TableColumn[];
};

export type TableSchemaConfig = {
    title: string;
    description?: string;
    schema: TableSchema;
};
