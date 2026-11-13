// @vitest-environment happy-dom
import { expect, it } from 'vitest';
import { withMounted } from '../../render';
import { act, createRef, useState } from 'react';
import userEvent from '@testing-library/user-event';
import {
    Table,
    TableBody,
    TableCaption,
    TableCell,
    TableFooter,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/Table';

it('preserves native element props, refs, and row actions in a composed table', async () => {
    const user = userEvent.setup();
    const table = createRef<HTMLTableElement>();

    function Orders() {
        const [selected, setSelected] = useState(false);

        return (
            <Table ref={table} aria-label="Orders">
                <TableCaption>Current orders</TableCaption>
                <TableHeader>
                    <TableRow>
                        <TableHead scope="col">Order</TableHead>
                        <TableHead scope="col">Status</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    <TableRow aria-selected={selected}>
                        <TableCell>
                            <button type="button" onClick={() => setSelected(!selected)}>
                                Select PO-871
                            </button>
                        </TableCell>
                        <TableCell>{selected ? 'Selected' : 'Open'}</TableCell>
                    </TableRow>
                </TableBody>
                <TableFooter>
                    <TableRow>
                        <TableCell colSpan={2}>{selected ? '1 selected' : 'None selected'}</TableCell>
                    </TableRow>
                </TableFooter>
            </Table>
        );
    }

    await withMounted(<Orders />, async (output) => {
        const select = output.querySelector<HTMLButtonElement>('tbody button');

        if (!select) throw new Error('Expected order selection');

        expect(table.current).toBe(output.querySelector('table'));
        expect(table.current?.getAttribute('aria-label')).toBe('Orders');
        expect(output.querySelector('caption')?.textContent).toBe('Current orders');
        expect(output.querySelector('th')?.scope).toBe('col');
        expect(output.querySelector('tfoot td')?.getAttribute('colspan')).toBe('2');
        expect(output.querySelector('tbody tr')?.getAttribute('aria-selected')).toBe('false');

        await act(async () => user.click(select));

        expect(output.querySelector('tbody tr')?.getAttribute('aria-selected')).toBe('true');
        expect(output.querySelector('tbody td:last-child')?.textContent).toBe('Selected');
        expect(output.querySelector('tfoot td')?.textContent).toBe('1 selected');
    });
});
