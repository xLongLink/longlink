import { describe, expect, it } from 'vitest';
import { parseXML } from '@/xml/core/parser';
import { createContext } from '@/xml/core/context';
import { renderXmlToMarkup } from '../helpers';

describe('Table', () => {
    /* Shorthand columns should render field values through the shared data table shell. */
    it('renders shorthand field columns', () => {
        const ctx = createContext();
        ctx.scope.bindings.items = [{ sku: 'SKU-001', created_by: { name: 'Ada Lovelace' } }];
        const output = renderXmlToMarkup(
            parseXML(
                '<Table data="$items"><TableColumn key="sku" header="SKU" /><TableColumn key="creator" field="created_by.name" header="Created by" /></Table>'
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
        const ctx = createContext();
        ctx.scope.bindings.items = [{ sku: 'SKU-001', name: 'Warehouse Widget' }];
        const output = renderXmlToMarkup(
            parseXML(
                '<Table data="$items"><TableColumn key="item" header="Item"><Stack direction="horizontal"><Text value="$row.name" /><Badge label="$row.sku" /></Stack></TableColumn></Table>'
            ),
            ctx
        );

        expect(output).toContain('Item');
        expect(output).toContain('SKU');
        expect(output).toContain('Warehouse Widget');
        expect(output).toContain('SKU-001');
    });

    it('keeps parent bindings available inside a table cell loop', () => {
        const ctx = createContext();
        ctx.scope.bindings = { params: {}, prefix: 'Included', items: [{ tags: [{ name: 'Alpha' }] }] };

        const output = renderXmlToMarkup(
            parseXML(
                '<Table data="$items"><TableColumn key="tags"><For each="$row.tags" as="tag"><Text value="${prefix + \' \' + tag.name + \' \' + index}" /></For></TableColumn></Table>'
            ),
            ctx
        );

        expect(output).toContain('Included Alpha 0');
    });
});
