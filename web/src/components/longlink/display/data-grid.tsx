import type { TableFeatures } from '@tanstack/react-table';
import type { PublicComponent, PublicProps } from '../props';
import * as dataGrid from '@/components/reui/data-grid/data-grid';
import * as gridTable from '@/components/reui/data-grid/data-grid-table';
import * as gridScroll from '@/components/reui/data-grid/data-grid-scroll-area';
import * as gridHeader from '@/components/reui/data-grid/data-grid-column-header';
import * as gridPagination from '@/components/reui/data-grid/data-grid-pagination';

export type { DataGridTableInstance } from '@/components/reui/data-grid/data-grid';
export type DataGridProps<Features extends TableFeatures, Data extends object> = PublicProps<
    dataGrid.DataGridProps<Features, Data>
>;
export type DataGridColumnMeta<Data> = PublicProps<dataGrid.DataGridColumnMeta<Data>>;

export const DataGrid: <Features extends TableFeatures, Data extends object>(
    props: DataGridProps<Features, Data>
) => ReturnType<typeof dataGrid.DataGrid> = dataGrid.DataGrid;

export const DataGridContainer: PublicComponent<typeof dataGrid.DataGridContainer> = dataGrid.DataGridContainer;
export { DataGridTable, DataGridTableRowSelect } from '@/components/reui/data-grid/data-grid-table';
export const DataGridTableRowSelectAll: PublicComponent<typeof gridTable.DataGridTableRowSelectAll> =
    gridTable.DataGridTableRowSelectAll;

export const DataGridColumnHeader: <Data extends object, Value>(
    props: PublicProps<Parameters<typeof gridHeader.DataGridColumnHeader<Data, Value>>[0]>
) => ReturnType<typeof gridHeader.DataGridColumnHeader> = gridHeader.DataGridColumnHeader;

export const DataGridPagination: PublicComponent<typeof gridPagination.DataGridPagination> =
    gridPagination.DataGridPagination;
export const DataGridScrollArea: PublicComponent<typeof gridScroll.DataGridScrollArea> = gridScroll.DataGridScrollArea;
