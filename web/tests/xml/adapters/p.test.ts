import { parseXML } from '@xml/core/parser';
import type { ExecutionContext } from '@xml/types';
import { describe, expect, it } from 'bun:test';
import { renderXmlToMarkup } from '../helpers';

describe('P', () => {
    /* The compiler should preserve the i18n attribute on paragraph tags. */
    it('compiles p xml into a paragraph ast node', () => {
        expect(parseXML('<P i18n="copy.paragraph" />')).toEqual([
            {
                name: 'P',
                params: { i18n: 'copy.paragraph' },
                children: [],
            },
        ]);
    });

    /* The runtime should resolve localized paragraph text from the bundle. */
    it('renders localized paragraph content end to end', () => {
        const ctx: ExecutionContext = {
            setups: {},
            invalidate: async () => {},
            translations: { copy: { paragraph: 'Paragraph text' } },
            values: {},
        };

        expect(renderXmlToMarkup(parseXML('<P i18n="copy.paragraph" />'), ctx)).toBe(
            '<div><p class="leading-7">Paragraph text</p></div>'
        );
    });

    /* Direct value props should render dynamic text without requiring a translation key. */
    it('renders direct paragraph values', () => {
        const ctx: ExecutionContext = { setups: {}, invalidate: async () => {}, values: { item: { name: 'Widget' } } };

        expect(renderXmlToMarkup(parseXML('<P value="$item.name" />'), ctx)).toBe(
            '<div><p class="leading-7">Widget</p></div>'
        );
    });
});
