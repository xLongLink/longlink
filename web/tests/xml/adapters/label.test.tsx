import { parseXML } from '@xml/core/parser';
import { describe, expect, it } from 'bun:test';
import { renderXmlToMarkup } from '../helpers';

describe('Label', () => {
    /* The compiler should preserve label attributes as raw strings. */
    it('compiles label xml into a label ast node', () => {
        expect(parseXML('<Label htmlFor="newsletter" i18n="Newsletter" />')).toEqual([
            {
                name: 'Label',
                params: { htmlFor: 'newsletter', i18n: 'Newsletter' },
                children: [],
            },
        ]);
    });

    /* The runtime should render the shadcn label shell. */
    it('renders label markup end to end', () => {
        const output = renderXmlToMarkup(parseXML('<Label htmlFor="newsletter" i18n="Newsletter" />'));

        expect(output).toContain('<label');
        expect(output).toContain('for="newsletter"');
        expect(output).toContain('Newsletter');
    });
});
