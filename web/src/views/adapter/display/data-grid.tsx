import { viewComponent, type ViewProps } from '../props';
import type { TableFeatures } from '@tanstack/react-table';
import * as grid from '@/components/reui/data-grid/data-grid';
import * as table from '@/components/reui/data-grid/data-grid-table';
import * as scroll from '@/components/reui/data-grid/data-grid-scroll-area';
import * as header from '@/components/reui/data-grid/data-grid-column-header';
import * as pagination from '@/components/reui/data-grid/data-grid-pagination';

export const dataGridFeatures: Omit<grid.DataGridFeatures, 'columnMeta'> & {
    columnMeta: ViewProps<grid.DataGridFeatures['columnMeta']>;
} = grid.dataGridFeatures;

export type DataGridFeatures = typeof dataGridFeatures;

export type { DataGridTableInstance } from '@/components/reui/data-grid/data-grid';

export type DataGridProps<Features extends TableFeatures, Data extends object> = ViewProps<
    grid.DataGridProps<Features, Data>
>;

export type DataGridColumnMeta<Data> = ViewProps<grid.DataGridColumnMeta<Data>>;

export const DataGrid: <Features extends TableFeatures, Data extends object>(
    props: DataGridProps<Features, Data>
) => ReturnType<typeof grid.DataGrid> = grid.DataGrid;

export const DataGridContainer = viewComponent(grid.DataGridContainer);

export { DataGridTable, DataGridTableRowSelect } from '@/components/reui/data-grid/data-grid-table';

export const DataGridTableRowSelectAll = viewComponent(table.DataGridTableRowSelectAll);

export const DataGridColumnHeader: <Data extends object, Value>(
    props: ViewProps<Parameters<typeof header.DataGridColumnHeader<Data, Value>>[0]>
) => ReturnType<typeof header.DataGridColumnHeader> = header.DataGridColumnHeader;

export const DataGridPagination = viewComponent(pagination.DataGridPagination);

export const DataGridScrollArea = viewComponent(scroll.DataGridScrollArea);
