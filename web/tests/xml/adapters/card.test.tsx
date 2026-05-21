import { parseXML } from '@xml/core/parser';
import { describe, expect, it } from 'bun:test';
import { renderXmlToMarkup } from '../helpers';

describe('Card', () => {
    /* The parser should preserve the simplified card structure. */
    it('preserves the simplified card structure in compiled xml', () => {
        expect(
            parseXML(
                '<Card size="sm"><P>Card Content</P></Card>'
            )
        ).toEqual([
            {
                name: 'Card',
                params: { size: 'sm' },
                children: [{ name: 'P', children: [{ name: 'Text', params: { value: 'Card Content' } }] }],
            },
        ]);
    });

    /* The runtime should render the shadcn card shell and content slots. */
    it('renders the simplified card composition', () => {
        const output = renderXmlToMarkup(
            parseXML(
                '<Card size="sm"><P>Card Content</P></Card>'
            )
        );

        expect(output).toContain('data-slot="card"');
        expect(output).toContain('Card Content');
    });
});
