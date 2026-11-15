import { useMemo } from 'react';
import { viewProps } from '../adapter/props';
import * as tables from '@tanstack/react-table';

/** Retains column behavior while excluding authored header and cell styling, including grouped columns. */
function viewColumn<Column extends { meta?: object; columns?: readonly Column[] }>(column: Column): Column {
    return {
        ...column,
        ...(column.meta && { meta: viewProps(column.meta) }),
        ...(column.columns && { columns: column.columns.map(viewColumn) })
    };
}

/** Builds a native table with the View component styling policy applied to column metadata. */
export const useTable: typeof tables.useTable = (options, selector) => {
    const columns = useMemo(() => options.columns.map(viewColumn), [options.columns]);

    const defaultColumn = useMemo(
        () => options.defaultColumn && viewColumn(options.defaultColumn),
        [options.defaultColumn]
    );

    // Preserve table state and native subscriptions while keeping caller-owned definitions unchanged.
    return tables.useTable({ ...options, columns, defaultColumn }, selector);
};

export type { ColumnDef, CellContext, RowSelectionState, SortingState } from '@tanstack/react-table';
