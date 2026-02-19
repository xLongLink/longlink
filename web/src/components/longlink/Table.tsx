import { useEffect, useMemo, useState } from 'react'
import {
    type ColumnDef,
    type SortingState,
    flexRender,
    getCoreRowModel,
    useReactTable,
} from '@tanstack/react-table'

import {
    Table as UITable,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'

export type TableAlign = 'left' | 'center' | 'right'

export type ApiTableColumn = {
    key: string
    label?: string
    align?: TableAlign
    value: string
    detail?: string
}

export type TableSchema = {
    columns: ApiTableColumn[]
}

export type TableSchemaConfig = {
    title: string
    description?: string
    schema: TableSchema
}

type TableProps<T extends object> = {
    endpoint: string
    schema: TableSchemaConfig
    pageSize?: number
}

const textAlignClasses: Record<TableAlign, string> = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
}

/* -------------------- */
/* Utility functions    */
/* -------------------- */

function resolvePath(data: unknown, path: string): unknown {
    return path
        .split('.')
        .reduce<unknown>(
            (acc, key) => (acc as Record<string, unknown>)?.[key],
            data
        )
}

function renderTemplate(template: string, data: unknown): string {
    return template.replace(/\{([^}]+)\}/g, (_, path) => {
        const value = resolvePath(data, path.trim())
        return value == null ? '' : String(value)
    })
}

function buildColumns<T extends object>(
    columns: ApiTableColumn[]
): ColumnDef<T>[] {
    return columns.map((column) => {
        const align = column.align ?? 'left'

        return {
            id: column.key,
            header: column.label ?? column.key,
            enableSorting: true,
            meta: { align },

            cell: ({ row }) => (
                <div className={`leading-tight ${textAlignClasses[align]}`}>
                    <div className="text-sm font-medium">
                        {renderTemplate(column.value, row.original)}
                    </div>

                    {column.detail && (
                        <div className="text-xs text-muted-foreground">
                            {renderTemplate(column.detail, row.original)}
                        </div>
                    )}
                </div>
            ),
        }
    })
}

/* -------------------- */
/* Table Component      */
/* -------------------- */

export function Table<T extends object>({
    endpoint,
    schema,
    pageSize = 10,
}: TableProps<T>) {
    const [data, setData] = useState<T[]>([])
    const [total, setTotal] = useState(0)
    const [loading, setLoading] = useState(false)

    const [pagination, setPagination] = useState({
        pageIndex: 0,
        pageSize,
    })

    const [sorting, setSorting] = useState<SortingState>([])

    /* -------------------- */
    /* Fetch Data           */
    /* -------------------- */

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true)

            const params = new URLSearchParams({
                page: String(pagination.pageIndex + 1),
                value: String(pagination.pageSize),
            })

            if (sorting.length > 0) {
                params.append('sort', sorting[0].id)
                params.append('order', sorting[0].desc ? 'desc' : 'asc')
            }

            const response = await fetch(`http://localhost:8000${endpoint}?${params}`)
            console.log('Fetching data from:', `${endpoint}?${params}`)
            const json = await response.json()

            setData(json.data ?? [])
            setTotal(json.total ?? 0)
            setLoading(false)
        }

        fetchData()
    }, [endpoint, pagination, sorting])

    /* -------------------- */
    /* Table Instance       */
    /* -------------------- */

    const columns = useMemo(
        () => buildColumns<T>(schema.schema.columns),
        [schema]
    )

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

        pageCount: Math.ceil(total / pagination.pageSize),

        getCoreRowModel: getCoreRowModel(),
    })

    /* -------------------- */
    /* Render               */
    /* -------------------- */

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
                                            align?: TableAlign
                                        }
                                    )?.align ?? 'left'

                                return (
                                    <TableHead
                                        key={header.id}
                                        className={`cursor-pointer ${textAlignClasses[align]}`}
                                        onClick={header.column.getToggleSortingHandler()}
                                    >
                                        {header.isPlaceholder
                                            ? null
                                            : flexRender(
                                                header.column.columnDef.header,
                                                header.getContext()
                                            )}
                                    </TableHead>
                                )
                            })}
                        </TableRow>
                    ))}
                </TableHeader>

                <TableBody>
                    {loading ? (
                        <TableRow>
                            <TableCell
                                colSpan={columns.length}
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
                                                align?: TableAlign
                                            }
                                        )?.align ?? 'left'

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
                                    )
                                })}
                            </TableRow>
                        ))
                    ) : (
                        <TableRow>
                            <TableCell
                                colSpan={columns.length}
                                className="h-24 text-center text-muted-foreground"
                            >
                                No data available.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </UITable>

            {/* Pagination Controls */}
            <div className="flex items-center justify-between p-3 border-t text-sm">
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
    )
}

export default Table