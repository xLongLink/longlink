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

type SchemaTableProps = {
    endpoint: string;
    schema: {
        title: string;
        description?: string;
        schema: {
            columns: ApiTableColumn[];
        };
    };
    pageSize?: number;
    data?: never;
    columns?: never;
};

type DataTableProps = {
    data: object[];
    columns: ApiTableColumn[];
    pageSize?: number;
    endpoint?: never;
    schema?: never;
};

type TableProps = SchemaTableProps | DataTableProps;

export function Table<T extends object>(props: TableProps) {
    const [pagination, setPagination] = useState({
        pageIndex: 0,
        pageSize: props.pageSize ?? 10,
    });

    const [sorting, setSorting] = useState<SortingState>([]);

    const isSchemaMode = 'endpoint' in props;

    const apiEndpoint = isSchemaMode
        ? (props as SchemaTableProps).endpoint
        : '/__noop__';

    const apiData = useApiTable<T>({
        endpoint: apiEndpoint,
        pagination,
        sorting,
    });
    const data = (isSchemaMode ? apiData.data : props.data) as T[];
    const total = isSchemaMode ? apiData.total : props.data.length;
    const loading = isSchemaMode ? apiData.loading : false;
    const columnsConfig = isSchemaMode
        ? (props.schema?.schema?.columns ?? [])
        : props.columns;

    const columns = useMemo(
        () => buildColumns<T>(columnsConfig ?? []),
        [columnsConfig]
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
        manualPagination: isSchemaMode,
        manualSorting: isSchemaMode,
        pageCount: Math.max(Math.ceil(total / pagination.pageSize), 1),
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
