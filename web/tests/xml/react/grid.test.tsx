import { parseXML } from '@xml/core/parser';
import { describe, expect, it } from 'bun:test';
import { renderXmlToMarkup } from '../helpers';

describe('Grid', () => {
    /* The compiler should preserve the grid container and its children. */
    it('preserves the grid structure in compiled xml', () => {
        expect(parseXML('<Grid templateColumns="repeat(3, minmax(0, 1fr))">One Two</Grid>')).toEqual([
            {
                name: 'Grid',
                params: { templateColumns: 'repeat(3, minmax(0, 1fr))' },
                children: [{ name: 'Text', params: { value: 'One Two' } }],
            },
        ]);
    });

    /* The runtime should render the shadcn grid shell and content. */
    it('renders the full grid composition', () => {
        const output = renderXmlToMarkup(parseXML('<Grid templateColumns="repeat(3, minmax(0, 1fr))">One Two</Grid>'));

        expect(output).toContain('data-slot="grid"');
        expect(output).toContain('grid-template-columns');
        expect(output).toContain('repeat(3, minmax(0, 1fr))');
        expect(output).toContain('One');
        expect(output).toContain('Two');
    });
});
