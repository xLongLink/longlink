// @vitest-environment happy-dom
import { it, expect } from 'vitest';
import { act, useState } from 'react';
import { withMounted } from '../../render';
import userEvent from '@testing-library/user-event';
import { useTable } from '@/components/longlink/hooks/use-table';
import type { ColumnDef, RowSelectionState, SortingState } from '@/components/longlink/hooks/use-table';
import {
    DataGrid,
    DataGridContainer,
    DataGridTable,
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
                <DataGrid table={table} recordCount={records.length}>
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
                recordCount={records.length}
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
