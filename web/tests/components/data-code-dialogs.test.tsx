import { DataTable } from '@/components/DataTable';
import type { ColumnDef } from '@tanstack/react-table';
import { describe, expect, it } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';

type Row = {
    name: string;
};

const columns: Array<ColumnDef<Row>> = [
    {
        accessorKey: 'name',
        header: 'Name',
        meta: { className: 'w-24' },
    },
];

describe('shared data, code, and dialog components', () => {
    it('renders data table rows, empty states, errors, and column classes', () => {
        const rowOutput = renderToStaticMarkup(<DataTable<Row, unknown> columns={columns} data={[{ name: 'Acme' }]} />);
        const emptyOutput = renderToStaticMarkup(
            <DataTable<Row, unknown> columns={columns} data={[]} emptyMessage="No organizations yet." />
        );
        const errorOutput = renderToStaticMarkup(
            <DataTable<Row, unknown> columns={columns} data={[]} error={new Error('Failed to load')} />
        );
        const loadingOutput = renderToStaticMarkup(<DataTable<Row, unknown> columns={columns} data={[]} isLoading />);

        expect(rowOutput).toContain('Acme');
        expect(rowOutput).toContain('w-24');
        expect(emptyOutput).toContain('No organizations yet.');
        expect(errorOutput).toContain('Failed to load');
        expect(loadingOutput).toBe('');
    });
});
