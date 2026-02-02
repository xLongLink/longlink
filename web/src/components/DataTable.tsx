import {
    type ColumnDef,
    flexRender,
    getCoreRowModel,
    useReactTable,
} from "@tanstack/react-table"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"

/* =========================
   SCHEMA
========================= */

export type ColumnSchema = {
    key: string
    align?: "left" | "center" | "right"
    cell: string[]
}

/* =========================
   TEMPLATE HELPERS
========================= */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function resolvePath(obj: any, path: string): any {
    return path.split(".").reduce((acc, key) => acc?.[key], obj)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function renderTemplate(template: string, data: any): string {
    return template.replace(
        /\{([^}]+)\}/g,
        (_, path) => String(resolvePath(data, path) ?? "")
    )
}

/* =========================
   COLUMN BUILDER
========================= */

function buildColumns<T extends object>(
    schema: ColumnSchema[]
): ColumnDef<T>[] {
    return schema.map((col) => ({
        header: col.key,
        meta: {
            align: col.align ?? "left",
        },
        cell: ({ row }) => (
            <div className={`leading-tight text-${col.align ?? "left"}`}>
                {col.cell.map((line, i) => (
                    <div
                        key={i}
                        className={
                            i === 0
                                ? "text-sm font-medium"
                                : "text-xs text-muted-foreground"
                        }
                    >
                        {renderTemplate(line, row.original)}
                    </div>
                ))}
            </div>
        ),
    }))
}

/* =========================
   TABLE
========================= */

type DataTableProps<T> = {
    data: T[]
    schema: ColumnSchema[]
}

export function DataTable<T extends object>({
    data,
    schema,
}: DataTableProps<T>) {
    const table = useReactTable({
        data,
        columns: buildColumns<T>(schema),
        getCoreRowModel: getCoreRowModel(),
    })

    return (
        <div className="border overflow-hidden">
            <Table>
                <TableHeader>
                    {table.getHeaderGroups().map((hg) => (
                        <TableRow key={hg.id}>
                            {hg.headers.map((header) => {
                                const align =
                                    header.column.columnDef.meta?.align ?? "left"

                                return (
                                    <TableHead
                                        key={header.id}
                                        className={`text-${align}`}
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
                    {table.getRowModel().rows.map((row) => (
                        <TableRow key={row.id}>
                            {row.getVisibleCells().map((cell) => {
                                const align =
                                    cell.column.columnDef.meta?.align ?? "left"

                                return (
                                    <TableCell
                                        key={cell.id}
                                        className={`text-${align}`}
                                    >
                                        {flexRender(
                                            cell.column.columnDef.cell,
                                            cell.getContext()
                                        )}
                                    </TableCell>
                                )
                            })}
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    )
}
