import { parseXML } from '@xml/core/parser';
import { describe, expect, it } from 'bun:test';
import { renderXmlToMarkup } from '../helpers';

describe('A', () => {
    /* The compiler should preserve titlecase anchor bridges. */
    it('preserves the anchor bridge in compiled xml', () => {
        expect(parseXML('<A href="/icons"><Icon name="sparkles" />Open icons</A>')).toEqual([
            {
                name: 'A',
                params: { href: '/icons' },
                children: [
                    { name: 'Icon', params: { name: 'sparkles' } },
                    { name: 'Text', params: { value: 'Open icons' } },
                ],
            },
        ]);
    });

    /* The runtime should render an anchor with an inline icon. */
    it('renders the anchor bridge with the icon', () => {
        const output = renderXmlToMarkup(parseXML('<A href="/icons"><Icon name="sparkles" />Open icons</A>'));

        expect(output).toContain('href="/icons"');
        expect(output).toContain('inline-flex');
        expect(output).toContain('hover:text-accent');
        expect(output).toContain('Open icons');
        expect(output).toContain('<svg');
    });
});
