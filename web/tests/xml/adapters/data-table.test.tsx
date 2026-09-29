import { describe, expect, it } from 'vitest';
import { createContext, parseFragment, renderXmlToMarkup } from '../helpers';

describe('Table', () => {
    it('rejects unsafe row identifier paths', () => {
        // Arrange
        const ctx = createContext();
        ctx.scope.bindings.items = [];

        // Act and assert
        expect(() =>
            renderXmlToMarkup(
                parseFragment('<Table data="$items" idKey="__proto__"><TableColumn field="name" /></Table>'),
                ctx
            )
        ).toThrow('Table idKey requires a usable field path');
    });

    it.each([
        '<Table data="$items"><TableColumn /></Table>',
        '<Table data="$items"><TableColumn field="created by" /></Table>',
    ])('rejects TableColumn without a usable field path', (xml) => {
        const ctx = createContext();
        ctx.scope.bindings.items = [];

        expect(() => renderXmlToMarkup(parseFragment(xml), ctx)).toThrow('TableColumn requires a usable field path');
    });

    it('renders shorthand field columns', () => {
        // Arrange
        const ctx = createContext();
        ctx.scope.bindings.items = [{ sku: 'SKU-001', created_by: { name: 'Ada Lovelace' } }];

        // Act
        const output = renderXmlToMarkup(
            parseFragment(
                '<Table data="$items"><TableColumn field="sku" /><TableColumn field="created_by.name" /></Table>'
            ),
            ctx
        );

        // Assert
        expect(output).toContain('SKU-001');
        expect(output).toContain('Ada Lovelace');
    });

    it('renders rich cell children', () => {
        const ctx = createContext();
        ctx.scope.bindings.items = [{ sku: 'SKU-001', name: 'Warehouse Widget' }];
        const output = renderXmlToMarkup(
            parseFragment(
                '<Table data="$items"><TableColumn field="name"><Stack direction="horizontal">$row.name<Badge>$row.sku</Badge></Stack></TableColumn></Table>'
            ),
            ctx
        );

        expect(output).toContain('Warehouse Widget');
        expect(output).toContain('SKU-001');
    });

    it('keeps parent bindings available inside a table cell loop', () => {
        const ctx = createContext();
        Object.assign(ctx.scope.bindings, { prefix: 'Included', items: [{ tags: [{ name: 'Alpha' }] }] });

        const output = renderXmlToMarkup(
            parseFragment(
                '<Table data="$items"><TableColumn field="tags"><For each="$row.tags" as="tag">${prefix + \' \' + tag.name + \' \' + index}</For></TableColumn></Table>'
            ),
            ctx
        );

        expect(output).toContain('Included Alpha 0');
    });
});
