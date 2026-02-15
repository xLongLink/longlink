import {
    type ColumnDef,
    flexRender,
    getCoreRowModel,
    useReactTable,
} from '@tanstack/react-table';

import {
    Table as UITable,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';

export type TableAlign = 'left' | 'center' | 'right';

export type ApiTableColumn = {
    key: string;
    label?: string;
    align?: TableAlign;
    cell: string | string[];
};

export type TableSchema = {
    columns: ApiTableColumn[];
};

export type TableSchemaConfig = {
    title: string;
    description?: string;
    schema: TableSchema;
};

type TableProps<T extends object> = {
    data: T[];
    columns?: ApiTableColumn[];
    schema?: TableSchemaConfig;
};

const textAlignClasses: Record<TableAlign, string> = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
};

function resolvePath(data: unknown, path: string): unknown {
    return path
        .split('.')
        .reduce<unknown>(
            (acc, key) => (acc as Record<string, unknown>)?.[key],
            data
        );
}

function renderTemplate(template: string, data: unknown): string {
    return template.replace(/\{([^}]+)\}/g, (_, path) => {
        const value = resolvePath(data, path.trim());
        return value == null ? '' : String(value);
    });
}

function buildColumns<T extends object>(
    columns: ApiTableColumn[]
): ColumnDef<T>[] {
    return columns.map((column) => {
        const align = column.align ?? 'left';
        const lines = Array.isArray(column.cell) ? column.cell : [column.cell];

        return {
            id: column.key,
            header: column.label ?? column.key,
            meta: { align },
            cell: ({ row }) => (
                <div className={`leading-tight ${textAlignClasses[align]}`}>
                    {lines.map((line, index) => (
                        <div
                            key={`${column.key}-${index}`}
                            className={
                                index === 0
                                    ? 'text-sm font-medium'
                                    : 'text-xs text-muted-foreground'
                            }
                        >
                            {renderTemplate(line, row.original)}
                        </div>
                    ))}
                </div>
            ),
        };
    });
}

export function Table<T extends object>({
    columns,
    schema,
    data,
}: TableProps<T>) {
    const resolvedColumns = columns ?? schema?.schema.columns ?? [];

    const table = useReactTable({
        data,
        columns: buildColumns<T>(resolvedColumns),
        getCoreRowModel: getCoreRowModel(),
    });

    return (
        <div className="overflow-hidden rounded-md border">
            <UITable>
                <TableHeader className="bg-muted/50">
                    {table.getHeaderGroups().map((headerGroup) => (
                        <TableRow key={headerGroup.id}>
                            {headerGroup.headers.map((header) => {
                                const align =
                                    (
                                        header.column.columnDef.meta as {
                                            align?: TableAlign;
                                        }
                                    )?.align ?? 'left';

                                return (
                                    <TableHead
                                        key={header.id}
                                        className={textAlignClasses[align]}
                                    >
                                        {header.isPlaceholder
                                            ? null
                                            : flexRender(
                                                  header.column.columnDef
                                                      .header,
                                                  header.getContext()
                                              )}
                                    </TableHead>
                                );
                            })}
                        </TableRow>
                    ))}
                </TableHeader>

                <TableBody>
                    {table.getRowModel().rows.length > 0 ? (
                        table.getRowModel().rows.map((row) => (
                            <TableRow key={row.id}>
                                {row.getVisibleCells().map((cell) => {
                                    const align =
                                        (
                                            cell.column.columnDef.meta as {
                                                align?: TableAlign;
                                            }
                                        )?.align ?? 'left';

                                    return (
                                        <TableCell
                                            key={cell.id}
                                            className={textAlignClasses[align]}
                                        >
                                            {flexRender(
                                                cell.column.columnDef.cell,
                                                cell.getContext()
                                            )}
                                        </TableCell>
                                    );
                                })}
                            </TableRow>
                        ))
                    ) : (
                        <TableRow>
                            <TableCell
                                colSpan={resolvedColumns.length}
                                className="h-24 text-center text-muted-foreground"
                            >
                                No data available.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </UITable>
        </div>
    );
}

export default Table;
