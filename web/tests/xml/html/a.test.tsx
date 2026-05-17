import { parseXML } from '@xml/core/parser';
import { describe, expect, it } from 'bun:test';
import { renderXmlToMarkup } from '../helpers';

describe('a', () => {
    /* The compiler should preserve lowercase anchor bridges. */
    it('preserves the anchor bridge in compiled xml', () => {
        expect(parseXML('<a href="/icons"><Icon name="sparkles" className="size-5" />Open icons</a>')).toEqual([
            {
                name: 'a',
                params: { href: '/icons' },
                children: [
                    { name: 'Icon', params: { className: 'size-5', name: 'sparkles' } },
                    { name: 'Text', params: { value: 'Open icons' } },
                ],
            },
        ]);
    });

    /* The runtime should render an anchor with an inline icon. */
    it('renders the anchor bridge with the icon', () => {
        const output = renderXmlToMarkup(parseXML('<a href="/icons"><Icon name="sparkles" className="size-5" />Open icons</a>'));

        expect(output).toContain('href="/icons"');
        expect(output).toContain('inline-flex');
        expect(output).toContain('hover:text-accent');
        expect(output).toContain('Open icons');
        expect(output).toContain('<svg');
    });
});
