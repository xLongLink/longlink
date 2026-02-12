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
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    type TableAlign,
    type TableColumn,
    type TableConfig,
} from '@/types/viavai/table.types';

const textAlignClasses: Record<TableAlign, string> = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
};

const sample: TableConfig<{
    id: string;
    client: {
        name: string;
        email: string;
    };
    invoiceNumber: string;
    issueDate: string;
    dueDate: string;
    status: string;
    subtotal: number;
    vat: number;
}> = {
    title: 'Dynamic Table',
    description: 'Schema-driven table rendered from JSON data + JSON schema.',
    data: [
        {
            id: '1',
            client: {
                name: 'Adriano Saurwein',
                email: 'adriano@email.com',
            },
            invoiceNumber: 'INV-001',
            issueDate: '2024-01-10',
            dueDate: '2024-01-20',
            status: 'Paid',
            subtotal: 1000,
            vat: 200,
        },
        {
            id: '2',
            client: {
                name: 'Leonardo Saurwein',
                email: 'leo@email.com',
            },
            invoiceNumber: 'INV-002',
            issueDate: '2024-01-15',
            dueDate: '2024-01-30',
            status: 'Pending',
            subtotal: 450,
            vat: 90,
        },
    ],
    schema: {
        columns: [
            {
                key: 'invoice',
                label: 'Invoice',
                align: 'left',
                cell: [
                    '{invoiceNumber}',
                    'Issued {issueDate}',
                    'Status: {status}',
                ],
            },
            {
                key: 'client',
                label: 'Client',
                cell: ['{client.name}', '{client.email}'],
            },
            {
                key: 'dueDate',
                label: 'Due Date',
                align: 'left',
                cell: ['{dueDate}'],
            },
            {
                key: 'amount',
                label: 'Amount',
                align: 'right',
                cell: ['€{subtotal}', 'VAT €{vat}'],
            },
        ],
    },
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
    columns: TableColumn[]
): ColumnDef<T>[] {
    return columns.map((column) => {
        const align = column.align ?? 'left';

        return {
            id: column.key,
            header: column.label ?? column.key,
            meta: { align },
            cell: ({ row }) => (
                <div className={`leading-tight ${textAlignClasses[align]}`}>
                    {column.cell.map((line, index) => (
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

type JsonTableProps<T extends object> = {
    config: TableConfig<T>;
};

export function JsonTable<T extends object>({ config }: JsonTableProps<T>) {
    const table = useReactTable({
        data: config.data,
        columns: buildColumns<T>(config.schema.columns),
        getCoreRowModel: getCoreRowModel(),
    });

    return (
        <Card className="w-full">
            <CardHeader>
                <CardTitle>{config.title}</CardTitle>
                {config.description ? (
                    <CardDescription>{config.description}</CardDescription>
                ) : null}
            </CardHeader>
            <CardContent>
                <div className="overflow-hidden rounded-md border">
                    <UITable>
                        <TableHeader>
                            {table.getHeaderGroups().map((headerGroup) => (
                                <TableRow key={headerGroup.id}>
                                    {headerGroup.headers.map((header) => {
                                        const align =
                                            (
                                                header.column.columnDef
                                                    .meta as {
                                                    align?: TableAlign;
                                                }
                                            )?.align ?? 'left';

                                        return (
                                            <TableHead
                                                key={header.id}
                                                className={
                                                    textAlignClasses[align]
                                                }
                                            >
                                                {header.isPlaceholder
                                                    ? null
                                                    : flexRender(
                                                          header.column
                                                              .columnDef.header,
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
                                                    cell.column.columnDef
                                                        .meta as {
                                                        align?: TableAlign;
                                                    }
                                                )?.align ?? 'left';

                                            return (
                                                <TableCell
                                                    key={cell.id}
                                                    className={
                                                        textAlignClasses[align]
                                                    }
                                                >
                                                    {flexRender(
                                                        cell.column.columnDef
                                                            .cell,
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
                                        colSpan={config.schema.columns.length}
                                        className="h-24 text-center text-muted-foreground"
                                    >
                                        No data available.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </UITable>
                </div>
            </CardContent>
        </Card>
    );
}

export function Table() {
    return <JsonTable config={sample} />;
}

export default Table;
