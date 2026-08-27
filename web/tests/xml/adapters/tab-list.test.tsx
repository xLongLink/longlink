import { parseXML } from '@/xml/core/parser';
import { describe, expect, it } from 'vitest';
import { renderXmlToMarkup } from '../helpers';
import { createContext } from '@/xml/core/context';

describe('Tabs', () => {
    it('rejects markup without a visible Tab', () => {
        expect(() => renderXmlToMarkup(parseXML('<Tabs />'))).toThrow('Tabs requires at least one Tab');
    });

    it('rejects Tabs hidden by their condition', () => {
        const ctx = createContext();
        ctx.scope.bindings.showTabs = false;

        expect(() =>
            renderXmlToMarkup(
                parseXML('<Tabs><Tab if="$showTabs" label="Details" value="details">Details</Tab></Tabs>'),
                ctx
            )
        ).toThrow('Tabs requires at least one Tab');
    });

    it('renders a visible Tab', () => {
        expect(
            renderXmlToMarkup(parseXML('<Tabs><Tab label="Details" value="details">Details</Tab></Tabs>'))
        ).toContain('Details');
    });
});
