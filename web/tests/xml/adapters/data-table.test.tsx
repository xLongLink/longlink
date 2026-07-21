import { describe, expect, it } from 'bun:test';
import type { ExecutionContext } from '@/xml/types';
import { parseXML } from '@/xml/core/parser';
import { renderXmlToMarkup } from '../helpers';

describe('Table', () => {
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
                '<Table data="$items" rowName="item"><TableColumn key="sku" header="SKU" /><TableColumn key="creator" field="created_by.name" header="Created by" /></Table>'
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
            translations: {
                'inventory.item': { defaultMessage: 'Item' },
                'inventory.name': { defaultMessage: '{name}' },
                'inventory.sku': { defaultMessage: 'SKU' },
            },
            values: {
                items: [{ sku: 'SKU-001', name: 'Warehouse Widget' }],
            },
        };
        const output = renderXmlToMarkup(
            parseXML(
                '<Table data="$items" rowName="item"><TableColumn key="item" i18n="inventory.item"><Stack direction="horizontal" gap="2"><Text i18n="inventory.name" values="${{ name: item.name }}" /><Badge variant="neutral" label="$item.sku" /></Stack></TableColumn></Table>'
            ),
            ctx
        );

        expect(output).toContain('Item');
        expect(output).toContain('SKU');
        expect(output).toContain('Warehouse Widget');
        expect(output).toContain('SKU-001');
    });
});
