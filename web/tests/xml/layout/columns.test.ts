import { describe, expect, it } from 'bun:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { xmlToAST } from '@/xml/compiler';
import { Columns, Column } from '@/xml/layout/Columns';

describe('Columns', () => {
    /* The compiler should keep Columns and nested Column nodes in the AST. */
    it('compiles columns xml into nested column ast nodes', () => {
        expect(xmlToAST('<Columns><Column width="1">One</Column><Column width="2">Two</Column></Columns>')).toEqual([
            {
                name: 'Columns',
                children: [
                    {
                        name: 'Column',
                        params: { width: '1' },
                        children: [{ name: 'text', value: 'One' }],
                    },
                    {
                        name: 'Column',
                        params: { width: '2' },
                        children: [{ name: 'text', value: 'Two' }],
                    },
                ],
            },
        ]);
    });

    /*
     * This integration test proves that raw XML containing `<Columns>` and
     * `<Column>` is parsed, resolved through the runtime registry, and emitted
     * with the expected grid track styles.
     */
    it('renders explicit column widths', () => {
        expect(
            renderToStaticMarkup(
                createElement(
                    Columns,
                    { widths: [1, 2], gap: 16 },
                    createElement(Column, null, 'One'),
                    createElement(Column, null, 'Two')
                )
            )
        ).toBe(
            '<div class="grid" style="grid-template-columns:minmax(0, 33.33333333333333%) minmax(0, 66.66666666666666%);gap:16px"><div class="space-y-4">One</div><div class="space-y-4">Two</div></div>'
        );
    });

    it('renders explicit 12-column placement from spans', () => {
        expect(
            renderToStaticMarkup(
                createElement(
                    Columns,
                    null,
                    createElement(Column, { span: 3 }, 'Left'),
                    createElement(Column, { width: 20 }, 'Right')
                )
            )
        ).toBe(
            '<div class="grid" style="grid-template-columns:repeat(12, minmax(0, 1fr));gap:16px"><div class="space-y-4" style="grid-column:span 3 / span 3">Left</div><div class="space-y-4" style="grid-column:span 12 / span 12">Right</div></div>'
        );
    });
});
