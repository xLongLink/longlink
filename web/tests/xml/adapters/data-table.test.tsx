import { parseXML } from '@/xml/core/parser';
import type { ExecutionContext } from '@/xml/types';
import { describe, expect, it } from 'bun:test';
import { renderXmlToMarkup } from '../helpers';

describe('DataTable', () => {
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
            translations: { inventory: { item: 'Item', name: '{{name}}', sku: 'SKU' } },
            values: {
                items: [{ sku: 'SKU-001', name: 'Warehouse Widget' }],
            },
        };
        const output = renderXmlToMarkup(
            parseXML(
                '<DataTable data="$items" as="item"><DataColumn><DataHeader><Flex><P i18n="inventory.item" /><Badge variant="outline" i18n="inventory.sku" /></Flex></DataHeader><DataCell><Flex><P i18n="inventory.name" name="$item.name" /><Badge variant="outline" value="$item.sku" /></Flex></DataCell></DataColumn></DataTable>'
            ),
            ctx
        );

        expect(output).toContain('Item');
        expect(output).toContain('SKU');
        expect(output).toContain('Warehouse Widget');
        expect(output).toContain('SKU-001');
    });
});
