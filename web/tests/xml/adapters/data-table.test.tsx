import { parseXML } from '@/xml/core/parser';
import { describe, expect, it } from 'vitest';
import { renderXmlToMarkup } from '../helpers';
import { createContext } from '@/xml/core/context';

describe('Table', () => {
    it.each([
        '<Table data="$items"><TableColumn /></Table>',
        '<Table data="$items"><TableColumn field="created by" /></Table>',
    ])('rejects TableColumn without a usable field path', (xml) => {
        const ctx = createContext();
        ctx.scope.bindings.items = [];

        expect(() => renderXmlToMarkup(parseXML(xml), ctx)).toThrow('TableColumn requires a usable field path');
    });

    it('renders shorthand field columns', () => {
        const ctx = createContext();
        ctx.scope.bindings.items = [{ sku: 'SKU-001', created_by: { name: 'Ada Lovelace' } }];
        const output = renderXmlToMarkup(
            parseXML(
                '<Table data="$items"><TableColumn field="sku" header="SKU" /><TableColumn field="created_by.name" header="Created by" /></Table>'
            ),
            ctx
        );

        expect(output).toContain('SKU');
        expect(output).toContain('SKU-001');
        expect(output).toContain('Created by');
        expect(output).toContain('Ada Lovelace');
    });

    it('renders rich header and cell slots', () => {
        const ctx = createContext();
        ctx.scope.bindings.items = [{ sku: 'SKU-001', name: 'Warehouse Widget' }];
        const output = renderXmlToMarkup(
            parseXML(
                '<Table data="$items"><TableColumn field="name" header="Item"><Stack direction="horizontal">$row.name<Badge>$row.sku</Badge></Stack></TableColumn></Table>'
            ),
            ctx
        );

        expect(output).toContain('Item');
        expect(output).toContain('Warehouse Widget');
        expect(output).toContain('SKU-001');
    });

    it('keeps parent bindings available inside a table cell loop', () => {
        const ctx = createContext();
        ctx.scope.bindings = { params: {}, prefix: 'Included', items: [{ tags: [{ name: 'Alpha' }] }] };

        const output = renderXmlToMarkup(
            parseXML(
                '<Table data="$items"><TableColumn field="tags"><For each="$row.tags" as="tag">${prefix + \' \' + tag.name + \' \' + index}</For></TableColumn></Table>'
            ),
            ctx
        );

        expect(output).toContain('Included Alpha 0');
    });
});
