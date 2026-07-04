import { CodeBlock } from '@/components/CodeBlock';
import { DataTable } from '@/components/DataTable';
import LogsDialog from '@/components/dialogs/LogsDialog';
import { RegistryDialogShell, RegistryLocationField } from '@/components/dialogs/RegistryDialogElements';
import type { ColumnDef } from '@tanstack/react-table';
import { describe, expect, it } from 'bun:test';
import { createElement } from 'react';
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

    it('renders syntax-highlighted code blocks with copy controls', () => {
        const output = renderToStaticMarkup(
            createElement(CodeBlock, { language: 'xml', children: '  <H1 i18n="pages.title" />  ' })
        );

        expect(output).toContain('Copy code');
        expect(output).toContain('H1');
        expect(output).toContain('pages.title');
    });

    it('renders the logs trigger unless explicitly suppressed', () => {
        const triggerOutput = renderToStaticMarkup(
            createElement(LogsDialog, {
                applicationId: 'app-1',
                applicationName: 'Inventory',
            })
        );
        const suppressedOutput = renderToStaticMarkup(
            createElement(LogsDialog, {
                applicationId: 'app-1',
                applicationName: 'Inventory',
                trigger: null,
            })
        );

        expect(triggerOutput).toContain('Logs');
        expect(suppressedOutput).toBe('');
    });

    it('renders the registry dialog trigger and shared location selector', () => {
        const shellOutput = renderToStaticMarkup(
            createElement(
                RegistryDialogShell,
                {
                    title: 'Connect database',
                    description: 'Register a database backend.',
                    open: true,
                    children: null,
                    error: 'Connection failed',
                    canSubmit: false,
                    isPending: false,
                    pendingLabel: 'Connecting...',
                    onSubmit: async () => undefined,
                    onOpenChange: () => undefined,
                },
                null
            )
        );
        const locationOutput = renderToStaticMarkup(
            createElement(RegistryLocationField, {
                id: 'location',
                value: 'location-1',
                locations: [{ id: 'location-1', name: 'Zurich', slug: 'zurich', country: 'CH' }],
                onValueChange: () => undefined,
            })
        );

        expect(shellOutput).toContain('Connect');
        expect(locationOutput).toContain('Location');
        expect(locationOutput).toContain('Zurich');
    });
});
