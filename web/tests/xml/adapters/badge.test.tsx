import { parseXML } from '@xml/core/parser';
import type { ExecutionContext } from '@xml/types';
import { describe, expect, it } from 'bun:test';
import { renderXmlToMarkup } from '../helpers';

describe('Badge', () => {
    it('renders raw xml badge content end to end', () => {
        const output = renderXmlToMarkup(parseXML('<Badge i18n="badges.new" />'));

        expect(output).toContain('New');
    });

    /* Direct value props should render dynamic badge text without requiring a translation key. */
    it('renders direct badge values', () => {
        const ctx: ExecutionContext = { setups: {}, invalidate: async () => {}, values: { item: { status: 'Open' } } };
        const output = renderXmlToMarkup(parseXML('<Badge variant="outline" value="$item.status" />'), ctx);

        expect(output).toContain('Open');
    });
});
