import { useState, type ReactNode } from 'react';
import { Banner } from '@astryxdesign/core/Banner';
import { VStack } from '@astryxdesign/core/VStack';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { Pagination } from '@astryxdesign/core/Pagination';
import { Table, type TableColumn } from '@astryxdesign/core/Table';
import { useTranslation } from '@/lib/i18n';

export type DataTableColumn<T extends object> = Pick<
    TableColumn<Record<string, unknown>>,
    'align' | 'header' | 'key' | 'width'
> & {
    renderCell: (item: T) => ReactNode;
};

interface DataTableProps<TData extends object> {
    columns: DataTableColumn<TData>[];
    data: TData[];
    emptyMessage?: string;
    error?: Error | null;
    isLoading?: boolean;
    pageSize?: number;
}

type DataTableRow<T extends object> = Record<string, unknown> & {
    id: number;
    value: T;
};

/** Renders an Astryx data table with LongLink loading, error, empty, and pagination behavior. */
export function DataTable<TData extends object>({
    columns,
    data,
    emptyMessage,
    error = null,
    isLoading = false,
    pageSize,
}: DataTableProps<TData>) {
    const { t } = useTranslation();
    const [currentPage, setCurrentPage] = useState(1);
    const pageCount = pageSize ? Math.max(1, Math.ceil(data.length / pageSize)) : 1;
    const safeCurrentPage = Math.min(currentPage, pageCount);
    const paginatedData = pageSize ? data.slice((safeCurrentPage - 1) * pageSize, safeCurrentPage * pageSize) : data;
    const rows: DataTableRow<TData>[] = paginatedData.map((value, index) => ({
        id: (safeCurrentPage - 1) * (pageSize ?? data.length) + index,
        value,
    }));
    const tableColumns: TableColumn<DataTableRow<TData>>[] = columns.map((column) => ({
        ...column,
        renderCell: (row) => column.renderCell(row.value),
    }));
    const resolvedEmptyMessage = emptyMessage ?? t('common.noResults');

    // Avoid showing an empty table while initial data loads.
    if (isLoading && data.length === 0) {
        return null;
    }

    // Surface errors when there is no data to show.
    if (error && data.length === 0) {
        return <Banner status="error" title={error.message} />;
    }

    return (
        <VStack gap={3} width="100%">
            <Table
                columns={tableColumns}
                data={rows}
                density="compact"
                emptyState={<EmptyState title={resolvedEmptyMessage} isCompact />}
                hasHover
                idKey="id"
            />
            {pageSize && pageCount > 1 ? (
                <Pagination
                    label={`${t('actions.previous')} / ${t('actions.next')}`}
                    onChange={setCurrentPage}
                    page={safeCurrentPage}
                    pageSize={pageSize}
                    size="sm"
                    totalItems={data.length}
                />
            ) : null}
        </VStack>
    );
}
