import { useState } from 'react';
import { paginateData, useTablePagination } from '@astryxdesign/core/Table';

const PAGE_SIZE = 25;

/** Provides client-side pagination for tables. */
export function usePaginate<T extends Record<string, unknown>>(items: T[]) {
    const [page, setPage] = useState(1);
    const currentPage = Math.min(page, Math.max(1, Math.ceil(items.length / PAGE_SIZE)));

    const pagination = useTablePagination<T>({
        page: currentPage,
        onPageChange: setPage,
        totalItems: items.length,
        pageSize: PAGE_SIZE,
        label: 'Previous / Next',
        size: 'sm',
    });

    return {
        pageItems: paginateData(items, currentPage, PAGE_SIZE),
        pagination,
    };
}
