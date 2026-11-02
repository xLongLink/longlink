import { useDeferredValue, useState } from 'react';

const pageSize = 25;

/** Controls admin search and pagination while deferring their request snapshot together. */
export function useAdminList() {
    // Keep input immediate and reset its page before deferring the complete request.
    const [filters, setFilters] = useState({ search: '', page: 1 });
    const { search, page } = useDeferredValue(filters);

    return {
        search: {
            value: filters.search,
            onChange: (search: string) => setFilters({ search, page: 1 }),
        },
        pagination: {
            page,
            pageSize,
            onChange: (page: number) => setFilters({ ...filters, page }),
        },
        suffix: `?page=${page}&page_size=${pageSize}&search=${encodeURIComponent(search.trim())}`,
    };
}
