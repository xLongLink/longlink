// @vitest-environment happy-dom
import { act, useState } from 'react';
import { it, expect, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { renderStatic, withMounted } from '../../render';
import type { TableColumn } from '@/components/custom/table';
import { ActionButton } from '@/components/custom/action-button';
import { ControlSizeContext } from '@/components/custom/contexts';
import { DataTable, pixel, proportional } from '@/components/custom/data-table';

it('renders domain rows without inventing table actions', () => {
    // Act
    const output = renderStatic(
        <DataTable data={[{ id: '1', name: 'Acme' }]} columns={[{ key: 'name', header: 'Customer' }]} />
    );

    // Assert
    expect(output.querySelector('table')?.textContent).toContain('Customer');
    expect(output.querySelector('table')?.textContent).toContain('Acme');
});

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
        expect(output.querySelector('tbody h3')?.textContent).toBe('No data');
        expect(output.querySelector('table')?.textContent).not.toContain('Inbound shipment');
        expect(output.querySelector('thead')).toBeNull();
        await act(async () => user.click(toggle));
        expect(output.querySelector('tbody')?.textContent).toBe('Inbound shipment');
        expect(output.querySelector('thead th')?.textContent).toBe('Name');
        expect(output.querySelector('tbody h3')).toBeNull();
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
    expect(output.querySelector('table')?.style.minWidth).toBe('560px');
    const widths = Array.from(output.querySelectorAll('col'), (column) => column.style.width);
    expect(widths).toEqual([
        '80px',
        'calc((100% - 80px) * 0.25)',
        'calc((100% - 80px) * 0.25)',
        'calc((100% - 80px) * 0.5)'
    ]);
});

it('makes a wide read-only table a named keyboard tab target without hiding native scrollbars', async () => {
    const user = userEvent.setup();

    await withMounted(
        <>
            <button type="button">Before table</button>
            <DataTable data={[{ reference: 'PO-871' }]} columns={[{ key: 'reference', width: pixel(600) }]} />
            <button type="button">After table</button>
        </>,
        async (output) => {
            const viewport = output.querySelector<HTMLElement>('[data-slot="data-grid-table-viewport"]');
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
            expect(viewport.getAttribute('role')).toBe('group');
            expect(viewport.getAttribute('aria-label')).toBe('Table');
            expect(viewport.tabIndex).toBe(0);
            expect(getComputedStyle(viewport).getPropertyValue('scrollbar-width')).not.toBe('none');
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
            const viewport = output.querySelector<HTMLElement>('[data-slot="data-grid-table-viewport"]');
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
            expect(getComputedStyle(viewport).overflow).toBe('auto');
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
            expect(output.querySelector('[data-slot="data-grid-table-viewport"]')).toBe(viewport);
            await act(async () => user.tab());
            expect(document.activeElement).toBe(buttons[1]);
        }
    );
});

it('runs real View cell actions against replacement data and column definitions', async () => {
    const selected = vi.fn();
    const user = userEvent.setup();

    function Results() {
        const [replaced, setReplaced] = useState(false);

        return (
            <>
                <button type="button" onClick={() => setReplaced(true)}>
                    Refresh
                </button>
                <DataTable
                    data={[{ id: 'shipment', name: replaced ? 'Replacement' : 'Original' }]}
                    columns={[
                        {
                            key: 'name',
                            header: replaced ? 'Updated shipment' : 'Shipment',
                            renderCell: (row) => (
                                <button type="button" onClick={() => selected(row.name)}>
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

        if (!original || !refresh) throw new Error('Expected View cell and refresh actions');

        await act(async () => user.click(original));
        expect(selected).toHaveBeenLastCalledWith('Original');
        await act(async () => user.click(refresh));
        const replacement = output.querySelector<HTMLButtonElement>('td button');

        if (!replacement) throw new Error('Expected replacement cell action');

        expect(output.querySelector('thead')?.textContent).toBe('Updated shipment');
        expect(replacement.textContent).toBe('Open Replacement');
        await act(async () => user.click(replacement));
        expect(selected).toHaveBeenLastCalledWith('Replacement');
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
