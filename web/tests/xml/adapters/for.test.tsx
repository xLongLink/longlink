import { describe, expect, it } from 'vitest';
import { parseXML } from '@/xml/core/parser';
import type { ExecutionContext } from '@/xml/types';
import { renderXmlToMarkup } from '../helpers';

describe('For', () => {
    /* Loop children should keep access to the scoped item value. */
    it('renders children with the scoped item value', () => {
        const ctx: ExecutionContext = {
            setups: {},
            invalidate: async () => {},
            translations: { 'items.name': { defaultMessage: '{name}' } },
            values: { items: [{ name: 'Alpha' }] },
        };

        expect(
            renderXmlToMarkup(
                parseXML(
                    '<For each="$items" as="item"><Text i18n="items.name" values="${{ name: item.name }}" /></For>'
                ),
                ctx
            )
        ).toContain('Alpha');
    });
});
