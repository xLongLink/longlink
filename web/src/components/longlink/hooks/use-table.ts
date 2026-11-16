import type { PublicProps } from '../props';
import * as dataGrid from '@/components/reui/data-grid/data-grid';

export { useTable } from '@tanstack/react-table';

export type { ColumnDef, CellContext, RowSelectionState, SortingState } from '@tanstack/react-table';

export const dataGridFeatures: Omit<dataGrid.DataGridFeatures, 'columnMeta'> & {
    columnMeta: PublicProps<dataGrid.DataGridFeatures['columnMeta']>;
} = dataGrid.dataGridFeatures;

export type DataGridFeatures = typeof dataGridFeatures;
