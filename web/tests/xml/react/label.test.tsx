import { parseXML } from '@xml/core/parser';
import { describe, expect, it } from 'bun:test';
import { renderXmlToMarkup } from '../helpers';

describe('Label', () => {
    /* The compiler should preserve label attributes as raw strings. */
    it('compiles label xml into a label ast node', () => {
        expect(parseXML('<Label htmlFor="newsletter">Newsletter</Label>')).toEqual([
            {
                name: 'Label',
                params: { htmlFor: 'newsletter' },
                children: [{ name: 'Text', params: { value: 'Newsletter' } }],
            },
        ]);
    });

    /* The runtime should render the shadcn label shell. */
    it('renders label markup end to end', () => {
        const output = renderXmlToMarkup(parseXML('<Label htmlFor="newsletter">Newsletter</Label>'));

        expect(output).toContain('<label');
        expect(output).toContain('for="newsletter"');
        expect(output).toContain('Newsletter');
    });
});
