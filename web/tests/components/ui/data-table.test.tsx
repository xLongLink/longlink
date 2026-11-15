// @vitest-environment happy-dom
import { act, useState } from 'react';
import { it, expect, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { renderStatic, withMounted } from '../../render';
import type { TableColumn } from '@/components/custom/table';
import { ActionButton } from '@/components/custom/action-button';
import { ControlSizeContext } from '@/components/custom/contexts';
import { DataTable, pixel, proportional } from '@/components/custom/data-table';

it('renders every supplied row and safely formats automatically generated cells', () => {
    // A renderer migration must not paginate results implicitly or stringify structured values.
    const output = renderStatic(
        <DataTable
            data={Array.from({ length: 15 }, (_, index) => ({
                name: `Shipment ${index + 1}`,
                active: false,
                received: new Date('2026-10-13T14:30:00Z'),
                details: { secret: 'not a display value' }
            }))}
        />
    );

    expect(output.querySelectorAll('tbody tr')).toHaveLength(15);
    expect(output.querySelector('thead')?.textContent).toContain('Name');
    expect(output.querySelector('tbody tr:last-child')?.textContent).toBe('Shipment 15false2026-10-13T14:30:00.000Z');
    expect(output.textContent).not.toContain('not a display value');
    expect(output.textContent).not.toContain('[object Object]');
});

it('preserves the public width factory shapes and defaults', () => {
    // Width objects are consumed by authored Views and must remain compatible across runtime upgrades.
    expect(proportional()).toEqual({ type: 'proportional', value: 1, minWidth: 120 });
    expect(proportional(3, { minWidth: 0 })).toEqual({ type: 'proportional', value: 3, minWidth: 0 });
    expect(pixel(92)).toEqual({ type: 'pixel', value: 92 });
});

it('removes stale rows on empty results and recovers when data arrives again', async () => {
    const user = userEvent.setup();

    function Results() {
        const [empty, setEmpty] = useState(false);

        return (
            <>
                <button type="button" onClick={() => setEmpty(!empty)}>
                    Toggle results
                </button>
                <DataTable data={empty ? [] : [{ name: 'Inbound shipment' }]} />
            </>
        );
    }

    await withMounted(<Results />, async (output) => {
        const toggle = output.querySelector<HTMLButtonElement>('button');

        if (!toggle) throw new Error('Expected results toggle');

        expect(output.querySelector('tbody')?.textContent).toBe('Inbound shipment');
        await act(async () => user.click(toggle));
        expect(output.querySelector('tbody [role="status"]')?.textContent).toBe('No data');
        expect(output.querySelector('table')?.textContent).not.toContain('Inbound shipment');
        expect(output.querySelector('thead')).toBeNull();
        await act(async () => user.click(toggle));
        expect(output.querySelector('tbody')?.textContent).toBe('Inbound shipment');
        expect(output.querySelector('thead th')?.textContent).toBe('Name');
        expect(output.querySelector('tbody [role="status"]')).toBeNull();
    });
});

it('keeps fixed widths and flexible ratios readable on a narrow table', () => {
    const output = renderStatic(
        <DataTable
            data={[{ action: 'Open', reference: 'PO-871', owner: 'Mira', description: 'Replacement filter' }]}
            columns={[
                { key: 'action', width: pixel(80) },
                { key: 'reference', width: proportional() },
                { key: 'owner' },
                { key: 'description', width: proportional(2, { minWidth: 240 }) }
            ]}
        />
    );

    // The flexible floor is 480px: a 1:1:2 split must leave 240px for the last column.
    expect(output.querySelector('table')?.parentElement?.parentElement?.style.minWidth).toBe('560px');
    const widths = Array.from(output.querySelectorAll('col'), (column) => column.style.width);
    expect(widths.slice(0, 4)).toEqual(['80px', '120px', '120px', '240px']);
});

it('makes an overflowing read-only table reachable between surrounding keyboard controls', async () => {
    const user = userEvent.setup();

    await withMounted(
        <>
            <button type="button">Before table</button>
            <DataTable data={[{ reference: 'PO-871' }]} columns={[{ key: 'reference', width: pixel(600) }]} />
            <button type="button">After table</button>
        </>,
        async (output) => {
            const viewport = output.querySelector<HTMLElement>('[data-slot="scroll-area-viewport"]');
            const buttons = output.querySelectorAll('button');

            if (!viewport) throw new Error('Expected the table scroll viewport');

            // Happy DOM has no layout; keep Base UI's measurement and focus mechanism real.
            Object.defineProperties(viewport, {
                clientWidth: { value: 320 },
                scrollWidth: { value: 600 },
                clientHeight: { value: 64 },
                scrollHeight: { value: 64 }
            });
            await act(async () => viewport.dispatchEvent(new Event('scroll')));
            expect(viewport.tabIndex).toBe(0);
            await act(async () => user.tab());
            expect(document.activeElement).toBe(buttons[0]);
            await act(async () => user.tab());
            expect(document.activeElement).toBe(viewport);
            await act(async () => user.tab());
            expect(document.activeElement).toBe(buttons[1]);
        }
    );
});

it('skips a fitting table and preserves focus when an overflowing table becomes smaller', async () => {
    const user = userEvent.setup();

    await withMounted(
        <>
            <button type="button">Before table</button>
            <DataTable data={[{ reference: 'PO-871' }]} />
            <button type="button">After table</button>
        </>,
        async (output) => {
            const viewport = output.querySelector<HTMLElement>('[data-slot="scroll-area-viewport"]');
            const buttons = output.querySelectorAll('button');

            if (!viewport) throw new Error('Expected the table scroll viewport');

            let contentWidth = 320;

            // Deliver changed browser measurements through the real ScrollArea scroll handler.
            Object.defineProperties(viewport, {
                clientWidth: { value: 320 },
                scrollWidth: { get: () => contentWidth },
                clientHeight: { value: 64 },
                scrollHeight: { value: 64 }
            });
            await act(async () => viewport.dispatchEvent(new Event('scroll')));
            expect(viewport.tabIndex).toBe(-1);
            await act(async () => user.tab());
            expect(document.activeElement).toBe(buttons[0]);
            await act(async () => user.tab());
            expect(document.activeElement).toBe(buttons[1]);

            contentWidth = 960;
            await act(async () => viewport.dispatchEvent(new Event('scroll')));
            expect(viewport.tabIndex).toBe(0);
            await act(async () => user.tab({ shift: true }));
            expect(document.activeElement).toBe(viewport);

            contentWidth = 320;
            await act(async () => viewport.dispatchEvent(new Event('scroll')));
            expect(viewport.tabIndex).toBe(-1);
            expect(document.activeElement).toBe(viewport);
            expect(output.querySelector('[data-slot="scroll-area-viewport"]')).toBe(viewport);
            await act(async () => user.tab());
            expect(document.activeElement).toBe(buttons[1]);
        }
    );
});

it('updates View cell permissions with unchanged data and actions after replacing data', async () => {
    const selected = vi.fn();
    const user = userEvent.setup();
    const originalRows = [{ id: 'shipment', name: 'Original' }];
    const replacementRows = [{ id: 'shipment', name: 'Replacement' }];

    function Results() {
        const [replaced, setReplaced] = useState(false);
        const [permitted, setPermitted] = useState(true);

        return (
            <>
                <button type="button" onClick={() => setReplaced(true)}>
                    Refresh
                </button>
                <button type="button" onClick={() => setPermitted(!permitted)}>
                    Toggle permission
                </button>
                <DataTable
                    data={replaced ? replacementRows : originalRows}
                    columns={[
                        {
                            key: 'name',
                            header: replaced ? 'Updated shipment' : 'Shipment',
                            renderCell: (row) => (
                                <button
                                    type="button"
                                    disabled={!permitted}
                                    onClick={() => selected(row.name, permitted)}
                                >
                                    Open {row.name}
                                </button>
                            )
                        }
                    ]}
                />
            </>
        );
    }

    await withMounted(<Results />, async (output) => {
        const original = output.querySelector<HTMLButtonElement>('td button');
        const refresh = output.querySelector<HTMLButtonElement>('button');
        const permission = output.querySelectorAll('button')[1];

        if (!original || !refresh || !permission) throw new Error('Expected View cell and refresh actions');

        await act(async () => user.click(original));
        expect(selected).toHaveBeenLastCalledWith('Original', true);
        await act(async () => user.click(permission));
        expect(output.querySelector('td button')).toBe(original);
        expect(original.disabled).toBe(true);
        await act(async () => user.click(original));
        expect(selected).toHaveBeenCalledTimes(1);
        await act(async () => user.click(permission));
        expect(original.disabled).toBe(false);
        await act(async () => user.click(refresh));
        const replacement = output.querySelector<HTMLButtonElement>('td button');

        if (!replacement) throw new Error('Expected replacement cell action');

        expect(output.querySelector('thead')?.textContent).toBe('Updated shipment');
        expect(replacement.textContent).toBe('Open Replacement');
        await act(async () => user.click(replacement));
        expect(selected).toHaveBeenLastCalledWith('Replacement', true);
        expect(output.textContent).not.toContain('Original');
    });
});

it('keeps native row-local edits attached to domain identities through reordering', async () => {
    const user = userEvent.setup();

    function Results() {
        const [reversed, setReversed] = useState(false);

        const rows = [
            { id: 'north', name: 'North shipment' },
            { id: 'south', name: 'South shipment' }
        ];

        return (
            <>
                <button type="button" onClick={() => setReversed(!reversed)}>
                    Reverse shipments
                </button>
                <DataTable
                    idKey="id"
                    data={reversed ? [...rows].reverse() : rows}
                    columns={[
                        { key: 'name' },
                        { key: 'action', renderCell: (row) => <RowSelection name={row.name} /> }
                    ]}
                />
            </>
        );
    }

    await withMounted(<Results />, async (output) => {
        const north = output.querySelector<HTMLInputElement>('[aria-label="Select North shipment"]');
        const reverse = output.querySelector<HTMLButtonElement>('button');

        if (!north || !reverse) throw new Error('Expected shipment controls');

        await act(async () => user.click(north));
        expect(north.checked).toBe(true);
        await act(async () => user.click(reverse));
        expect(output.querySelector('tbody tr:first-child')?.textContent).toContain('South shipment');
        expect(output.querySelector<HTMLInputElement>('[aria-label="Select North shipment"]')?.checked).toBe(true);
        expect(output.querySelector<HTMLInputElement>('[aria-label="Select South shipment"]')?.checked).toBe(false);
        expect(output.querySelector('[aria-label="Select North shipment"]')).toBe(north);
    });
});

it('retains inherited and explicit control sizes without forcing compact cells to small', async () => {
    const user = userEvent.setup();

    const columns: TableColumn<{ name: string }>[] = [
        { key: 'inherited', renderCell: (row) => <ActionButton variant="outline">{row.name}</ActionButton> },
        {
            key: 'explicit',
            renderCell: () => (
                <ActionButton variant="outline" size="sm">
                    Explicit size
                </ActionButton>
            )
        }
    ];

    function Results() {
        const [size, setSize] = useState<'sm' | 'lg'>('sm');

        return (
            <>
                <button type="button" onClick={() => setSize('lg')}>
                    Enlarge controls
                </button>
                <DataTable data={[{ name: 'Default action' }]} columns={columns} />
                <ControlSizeContext value={size}>
                    <DataTable data={[{ name: 'Inherited action' }]} columns={columns} />
                </ControlSizeContext>
            </>
        );
    }

    await withMounted(<Results />, async (output) => {
        const enlarge = output.querySelector<HTMLButtonElement>('button');
        const tables = output.querySelectorAll('table');

        if (!enlarge || !tables[0] || !tables[1]) throw new Error('Expected both table size boundaries');

        expect(tables[0].querySelector('td button')?.getAttribute('data-size')).toBe('default');
        expect(tables[1].querySelector('td button')?.getAttribute('data-size')).toBe('sm');
        await act(async () => user.click(enlarge));
        expect(tables[1].querySelector('td button')?.getAttribute('data-size')).toBe('lg');
        expect(tables[1].querySelector('td:last-child button')?.getAttribute('data-size')).toBe('sm');
        expect(tables[0].querySelector('td button')?.getAttribute('data-size')).toBe('default');
    });
});

function RowSelection({ name }: { name: string }) {
    const [checked, setChecked] = useState(false);

    return (
        <input
            aria-label={`Select ${name}`}
            type="checkbox"
            checked={checked}
            onChange={(event) => setChecked(event.target.checked)}
        />
    );
}

it('sorts numeric values through the registry controls and accepts a caller-owned reset', async () => {
    const user = userEvent.setup();

    function Results() {
        const [sorting, setSorting] = useState<{ id: string; desc: boolean }[]>([]);

        return (
            <>
                <button type="button" onClick={() => setSorting([])}>
                    Reset order
                </button>
                <DataTable
                    data={[
                        { name: 'Pallet', price: 10 },
                        { name: 'Crate', price: 2 }
                    ]}
                    columns={[{ key: 'name' }, { key: 'price', header: 'Price', sortable: true }]}
                    sorting={sorting}
                    onSortingChange={setSorting}
                />
            </>
        );
    }

    await withMounted(<Results />, async (output) => {
        const sort = output.querySelector<HTMLButtonElement>('thead button');
        const reset = output.querySelector<HTMLButtonElement>('button');

        if (!sort || !reset) throw new Error('Expected sorting controls');

        await act(async () => user.click(sort));
        expect(output.querySelector('tbody tr')?.textContent).toBe('Crate2');
        await act(async () => user.click(reset));
        expect(output.querySelector('tbody tr')?.textContent).toBe('Pallet10');
    });
});

it('keeps selected domain IDs stable when data is reordered', async () => {
    const user = userEvent.setup();
    const changed = vi.fn();

    const rows = [
        { id: 'north', name: 'North' },
        { id: 'south', name: 'South' }
    ];

    function Results() {
        const [reversed, setReversed] = useState(false);

        return (
            <>
                <button type="button" onClick={() => setReversed(!reversed)}>
                    Reverse rows
                </button>
                <DataTable
                    data={reversed ? [...rows].reverse() : rows}
                    columns={[{ key: 'name' }]}
                    idKey="id"
                    enableRowSelection
                    onRowSelectionChange={changed}
                />
            </>
        );
    }

    await withMounted(<Results />, async (output) => {
        const north = output.querySelector<HTMLElement>('tbody [aria-label="Select row"]');
        const reverse = output.querySelector<HTMLButtonElement>('button');

        if (!north || !reverse) throw new Error('Expected selection and reorder controls');

        await act(async () => user.click(north));
        expect(changed).toHaveBeenLastCalledWith({ north: true });
        await act(async () => user.click(reverse));
        const reordered = output.querySelectorAll('tbody tr');
        expect(reordered[0].textContent).toBe('South');
        expect(reordered[0].querySelector('[aria-label="Select row"]')?.getAttribute('aria-checked')).toBe('false');
        expect(reordered[1].querySelector('[aria-label="Select row"]')?.getAttribute('aria-checked')).toBe('true');
    });
});

it('allows empty-state recovery without retaining stale rows', async () => {
    const user = userEvent.setup();

    function Results() {
        const [rows, setRows] = useState<{ name: string }[]>([]);

        return (
            <DataTable
                data={rows}
                emptyMessage={
                    <button type="button" onClick={() => setRows([{ name: 'Recovered shipment' }])}>
                        Retry shipments
                    </button>
                }
            />
        );
    }

    await withMounted(<Results />, async (output) => {
        const retry = output.querySelector<HTMLButtonElement>('tbody button');

        if (!retry) throw new Error('Expected caller-owned recovery action');

        expect(output.textContent).not.toContain('No data');
        await act(async () => user.click(retry));
        expect(output.querySelector('tbody')?.textContent).toBe('Recovered shipment');
        expect(output.querySelector('tbody button')).toBeNull();
    });
});
