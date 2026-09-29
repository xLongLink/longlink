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
        const output = renderXmlToMarkup(
            parseFragment('<Tabs><Tab label="Details" value="details">Tab content</Tab></Tabs>')
        );

        expect(output).toContain('Details');
        expect(output).toContain('Tab content');
    });
});
