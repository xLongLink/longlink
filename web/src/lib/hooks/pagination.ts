import { api } from '@/lib/api';
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTablePagination } from '@astryxdesign/core/Table';

const PAGE_SIZE = 25;

type Page<T> = {
    items: T[];
    total: number;
};

type PageSchema<T> = {
    parse: (value: unknown) => Page<T>;
};

/** Fetches and paginates one administrator table through its API endpoint. */
export function usePaginate<T extends Record<string, unknown>>(
    path: string,
    schema: PageSchema<T>,
    refetchInterval?: number
) {
    const [page, setPage] = useState(1);
    const query = useQuery({
        queryKey: ['api', path, page, PAGE_SIZE],
        queryFn: async ({ signal }) =>
            schema.parse(await api(`${path}?page=${page}&page_size=${PAGE_SIZE}`, { signal }).json()),
        refetchInterval,
    });
    const items = query.data?.items ?? [];
    const total = query.data?.total ?? 0;
    const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE));

    useEffect(() => {
        if (page > lastPage) {
            setPage(lastPage);
        }
    }, [lastPage, page]);

    const pagination = useTablePagination<T>({
        page,
        onPageChange: setPage,
        totalItems: total,
        pageSize: PAGE_SIZE,
        label: 'Previous / Next',
        size: 'sm',
    });

    return {
        ...query,
        items,
        pagination,
        total,
    };
}
