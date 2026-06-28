import { parseXML } from '@xml/core/parser';
import { describe, expect, it } from 'bun:test';
import { renderXmlToMarkup } from '../helpers';

describe('Columns', () => {
    /* The compiler should preserve the full columns composition and widths. */
    it('preserves the compound columns structure in compiled xml', () => {
        expect(
            parseXML(
                '<Columns><Column width="70"><P i18n="Main content" /></Column><Column width="30"><P i18n="Sidebar" /></Column></Columns>'
            )
        ).toEqual([
            {
                name: 'Columns',
                children: [
                    {
                        name: 'Column',
                        params: { width: '70' },
                        children: [{ name: 'P', params: { i18n: 'Main content' }, children: [] }],
                    },
                    {
                        name: 'Column',
                        params: { width: '30' },
                        children: [{ name: 'P', params: { i18n: 'Sidebar' }, children: [] }],
                    },
                ],
            },
        ]);
    });

    /* The runtime should render the shadcn columns shell and width-managed columns. */
    it('renders the full columns composition', () => {
        const output = renderXmlToMarkup(
            parseXML(
                '<Columns><Column width="70"><P i18n="Main content" /></Column><Column width="30"><P i18n="Sidebar" /></Column></Columns>'
            )
        );

        expect(output).toContain('data-slot="columns"');
        expect(output).toContain('data-slot="column"');
        expect(output).toContain('Main content');
        expect(output).toContain('Sidebar');
        expect(output).toContain('grid-template-columns');
        expect(output).toContain('1.5rem');
    });
});
