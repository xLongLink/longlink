import {
    type ColumnDef,
    flexRender,
    getCoreRowModel,
    useReactTable,
} from '@tanstack/react-table';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';

/* =========================
   SCHEMA
========================= */

export type ColumnSchema = {
    key: string;
    align?: 'left' | 'center' | 'right';
    cell: string[];
};

/* =========================
   TEMPLATE HELPERS
========================= */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function resolvePath(obj: any, path: string): any {
    return path.split('.').reduce((acc, key) => acc?.[key], obj);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function renderTemplate(template: string, data: any): string {
    return template.replace(/\{([^}]+)\}/g, (_, path) =>
        String(resolvePath(data, path) ?? '')
    );
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
            align: col.align ?? 'left',
        },
        cell: ({ row }) => (
            <div className={`leading-tight text-${col.align ?? 'left'}`}>
                {col.cell.map((line, i) => (
                    <div
                        key={i}
                        className={
                            i === 0
                                ? 'text-sm font-medium'
                                : 'text-xs text-muted-foreground'
                        }
                    >
                        {renderTemplate(line, row.original)}
                    </div>
                ))}
            </div>
        ),
    }));
}

/* =========================
   TABLE
========================= */

type DataTableProps<T> = {
    data: T[];
    schema: ColumnSchema[];
};

export function DataTable<T extends object>({
    data,
    schema,
}: DataTableProps<T>) {
    const table = useReactTable({
        data,
        columns: buildColumns<T>(schema),
        getCoreRowModel: getCoreRowModel(),
    });

    return (
        <div className="border overflow-hidden">
            <Table>
                <TableHeader>
                    {table.getHeaderGroups().map((hg) => (
                        <TableRow key={hg.id}>
                            {hg.headers.map((header) => {
                                const align =
                                    header.column.columnDef.meta?.align ??
                                    'left';

                                return (
                                    <TableHead
                                        key={header.id}
                                        className={`text-${align}`}
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
                    {table.getRowModel().rows.map((row) => (
                        <TableRow key={row.id}>
                            {row.getVisibleCells().map((cell) => {
                                const align =
                                    cell.column.columnDef.meta?.align ?? 'left';

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
                                );
                            })}
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}


import { Card } from "@/components/ui/card"
import { DataTable } from "@/components/DataTable"


// eslint-disable-next-line @typescript-eslint/no-explicit-any
const data: any[] = [
    {
        id: "1",
        client: {
            name: "Adriano Saurwein",
            email: "adriano@email.com"
        },
        invoiceNumber: "INV-001",
        issueDate: "2024-01-10",
        dueDate: "2024-01-20",
        status: "Paid",
        subtotal: 1000,
        vat: 200,
        method: "Card",
    },
    {
        id: "2",
        client: {
            name: "Leonardo Saurwein",
            email: "leo@email.com"
        },
        invoiceNumber: "INV-002",
        issueDate: "2024-01-15",
        dueDate: "2024-01-30",
        status: "Pending",
        subtotal: 450,
        vat: 90,
        method: "Bank Transfer",
    },
    {
        id: "3",
        client: {
            name: "Bongo",
            email: "bongo@email.com"
        },
        invoiceNumber: "INV-003",
        issueDate: "2024-01-05",
        dueDate: "2024-01-12",
        status: "Overdue",
        subtotal: 300,
        vat: 60,
        method: "Card",
    },
]

export type ColumnSchema = {
    key: string                // column header
    align?: "left" | "center" | "right"
    cell: string[]             // template lines
}

const schema: ColumnSchema[] = [
    {
        key: "Invoice",
        align: "left",
        cell: [
            "{invoiceNumber}",
            "Issued {issueDate}",
            "Status: {status}",
        ],
    },
    {
        key: "Client",
        cell: [
            "{client.name}",
            "{client.email}",
        ],
    },
    {
        key: "Due Date",
        align: "left",
        cell: [
            "{dueDate}",
        ],
    },
    {
        key: "Amount",
        align: "right",
        cell: [
            "€{subtotal}",
            "VAT €{vat}",
        ],
    },
    // TODO: Functions
    // bold() -> makes text bold
    // icon() -> adds an icon before the text
    // i18n() -> translates text key to current locale
    // badge() -> wraps text in a badge
    // link() -> makes text a clickable link
    // {
    //     key: "Invoice",
    //     align: "left",
    //     cell: [
    //         "{bold(invoiceNumber)}",
    //         "i18n(Issued) {issueDate}",
    //         "Status: {status}",
    //     ],
    // },

]

// TODO: Table actions
// TODO: Filtering
// TODO: Endpoint calling, ecc
export function Test() {
    return (
        <>
            <div className="flex justify-center p-6">
                <Card className="w-full max-w-6xl p-0">
                    <DataTable data={data} schema={schema} />
                </Card>
            </div>
        </>

    )
}
