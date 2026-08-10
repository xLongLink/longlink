import { useTranslator } from '@astryxdesign/core/i18n';
import { paginateData, useTablePagination } from '@astryxdesign/core/Table';
import { useState } from 'react';

const PAGE_SIZE = 25;

/** Provides consistent client-side pagination for Platform admin tables. */
export function useAdminPagination<T extends Record<string, unknown>>(
    items: T[],
    controls: 'compact' | 'default' = 'compact'
) {
    const t = useTranslator();
    const [page, setPage] = useState(1);
    const currentPage = Math.min(page, Math.max(1, Math.ceil(items.length / PAGE_SIZE)));

    const pagination = useTablePagination<T>({
        page: currentPage,
        onPageChange: setPage,
        totalItems: items.length,
        pageSize: PAGE_SIZE,
        ...(controls === 'compact'
            ? {
                  label: `${t('actions.previous')} / ${t('actions.next')}`,
                  size: 'sm' as const,
              }
            : {}),
    });

    return {
        pageItems: paginateData(items, currentPage, PAGE_SIZE),
        pagination,
    };
}
