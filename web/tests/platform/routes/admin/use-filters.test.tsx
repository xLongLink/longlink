// @vitest-environment happy-dom
import { act } from 'react';
import { it, expect } from 'vitest';
import { withMounted } from '../../../render';
import { useFilters } from '@/platform/routes/admin/use-filters';

function Filters() {
    const { search, pagination, suffix, setSearch, setPagination } = useFilters();

    return (
        <>
            <output>{JSON.stringify({ search, pagination, suffix })}</output>
            <button
                onClick={() => {
                    setPagination({ pageIndex: 2, pageSize: 100 });
                    setPagination((current) => ({ pageIndex: current.pageIndex + current.pageSize, pageSize: 50 }));
                    setPagination((current) => ({ pageIndex: current.pageIndex + current.pageSize, pageSize: 10 }));
                }}
            >
                Next
            </button>
            <button onClick={() => setSearch('  a & b  ')}>Search</button>
        </>
    );
}

it('applies queued pagination updates to current state with a fixed page size and resets pages for search', async () => {
    // Arrange
    await withMounted(<Filters />, async (output) => {
        const [next, search] = output.querySelectorAll('button');

        // Act
        await act(async () => next.click());

        // Assert
        expect(JSON.parse(output.querySelector('output')?.textContent ?? '')).toEqual({
            search: '',
            pagination: { pageIndex: 52, pageSize: 25 },
            suffix: '?page=53&page_size=25&search='
        });

        // Act
        await act(async () => search.click());

        // Assert
        expect(JSON.parse(output.querySelector('output')?.textContent ?? '')).toEqual({
            search: '  a & b  ',
            pagination: { pageIndex: 0, pageSize: 25 },
            suffix: '?page=1&page_size=25&search=a%20%26%20b'
        });
    });
});
