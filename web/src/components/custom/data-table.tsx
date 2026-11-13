import type { TableColumn } from './table';
import { renderTableValue, tableColumns, tableWidths } from './table';
import { Empty, EmptyHeader, EmptyTitle } from '@/components/shadcn/empty';
import { DataGridTable } from '@/components/reui/data-grid/data-grid-table';
import { useTable, type CellContext, type ColumnDef } from '@tanstack/react-table';
import { DataGridScrollArea } from '@/components/reui/data-grid/data-grid-scroll-area';
import {
    DataGrid,
    DataGridContainer,
    dataGridFeatures,
    type DataGridColumnMeta,
    type DataGridFeatures
} from '@/components/reui/data-grid/data-grid';

export { proportional, pixel } from './table';

export type { ColumnWidth } from './table';

type DataTableColumnMeta<T extends Record<string, unknown>> = DataGridColumnMeta<T> & {
    renderCell?: TableColumn<T>['renderCell'];
};

/** Keeps cell component identity stable when callers replace their column callbacks. */
function DataTableCell<T extends Record<string, unknown>>({
    column,
    row,
    getValue
}: CellContext<DataGridFeatures, T, unknown>) {
    // SAFETY: DataTable owns the column definitions and their renderer metadata.
    const meta = column.columnDef.meta as DataTableColumnMeta<T>;

    return meta.renderCell ? meta.renderCell(row.original) : renderTableValue(getValue());
}

/** Adapts data-driven columns and domain row identities to ReUI's DataGrid. */
export function DataTable<T extends Record<string, unknown>>({
    data,
    columns,
    hasHover = false,
    isStriped = false,
    idKey,
    density,
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

        const meta: DataTableColumnMeta<T> = {
            renderCell: column.renderCell,
            headerClassName: alignment,
            cellClassName: alignment
        };

        return {
            id: column.key,
            accessorFn: (row) => row[column.key],
            header: () => column.header ?? column.key.charAt(0).toUpperCase() + column.key.slice(1),
            cell: DataTableCell,
            size: widths[index],
            minSize: widths[index],
            meta
        };
    });

    const table = useTable({
        features: dataGridFeatures,
        manualPagination: true,
        data,
        columns: definitions,
        // oxlint-disable-next-line anti-slop/no-runtime-typeof -- Native callers choose a domain key or identity callback.
        getRowId: idKey ? (row) => String(typeof idKey === 'function' ? idKey(row) : row[idKey]) : undefined
    });

    return (
        <DataGrid
            table={table}
            recordCount={data.length}
            emptyMessage={
                <Empty role="status">
                    <EmptyHeader>
                        <EmptyTitle>No data</EmptyTitle>
                    </EmptyHeader>
                </Empty>
            }
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
            <DataGridContainer>
                <DataGridScrollArea orientation="horizontal">
                    <div style={{ minWidth: widths.reduce((total, width) => total + width, 0) }}>
                        <DataGridTable renderHeader={resolvedColumns.length > 0} />
                    </div>
                </DataGridScrollArea>
            </DataGridContainer>
        </DataGrid>
    );
}
