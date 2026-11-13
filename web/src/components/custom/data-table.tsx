import type { TableColumn } from './table';
import { EmptyState } from '@/components/custom/empty-state';
import { useTable, type ColumnDef } from '@tanstack/react-table';
import { renderTableValue, tableColumns, tableWidths } from './table';
import { DataGridTable } from '@/components/reui/data-grid/data-grid-table';
import { DataGrid, dataGridFeatures, type DataGridFeatures } from '@/components/reui/data-grid/data-grid';

export { proportional, pixel } from './table';

export type { ColumnWidth } from './table';

/** Adapts data-driven columns and domain row identities to ReUI's DataGrid. */
export function DataTable<T extends Record<string, unknown>>({
    data,
    columns,
    hasHover = false,
    isStriped = false,
    idKey,
    density = 'compact',
    verticalAlign = 'middle'
}: {
    data: T[];
    columns?: TableColumn<T>[];
    hasHover?: boolean;
    isStriped?: boolean;
    idKey?: keyof T | ((row: T) => string | number);
    density?: 'compact';
    verticalAlign?: 'top' | 'middle' | 'bottom';
}) {
    const resolvedColumns = tableColumns(data, columns);
    const widths = tableWidths(resolvedColumns);

    // Adapt the fixed View contract to the registry's TanStack column definitions.
    const definitions: ColumnDef<DataGridFeatures, T>[] = resolvedColumns.map((column, index) => {
        const alignment =
            column.align === 'center' ? 'text-center' : column.align === 'end' ? 'text-end' : 'text-start';

        return {
            id: column.key,
            accessorFn: (row) => row[column.key],
            header: () => column.header ?? column.key.charAt(0).toUpperCase() + column.key.slice(1),
            cell: ({ row }) =>
                column.renderCell ? column.renderCell(row.original) : renderTableValue(row.original[column.key]),
            meta: { ...widths[index], headerClassName: alignment, cellClassName: alignment }
        };
    });

    const table = useTable({
        features: dataGridFeatures,
        data,
        columns: definitions,
        // oxlint-disable-next-line anti-slop/no-runtime-typeof -- Native callers choose a domain key or identity callback.
        getRowId: idKey ? (row) => String(typeof idKey === 'function' ? idKey(row) : row[idKey]) : undefined
    });

    return (
        <DataGrid
            table={table}
            recordCount={data.length}
            emptyMessage={<EmptyState title="No data" isCompact />}
            tableLayout={{ dense: density === 'compact', stripped: isStriped, rowBorder: true, headerBorder: true }}
            tableClassNames={{
                base:
                    verticalAlign === 'top'
                        ? '[&_td]:align-top'
                        : verticalAlign === 'bottom'
                          ? '[&_td]:align-bottom'
                          : undefined,
                bodyRow: hasHover ? 'hover:bg-muted/40' : undefined
            }}
        >
            <DataGridTable<T> renderHeader={resolvedColumns.length > 0} />
        </DataGrid>
    );
}
