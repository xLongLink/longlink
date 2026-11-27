import { useDeferredValue, useState } from 'react';
import type { OnChangeFn, PaginationState } from '@tanstack/react-table';

export function useFilters() {
    const [filters, setFilters] = useState({ search: '', pageIndex: 0 });
    const { search, pageIndex } = useDeferredValue(filters);
    const suffix = `?page=${pageIndex + 1}&page_size=25&search=${encodeURIComponent(search.trim())}`;

    const setSearch = (search: string) => {
        setFilters({ search, pageIndex: 0 });
    };

    const setPagination: OnChangeFn<PaginationState> = (updater) => {
        setFilters((current) => ({
            ...current,
            pageIndex:
                typeof updater === 'function'
                    ? updater({ pageIndex: current.pageIndex, pageSize: 25 }).pageIndex
                    : updater.pageIndex
        }));
    };

    return {
        search: filters.search,
        pagination: { pageIndex: filters.pageIndex, pageSize: 25 },
        suffix,
        setSearch,
        setPagination
    };
}
