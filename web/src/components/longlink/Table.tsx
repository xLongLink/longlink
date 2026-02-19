import { useMemo, useState } from 'react';
import {
    type SortingState,
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
    buildColumns,
    textAlignClasses,
    type ApiTableColumn,
    type TableAlign,
} from '@/components/table/buildColumns';
import { useApiTable } from '@/components/table/useApiTable';

export type { ApiTableColumn, TableAlign };

export type TableSchema = {
    columns: ApiTableColumn[];
};

export type TableSchemaConfig = {
    title: string;
    description?: string;
    schema: TableSchema;
};

type TableProps = {
    endpoint: string;
    schema: TableSchemaConfig;
    pageSize?: number;
};

export function Table<T extends object>({
    endpoint,
    schema,
    pageSize = 10,
}: TableProps) {
    const [pagination, setPagination] = useState({
        pageIndex: 0,
        pageSize,
    });

    const [sorting, setSorting] = useState<SortingState>([]);

    const { data, total, loading } = useApiTable<T>({
        endpoint,
        pagination,
        sorting,
    });

    const columns = useMemo(
        () => buildColumns<T>(schema?.schema?.columns ?? []),
        [schema]
    );

    const table = useReactTable({
        data,
        columns,
        state: {
            pagination,
            sorting,
        },
        onPaginationChange: setPagination,
        onSortingChange: setSorting,
        manualPagination: true,
        manualSorting: true,
        pageCount: total > 0 ? Math.ceil(total / pagination.pageSize) : 1,
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
                                        className={`cursor-pointer ${textAlignClasses[align]}`}
                                        onClick={header.column.getToggleSortingHandler()}
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
                    {loading ? (
                        <TableRow>
                            <TableCell
                                colSpan={Math.max(columns.length, 1)}
                                className="h-24 text-center text-muted-foreground"
                            >
                                Loading...
                            </TableCell>
                        </TableRow>
                    ) : table.getRowModel().rows.length > 0 ? (
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
                                colSpan={Math.max(columns.length, 1)}
                                className="h-24 text-center text-muted-foreground"
                            >
                                No data available.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </UITable>

            <div className="flex items-center justify-between border-t p-3 text-sm">
                <button
                    onClick={() => table.previousPage()}
                    disabled={!table.getCanPreviousPage()}
                >
                    Previous
                </button>

                <span>
                    Page {pagination.pageIndex + 1} of {table.getPageCount()}
                </span>

                <button
                    onClick={() => table.nextPage()}
                    disabled={!table.getCanNextPage()}
                >
                    Next
                </button>
            </div>
        </div>
    );
}

export default Table;
