import { parseXML } from '@xml/core/parser';
import { describe, expect, it } from 'bun:test';
import { renderXmlToMarkup } from '../helpers';

describe('Br', () => {
    /* The compiler should preserve titlecase break bridges. */
    it('preserves the break bridge in compiled xml', () => {
        expect(parseXML('<Br />')).toEqual([
            {
                name: 'Br',
            },
        ]);
    });

    /* The runtime should render a break bridge into the expected spacer markup. */
    it('renders the break bridge end to end', () => {
        const output = renderXmlToMarkup(parseXML('<Br />'));

        expect(output).toContain('aria-hidden="true"');
        expect(output).toContain('h-6 w-full');
        expect(output).toContain('<div');
    });
});
