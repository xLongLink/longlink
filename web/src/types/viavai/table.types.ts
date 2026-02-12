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

export type TableConfig<T extends object> = {
    title: string;
    description?: string;
    data: T[];
    schema: TableSchema;
};
