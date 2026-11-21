// @vitest-environment happy-dom
import { it, expect } from 'vitest';
import { act, useState } from 'react';
import { withMounted } from '../../render';
import userEvent from '@testing-library/user-event';
import { filterFn_includesString } from '@tanstack/react-table';
import { useTable } from '@/components/longlink/hooks/use-table';
import type { ColumnDef, RowSelectionState, SortingState } from '@/components/longlink/hooks/use-table';
import {
    DataGrid,
    DataGridContainer,
    DataGridTable,
    DataGridPagination,
    DataGridColumnHeader,
    DataGridScrollArea,
    DataGridTableRowSelect,
    DataGridTableRowSelectAll,
    dataGridFeatures,
    type DataGridFeatures
} from '@/components/longlink';

type Shipment = { id: string; name: string; price: number };

const columns: ColumnDef<DataGridFeatures, Shipment>[] = [
    {
        id: 'selection',
        header: () => <DataGridTableRowSelectAll />,
        cell: ({ row }) => <DataGridTableRowSelect row={row} />,
        enableSorting: false
    },
    { accessorKey: 'name', header: 'Shipment', enableSorting: false },
    { accessorKey: 'price', header: ({ column }) => <DataGridColumnHeader column={column} title="Price" /> }
];

it('keeps controlled selection on domain IDs through native sorting, refresh and reset', async () => {
    const user = userEvent.setup();

    function Shipments() {
        const [reversed, setReversed] = useState(false);
        const [sorting, setSorting] = useState<SortingState>([]);
        const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

        const records = [
            { id: 'north', name: 'North', price: 10 },
            { id: 'south', name: 'South', price: 2 }
        ];

        const table = useTable({
            features: dataGridFeatures,
            manualPagination: true,
            data: reversed ? [...records].reverse() : records,
            columns,
            getRowId: (row) => row.id,
            enableRowSelection: true,
            state: { sorting, rowSelection },
            onSortingChange: setSorting,
            onRowSelectionChange: setRowSelection
        });

        return (
            <>
                <button type="button" onClick={() => setReversed(!reversed)}>
                    Refresh shipments
                </button>
                <button type="button" onClick={() => setSorting([])}>
                    Reset order
                </button>
                <output aria-label="Selected shipments">
                    {Object.keys(rowSelection)
                        .filter((id) => rowSelection[id])
                        .join(',')}
                </output>
                <DataGrid table={table}>
                    <DataGridContainer>
                        <DataGridScrollArea>
                            <DataGridTable />
                        </DataGridScrollArea>
                    </DataGridContainer>
                </DataGrid>
            </>
        );
    }

    await withMounted(<Shipments />, async (output) => {
        const select = output.querySelector<HTMLElement>('tbody [aria-label="Select row"]');
        const sort = output.querySelector<HTMLButtonElement>('thead button');
        const refresh = output.querySelector<HTMLButtonElement>('button');
        const reset = output.querySelectorAll('button')[1];

        if (!select || !sort || !refresh || !reset) throw new Error('Expected shipment controls');

        await act(async () => user.click(select));
        expect(output.querySelector('output')?.textContent).toBe('north');
        await act(async () => user.click(sort));
        expect(output.querySelector('tbody tr')?.textContent).toBe('South2');
        expect(output.querySelector('tbody tr [aria-label="Select row"]')?.getAttribute('aria-checked')).toBe('false');
        expect(
            output.querySelector('tbody tr:last-child [aria-label="Select row"]')?.getAttribute('aria-checked')
        ).toBe('true');
        await act(async () => user.click(reset));
        expect(output.querySelector('tbody tr')?.textContent).toBe('North10');
        await act(async () => user.click(refresh));
        expect(output.querySelector('tbody tr')?.textContent).toBe('South2');
        expect(
            output.querySelector('tbody tr:last-child [aria-label="Select row"]')?.getAttribute('aria-checked')
        ).toBe('true');
        expect(output.querySelector('output')?.textContent).toBe('north');
    });
});

it('uses server totals for pagination while preserving displayed rows and their ARIA bounds', async () => {
    // Arrange
    const user = userEvent.setup();

    function Shipments() {
        const [total, setTotal] = useState(25);
        const table = useTable({
            features: dataGridFeatures,
            data: [
                { id: 'north', name: 'North', price: 10 },
                { id: 'draft', name: 'Draft', price: 2 }
            ],
            columns,
            getRowId: (row) => row.id,
            manualPagination: true,
            rowCount: total,
            initialState: { pagination: { pageIndex: 0, pageSize: 2 }, rowPinning: { top: ['draft'], bottom: [] } }
        });

        return (
            <>
                <button type="button" onClick={() => setTotal(1)}>
                    Update total
                </button>
                <DataGrid table={table} tableLayout={{ cellSelection: true }}>
                    <DataGridTable />
                    <DataGridPagination sizes={[2]} />
                </DataGrid>
            </>
        );
    }

    await withMounted(<Shipments />, async (output) => {
        expect(output.querySelector('table')?.getAttribute('aria-rowcount')).toBe('26');
        expect(output.textContent).toContain('1 - 2 of 25');
        expect(output.querySelectorAll('tbody tr')).toHaveLength(2);
        const next = [...output.querySelectorAll('button')].find((button) => button.textContent === 'Go to next page');
        if (!next) throw new Error('Expected next page control');

        // Act
        await act(async () => user.click(next));

        // Assert
        expect(output.textContent).toContain('3 - 4 of 25');
        expect(output.querySelectorAll('tbody tr')).toHaveLength(2);

        // Act
        const update = output.querySelector<HTMLButtonElement>('button');
        if (!update) throw new Error('Expected total update control');
        await act(async () => user.click(update));

        // Assert
        expect(output.querySelector('table')?.getAttribute('aria-rowcount')).toBe('3');
        expect(output.querySelectorAll('tbody tr')).toHaveLength(2);
        expect([...output.querySelectorAll('button')].some((button) => button.textContent === 'Go to next page')).toBe(
            false
        );
    });
});

it('updates pagination and select-all availability from the filtered row model', async () => {
    // Arrange
    const user = userEvent.setup();

    function Shipments() {
        const table = useTable({
            features: dataGridFeatures,
            data: [
                { id: 'north', name: 'North', price: 10 },
                { id: 'south', name: 'South', price: 2 }
            ],
            columns: columns.map((column) => ({ ...column, filterFn: filterFn_includesString })),
            getRowId: (row) => row.id,
            enableRowSelection: true
        });

        return (
            <>
                <button type="button" onClick={() => table.setColumnFilters([{ id: 'name', value: 'North' }])}>
                    Filter north
                </button>
                <button type="button" onClick={() => table.setColumnFilters([{ id: 'name', value: 'missing' }])}>
                    Filter missing
                </button>
                <DataGrid table={table}>
                    <DataGridTable />
                    <DataGridPagination />
                </DataGrid>
            </>
        );
    }

    await withMounted(<Shipments />, async (output) => {
        expect(output.textContent).toContain('1 - 2 of 2');
        const [north, missing] = output.querySelectorAll<HTMLButtonElement>('button');
        if (!north || !missing) throw new Error('Expected filter controls');

        // Act
        await act(async () => user.click(north));

        // Assert
        expect(output.textContent).toContain('1 - 1 of 1');
        expect(output.querySelectorAll('tbody tr')).toHaveLength(1);
        expect(
            output.querySelector('[role="checkbox"][aria-label="Select all"]')?.getAttribute('aria-disabled')
        ).not.toBe('true');

        // Act
        await act(async () => user.click(missing));

        // Assert
        expect(output.textContent).toContain('0 - 0 of 0');
        expect(output.querySelector('[role="checkbox"][aria-label="Select all"]')?.getAttribute('aria-disabled')).toBe(
            'true'
        );
    });
});

it.each([undefined, 'onEnd', 'onChange'] as const)(
    'previews column resizing according to the table mode %s and commits on release',
    async (columnResizeMode) => {
        // Arrange
        function Shipments() {
            const [visible, setVisible] = useState(true);
            const table = useTable({
                features: dataGridFeatures,
                data: [{ id: 'north', name: 'North', price: 10 }],
                columns: [{ accessorKey: 'name', header: 'Shipment', size: 150 }],
                columnResizeMode
            });

            return (
                <>
                    <button type="button" onClick={() => setVisible(false)}>
                        Remove grid
                    </button>
                    <output>{table.getColumn('name')?.getSize()}</output>
                    {visible && (
                        <DataGrid table={table} tableLayout={{ columnsResizable: true }}>
                            <DataGridTable />
                        </DataGrid>
                    )}
                </>
            );
        }

        await withMounted(<Shipments />, async (output) => {
            const handle = output.querySelector<HTMLElement>('[data-slot="data-grid-table-resize-handle"]');
            const table = output.querySelector('table');
            if (!handle || !table) throw new Error('Expected resizable table');
            const originalCursor = document.body.style.cursor;

            // Act
            await act(async () => {
                handle.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, clientX: 100, button: 0 }));
                document.dispatchEvent(new MouseEvent('mousemove', { clientX: 140 }));
            });

            // Assert
            expect(document.body.style.cursor).toBe('col-resize');
            expect(table.style.getPropertyValue('--col-name-size')).toBe(
                columnResizeMode === 'onChange' ? '190' : '150'
            );
            expect(!!output.querySelector('[data-slot="data-grid-table-resize-indicator"]')).toBe(
                columnResizeMode !== 'onChange'
            );

            // Act
            await act(async () => {
                document.dispatchEvent(new MouseEvent('mouseup', { clientX: 140 }));
            });

            // Assert
            expect(table.style.getPropertyValue('--col-name-size')).toBe('190');
            expect(document.body.style.cursor).toBe(originalCursor);
            await act(async () => {
                document.dispatchEvent(new MouseEvent('mousemove', { clientX: 200 }));
            });
            expect(table.style.getPropertyValue('--col-name-size')).toBe('190');

            // Act
            await act(async () => {
                handle.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, clientX: 100, button: 0 }));
                document.dispatchEvent(new MouseEvent('mousemove', { clientX: 120 }));
                output.querySelector('button')?.click();
            });

            // Assert
            expect(output.querySelector('table')).toBeNull();
            expect(document.body.style.cursor).toBe(originalCursor);
            expect(output.querySelector('output')?.textContent).toBe('210');

            // Act
            await act(async () => {
                document.dispatchEvent(new MouseEvent('mousemove', { clientX: 400 }));
                document.dispatchEvent(new MouseEvent('mouseup', { clientX: 400 }));
            });

            // Assert
            expect(output.querySelector('output')?.textContent).toBe('210');
        });
    }
);

it('renders the whole server page after empty-state recovery without implicit pagination', async () => {
    const user = userEvent.setup();

    function Shipments() {
        const [records, setRecords] = useState<Shipment[]>([]);

        const table = useTable({
            features: dataGridFeatures,
            manualPagination: true,
            data: records,
            columns,
            getRowId: (row) => row.id
        });

        return (
            <DataGrid
                table={table}
                emptyMessage={
                    <button
                        type="button"
                        onClick={() =>
                            setRecords(
                                Array.from({ length: 15 }, (_, index) => ({
                                    id: `shipment-${index + 1}`,
                                    name: `Shipment ${index + 1}`,
                                    price: index + 1
                                }))
                            )
                        }
                    >
                        Retry shipments
                    </button>
                }
            >
                <DataGridContainer>
                    <DataGridScrollArea>
                        <DataGridTable />
                    </DataGridScrollArea>
                </DataGridContainer>
            </DataGrid>
        );
    }

    await withMounted(<Shipments />, async (output) => {
        const retry = output.querySelector<HTMLButtonElement>('tbody button');

        if (!retry) throw new Error('Expected recovery action');

        await act(async () => user.click(retry));
        expect(output.querySelectorAll('tbody tr')).toHaveLength(15);
        expect(output.querySelector('tbody tr:last-child')?.textContent).toBe('Shipment 1515');
        expect(output.textContent).not.toContain('Retry shipments');
    });
});
