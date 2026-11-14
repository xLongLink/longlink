import type { TableColumn } from './table';
import { useState, type ReactNode } from 'react';
import { renderTableValue, tableColumns, tableWidths } from './table';
import { Empty, EmptyHeader, EmptyTitle } from '@/components/shadcn/empty';
import { DataGridScrollArea } from '@/components/reui/data-grid/data-grid-scroll-area';
import { DataGridColumnHeader } from '@/components/reui/data-grid/data-grid-column-header';
import {
    DataGridTable,
    DataGridTableRowSelect,
    DataGridTableRowSelectAll
} from '@/components/reui/data-grid/data-grid-table';
import {
    useTable,
    type CellContext,
    type ColumnDef,
    type SortingState,
    type RowSelectionState
} from '@tanstack/react-table';
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
    sorting,
    onSortingChange,
    enableRowSelection = false,
    rowSelection,
    onRowSelectionChange,
    emptyMessage,
    verticalAlign = 'middle'
}: {
    data: T[];
    columns?: TableColumn<T>[];
    hasHover?: boolean;
    isStriped?: boolean;
    idKey?: keyof T | ((row: T) => string | number);
    density?: 'compact';
    sorting?: SortingState;
    onSortingChange?: (sorting: SortingState) => void;
    enableRowSelection?: boolean;
    rowSelection?: RowSelectionState;
    onRowSelectionChange?: (selection: RowSelectionState) => void;
    emptyMessage?: ReactNode;
    verticalAlign?: 'top' | 'middle' | 'bottom';
}) {
    const [localSorting, setSorting] = useState<SortingState>([]);
    const [localSelection, setSelection] = useState<RowSelectionState>({});
    const currentSorting = sorting ?? localSorting;
    const currentSelection = rowSelection ?? localSelection;

    // Selection must follow domain identities rather than transient row positions.
    if (enableRowSelection && idKey === undefined) throw new Error('Selectable DataTable requires idKey');

    const resolvedColumns = tableColumns(data, columns);
    const widths = tableWidths(resolvedColumns);

    // Adapt the fixed View contract to the registry's TanStack column definitions.
    const definitions: ColumnDef<DataGridFeatures, T>[] = resolvedColumns.map((column, index) => {
        const alignment =
            column.align === 'center' ? 'text-center' : column.align === 'end' ? 'text-end' : 'text-start';

        const label = column.key.charAt(0).toUpperCase() + column.key.slice(1);

        // oxlint-disable-next-line anti-slop/no-runtime-typeof -- ReactNode headers need a plain-text sorting label.
        const headerTitle = typeof column.header === 'string' ? column.header : label;

        const meta: DataTableColumnMeta<T> = {
            renderCell: column.renderCell,
            headerClassName: alignment,
            cellClassName: alignment,
            headerTitle
        };

        return {
            id: column.key,
            accessorFn: (row) => row[column.key],
            header: ({ column: nativeColumn }) =>
                column.sortable ? <DataGridColumnHeader column={nativeColumn} /> : (column.header ?? label),
            enableSorting: column.sortable ?? false,
            cell: DataTableCell,
            size: widths[index],
            minSize: widths[index],
            meta
        };
    });

    // Reuse registry selection controls and their subscription and keyboard behavior.
    if (enableRowSelection) {
        definitions.unshift({
            id: '__selection',
            header: () => <DataGridTableRowSelectAll />,
            cell: ({ row }) => <DataGridTableRowSelect row={row} />,
            size: 44,
            minSize: 44,
            enableSorting: false
        });
    }

    const table = useTable({
        features: dataGridFeatures,
        manualPagination: true,
        data,
        columns: definitions,
        enableRowSelection,
        state: { sorting: currentSorting, rowSelection: currentSelection },
        onSortingChange: (update) => {
            // oxlint-disable-next-line anti-slop/no-runtime-typeof -- TanStack accepts values or functional updates.
            const next = typeof update === 'function' ? update(currentSorting) : update;

            if (sorting === undefined) setSorting(next);
            onSortingChange?.(next);
        },
        onRowSelectionChange: (update) => {
            // oxlint-disable-next-line anti-slop/no-runtime-typeof -- TanStack accepts values or functional updates.
            const next = typeof update === 'function' ? update(currentSelection) : update;

            if (rowSelection === undefined) setSelection(next);
            onRowSelectionChange?.(next);
        },
        getRowId:
            idKey !== undefined
                ? (row) => {
                      // oxlint-disable-next-line anti-slop/no-runtime-typeof -- Callers choose a domain key or identity callback.
                      return String(typeof idKey === 'function' ? idKey(row) : row[idKey]);
                  }
                : undefined
    });

    return (
        <DataGrid
            table={table}
            recordCount={data.length}
            emptyMessage={
                emptyMessage ?? (
                    <Empty role="status">
                        <EmptyHeader>
                            <EmptyTitle>No data</EmptyTitle>
                        </EmptyHeader>
                    </Empty>
                )
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
                    <div
                        style={{
                            minWidth: widths.reduce((total, width) => total + width, enableRowSelection ? 44 : 0)
                        }}
                    >
                        <DataGridTable renderHeader={resolvedColumns.length > 0} />
                    </div>
                </DataGridScrollArea>
            </DataGridContainer>
        </DataGrid>
    );
}
