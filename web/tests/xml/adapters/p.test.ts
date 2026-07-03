import { parseXML } from '@xml/core/parser';
import type { ExecutionContext } from '@xml/types';
import { describe, expect, it } from 'bun:test';
import { renderXmlToMarkup } from '../helpers';

describe('P', () => {
    /* The runtime should resolve localized paragraph text from the bundle. */
    it('renders localized paragraph content end to end', () => {
        const ctx: ExecutionContext = {
            setups: {},
            invalidate: async () => {},
            translations: { copy: { paragraph: 'Paragraph text' } },
            values: {},
        };

        expect(renderXmlToMarkup(parseXML('<P i18n="copy.paragraph" />'), ctx)).toContain('Paragraph text');
    });

    /* Direct value props should render dynamic text without requiring a translation key. */
    it('renders direct paragraph values', () => {
        const ctx: ExecutionContext = { setups: {}, invalidate: async () => {}, values: { item: { name: 'Widget' } } };

        expect(renderXmlToMarkup(parseXML('<P value="$item.name" />'), ctx)).toContain('Widget');
    });
});
