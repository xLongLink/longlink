// @vitest-environment happy-dom
import { act, useState } from 'react';
import { it, expect, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { renderStatic, withMounted } from '../../render';
import { DataPagination } from '@/components/custom/DataPagination';

it('preserves the selected page in its accessible navigation state', () => {
    // Act
    const output = renderStatic(
        <DataPagination page={2} totalItems={75} pageSize={25} onPageChange={() => undefined} />
    );

    // Assert
    expect(output.querySelector('[aria-current="page"]')?.textContent).toContain('2');
});

it('navigates through a large result set without submitting its enclosing form or crossing boundaries', async () => {
    const user = userEvent.setup();
    const submit = vi.fn((event: Event) => event.preventDefault());

    function Results() {
        const [page, setPage] = useState(1);

        return (
            <form>
                <DataPagination page={page} totalItems={1000} pageSize={25} onPageChange={setPage} />
            </form>
        );
    }

    await withMounted(<Results />, async (output) => {
        output.querySelector('form')?.addEventListener('submit', submit);
        const previous = output.querySelector<HTMLButtonElement>('[aria-label="Go to previous page"]');
        const next = output.querySelector<HTMLButtonElement>('[aria-label="Go to next page"]');
        const last = output.querySelector<HTMLButtonElement>('[aria-label="Go to page 40"]');

        if (!previous || !next || !last) throw new Error('Expected pagination controls');
        expect(output.querySelector('[role="status"]')?.textContent).toBe('');
        expect(output.querySelectorAll('button').length).toBeLessThanOrEqual(9);
        await act(async () => user.click(previous));
        expect(output.querySelector('[aria-current]')?.textContent).toBe('1');
        await act(async () => {
            previous.focus();
            await user.keyboard('{Enter}');
        });
        expect(document.activeElement).toBe(previous);
        expect(output.querySelector('[aria-current]')?.textContent).toBe('1');
        await act(async () => user.click(next));
        expect(output.querySelector('[aria-current]')?.textContent).toBe('2');
        expect(output.querySelector('[role="status"]')?.textContent).toBe('Page 2 of 40');
        await act(async () => user.click(last));
        expect(output.querySelector('[aria-current]')?.textContent).toBe('40');
        await act(async () => user.click(next));
        expect(output.querySelector('[aria-current]')?.textContent).toBe('40');
        await act(async () => {
            previous.focus();
            await user.keyboard(' ');
        });
        expect(output.querySelector('[aria-current]')?.textContent).toBe('39');
        expect(submit).not.toHaveBeenCalled();
    });
});

it('keeps middle pages reachable and clamps previous navigation after results shrink', async () => {
    const user = userEvent.setup();
    const selected = vi.fn();

    function Results() {
        const [total, setTotal] = useState(200);

        return (
            <>
                <button onClick={() => setTotal(20)}>Filter results</button>
                <DataPagination page={10} totalItems={total} pageSize={10} onPageChange={selected} />
            </>
        );
    }

    await withMounted(<Results />, async (output) => {
        const adjacent = output.querySelector<HTMLButtonElement>('[aria-label="Go to page 11"]');
        const filter = output.querySelector('button');
        const previous = output.querySelector<HTMLButtonElement>('[aria-label="Go to previous page"]');

        if (!adjacent || !filter || !previous) throw new Error('Expected result controls');
        await act(async () => user.click(adjacent));
        expect(selected).toHaveBeenLastCalledWith(11);
        await act(async () => user.click(filter));
        await act(async () => user.click(previous));
        expect(selected).toHaveBeenLastCalledWith(2);
        expect(output.querySelector('[aria-label="Go to next page"]')?.getAttribute('aria-disabled')).toBe('true');
    });
});

it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])(
    'does not expose phantom pages for an invalid or empty total (%s)',
    (totalItems) => {
        const output = renderStatic(
            <DataPagination page={1} totalItems={totalItems} pageSize={10} onPageChange={() => undefined} />
        );

        expect(output.querySelector('nav')).toBeNull();
    }
);

it.each([0, -2, Number.NaN, Number.POSITIVE_INFINITY])(
    'normalizes an unusable page size (%s) before navigating',
    async (pageSize) => {
        const selected = vi.fn();
        const user = userEvent.setup();

        await withMounted(
            <DataPagination page={1} totalItems={21} pageSize={pageSize} onPageChange={selected} />,
            async (output) => {
                const next = output.querySelector<HTMLButtonElement>('[aria-label="Go to next page"]');

                if (!next) throw new Error('Expected next-page control');
                await act(async () => user.click(next));
                expect(selected).toHaveBeenCalledExactlyOnceWith(2);
            }
        );
    }
);
