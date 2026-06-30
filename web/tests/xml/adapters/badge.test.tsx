import { parseXML } from '@xml/core/parser';
import type { ExecutionContext } from '@xml/types';
import { describe, expect, it } from 'bun:test';
import { renderXmlToMarkup } from '../helpers';

describe('Badge', () => {
    /* The compiler should preserve badge attributes as raw strings. */
    it('compiles badge xml into a badge ast node', () => {
        expect(parseXML('<Badge i18n="New" />')).toEqual([
            {
                name: 'Badge',
                params: { i18n: 'New' },
                children: [],
            },
        ]);
    });

    /* The runtime should render Badge XML into the shadcn badge output. */
    it('renders raw xml badge content end to end', () => {
        const output = renderXmlToMarkup(parseXML('<Badge i18n="New" />'));

        expect(output).toContain('<span');
        expect(output).toContain('bg-primary');
        expect(output).toContain('New');
    });

    /* Direct value props should render dynamic badge text without requiring a translation key. */
    it('renders direct badge values', () => {
        const ctx: ExecutionContext = { setups: {}, invalidate: async () => {}, values: { item: { status: 'Open' } } };
        const output = renderXmlToMarkup(parseXML('<Badge variant="outline" value="$item.status" />'), ctx);

        expect(output).toContain('Open');
        expect(output).toContain('border-border');
    });
});
