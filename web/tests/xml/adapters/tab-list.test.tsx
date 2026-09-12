import { describe, expect, it } from 'vitest';
import { createContext } from '@/xml/core/context';
import { parseFragment, renderXmlToMarkup } from '../helpers';

describe('Tabs', () => {
    it('rejects markup without a visible Tab', () => {
        expect(() => renderXmlToMarkup(parseFragment('<Tabs />'))).toThrow('Tabs requires at least one Tab');
    });

    it('rejects Tabs hidden by their condition', () => {
        const ctx = createContext();
        ctx.scope.bindings.showTabs = false;

        expect(() =>
            renderXmlToMarkup(
                parseFragment('<Tabs><Tab if="$showTabs" label="Details" value="details">Details</Tab></Tabs>'),
                ctx
            )
        ).toThrow('Tabs requires at least one Tab');
    });

    it('renders a visible Tab', () => {
        expect(
            renderXmlToMarkup(parseFragment('<Tabs><Tab label="Details" value="details">Details</Tab></Tabs>'))
        ).toContain('Details');
    });
});
