import { xmlToAST } from '@/xml/compiler';
import { describe, expect, it } from 'bun:test';
import { renderXmlToMarkup } from '../helpers';

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
                        children: [{ name: 'Text', children: 'One' }],
                    },
                    {
                        name: 'Column',
                        params: { width: '2' },
                        children: [{ name: 'Text', children: 'Two' }],
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
            renderXmlToMarkup(
                xmlToAST('<Columns widths="[1,2]" gap="16"><Column>One</Column><Column>Two</Column></Columns>')
            )
        ).toBe(
            '<div><div class="grid" style="grid-template-columns:minmax(0, 33.33333333333333%) minmax(0, 66.66666666666666%);gap:16px"><div class="space-y-4" style="grid-column:span 1">One</div><div class="space-y-4" style="grid-column:span 1">Two</div></div></div>'
        );
    });

    it('renders explicit 12-column placement from spans', () => {
        expect(
            renderXmlToMarkup(
                xmlToAST('<Columns><Column span="3">Left</Column><Column width="20">Right</Column></Columns>')
            )
        ).toBe(
            '<div><div class="grid" style="grid-template-columns:repeat(15, minmax(0, 1fr));gap:16px"><div class="space-y-4" style="grid-column:span 3">Left</div><div class="space-y-4" style="grid-column:span 12">Right</div></div></div>'
        );
    });
});
