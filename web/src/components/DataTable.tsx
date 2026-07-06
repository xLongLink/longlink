import { useTranslation } from '@/lib/i18n';
import { type ColumnDef, type RowData, flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

declare module '@tanstack/react-table' {
    interface ColumnMeta<TData extends RowData, TValue> {
        className?: string;
    }
}

interface DataTableProps<TData, TValue> {
    columns: ColumnDef<TData, TValue>[];
    data: TData[];
    emptyMessage?: string;
    error?: Error | null;
    isLoading?: boolean;
}

/** Renders a shadcn-style data table. */
export function DataTable<TData, TValue>({
    columns,
    data,
    emptyMessage,
    error = null,
    isLoading = false,
}: DataTableProps<TData, TValue>) {
    const { t } = useTranslation();
    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
    });
    const resolvedEmptyMessage = emptyMessage ?? t('common.noResults');

    if (isLoading && data.length === 0) {
        return null;
    }

    if (error && data.length === 0) {
        return <div className="rounded-md border p-4 text-sm text-destructive">{error.message}</div>;
    }

    return (
        <div className="overflow-hidden rounded-md border">
            <Table>
                <TableHeader className="bg-muted/50">
                    {table.getHeaderGroups().map((headerGroup) => (
                        <TableRow key={headerGroup.id}>
                            {headerGroup.headers.map((header) => (
                                <TableHead
                                    key={header.id}
                                    className={`bg-muted/50 ${header.column.columnDef.meta?.className ?? ''}`}
                                >
                                    {header.isPlaceholder
                                        ? null
                                        : flexRender(header.column.columnDef.header, header.getContext())}
                                </TableHead>
                            ))}
                        </TableRow>
                    ))}
                </TableHeader>
                <TableBody>
                    {table.getRowModel().rows.length ? (
                        table.getRowModel().rows.map((row) => (
                            <TableRow key={row.id} data-state={row.getIsSelected() && 'selected'}>
                                {row.getVisibleCells().map((cell) => (
                                    <TableCell key={cell.id} className={cell.column.columnDef.meta?.className}>
                                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                    </TableCell>
                                ))}
                            </TableRow>
                        ))
                    ) : (
                        <TableRow>
                            <TableCell colSpan={columns.length} className="h-24 text-center">
                                {resolvedEmptyMessage}
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
    );
}
