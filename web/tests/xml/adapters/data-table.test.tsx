import { parseXML } from '@xml/core/parser';
import type { ExecutionContext } from '@xml/types';
import { describe, expect, it } from 'bun:test';
import { renderXmlToMarkup } from '../helpers';

describe('DataTable', () => {
    /* The compiler should preserve the data table column structure. */
    it('preserves data table columns in compiled xml', () => {
        expect(
            parseXML(
                '<DataTable data="$items" as="item"><DataColumn field="sku" header="SKU" /><DataColumn><DataHeader i18n="Item" /><DataCell value="$item.name" /></DataColumn></DataTable>'
            )
        ).toEqual([
            {
                name: 'DataTable',
                params: { data: '$items', as: 'item' },
                children: [
                    { name: 'DataColumn', params: { field: 'sku', header: 'SKU' }, children: [] },
                    {
                        name: 'DataColumn',
                        children: [
                            { name: 'DataHeader', params: { i18n: 'Item' }, children: [] },
                            { name: 'DataCell', params: { value: '$item.name' }, children: [] },
                        ],
                    },
                ],
            },
        ]);
    });

    /* Shorthand columns should render field values through the shared data table shell. */
    it('renders shorthand field columns', () => {
        const ctx: ExecutionContext = {
            setups: {},
            invalidate: async () => {},
            values: {
                items: [{ sku: 'SKU-001', quantity: 10, created_by: { name: 'Ada Lovelace' } }],
            },
        };
        const output = renderXmlToMarkup(
            parseXML(
                '<DataTable data="$items" as="item"><DataColumn field="sku" header="SKU" /><DataColumn field="created_by.name" header="Created by" /></DataTable>'
            ),
            ctx
        );

        expect(output).toContain('data-slot="table-container"');
        expect(output).toContain('bg-muted/50');
        expect(output).toContain('SKU');
        expect(output).toContain('SKU-001');
        expect(output).toContain('Created by');
        expect(output).toContain('Ada Lovelace');
    });

    /* Headers and cells should accept rich nested XML content. */
    it('renders rich header and cell slots', () => {
        const ctx: ExecutionContext = {
            setups: {},
            invalidate: async () => {},
            translations: { inventory: { item: 'Item', sku: 'SKU' } },
            values: {
                items: [{ sku: 'SKU-001', name: 'Warehouse Widget' }],
            },
        };
        const output = renderXmlToMarkup(
            parseXML(
                '<DataTable data="$items" as="item"><DataColumn><DataHeader><Flex><P i18n="inventory.item" /><Badge variant="outline" i18n="inventory.sku" /></Flex></DataHeader><DataCell><Flex><P value="$item.name" /><Badge variant="outline" value="$item.sku" /></Flex></DataCell></DataColumn></DataTable>'
            ),
            ctx
        );

        expect(output).toContain('Item');
        expect(output).toContain('SKU');
        expect(output).toContain('Warehouse Widget');
        expect(output).toContain('SKU-001');
        expect(output).toContain('data-slot="badge"');
    });

    /* Empty tables should use the XML-provided empty message. */
    it('renders the configured empty state', () => {
        const ctx: ExecutionContext = {
            setups: {},
            invalidate: async () => {},
            values: { items: [] },
        };
        const output = renderXmlToMarkup(
            parseXML(
                '<DataTable data="$items" as="item" empty="No inventory items yet."><DataColumn field="name" header="Name" /></DataTable>'
            ),
            ctx
        );

        expect(output).toContain('No inventory items yet.');
    });
});
