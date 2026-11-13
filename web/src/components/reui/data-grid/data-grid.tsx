import { createContext, useContext } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import type { ReactTable } from '@tanstack/react-table';
import { columnSizingFeature, columnVisibilityFeature, metaHelper, tableFeatures } from '@tanstack/react-table';

// Adapted from https://reui.io/r/base-nova/data-grid.json, retaining noninteractive rendering only.
export const dataGridFeatures = tableFeatures({
    columnVisibilityFeature,
    columnSizingFeature,
    columnMeta: metaHelper<DataGridColumnMeta>(),
});

export type DataGridFeatures = typeof dataGridFeatures;

export interface DataGridColumnMeta {
    headerClassName?: string;
    cellClassName?: string;
    // Local sizing adaptation preserves View widths without enabling resize features.
    width?: CSSProperties['width'];
    minWidth?: number;
}

type DataGridProps<TData extends object> = {
    table: ReactTable<DataGridFeatures, TData>;
    recordCount: number;
    children?: ReactNode;
    emptyMessage?: ReactNode;
    tableLayout?: {
        dense?: boolean;
        stripped?: boolean;
        rowBorder?: boolean;
        headerBorder?: boolean;
        width?: 'auto' | 'fixed';
    };
    tableClassNames?: {
        base?: string;
        header?: string;
        headerRow?: string;
        body?: string;
        bodyRow?: string;
    };
};

const DataGridContext = createContext<unknown>(undefined);

export function useDataGrid<TData extends object>(): DataGridProps<TData> {
    // SAFETY: The provider owns the concrete row type; React shares one context across table instances.
    const context = useContext(DataGridContext) as DataGridProps<TData> | undefined;

    if (!context) throw new Error('useDataGrid must be used within a DataGridProvider');

    return context;
}

export function DataGrid<TData extends object>({ children, ...props }: DataGridProps<TData>) {
    return <DataGridContext.Provider value={props}>{children}</DataGridContext.Provider>;
}
