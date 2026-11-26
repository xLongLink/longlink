import { useDeferredValue, useState } from 'react';
import type { OnChangeFn, PaginationState } from '@tanstack/react-table';

export function useFilters() {
    const [filters, setFilters] = useState({ search: '', pagination: { pageIndex: 0, pageSize: 25 } });
    const { search, pagination } = useDeferredValue(filters);
    const suffix = `?page=${pagination.pageIndex + 1}&page_size=25&search=${encodeURIComponent(search.trim())}`;

    const setSearch = (search: string) => {
        setFilters({ search, pagination: { pageIndex: 0, pageSize: 25 } });
    };

    const setPagination: OnChangeFn<PaginationState> = (updater) => {
        setFilters((current) => ({
            ...current,
            pagination: typeof updater === 'function' ? updater(current.pagination) : updater
        }));
    };

    return { ...filters, suffix, setSearch, setPagination };
}
