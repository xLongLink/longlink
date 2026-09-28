import { describe, expect, it } from 'vitest';
import { createContext, parseFragment, renderXmlToMarkup } from '../helpers';

describe('Tabs', () => {
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
        expect(renderXmlToMarkup(parseFragment('<Tabs><Tab label="Details" value="details" /></Tabs>'))).toContain(
            'Details'
        );
    });
});
