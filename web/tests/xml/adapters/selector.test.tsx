import { describe, expect, it } from 'vitest';
import { createContext } from '@/xml/core/context';
import { parseFragment, renderXmlToMarkup } from '../helpers';

describe('Selector', () => {
    it('rejects markup without a visible Option', () => {
        expect(() => renderXmlToMarkup(parseFragment('<Selector label="Status" />'))).toThrow(
            'Selector requires at least one Option'
        );
    });

    it('rejects Options hidden by their condition', () => {
        const ctx = createContext();
        ctx.scope.bindings.showOptions = false;

        expect(() =>
            renderXmlToMarkup(
                parseFragment(
                    '<Selector label="Status"><Option if="$showOptions" label="Open" value="open" /></Selector>'
                ),
                ctx
            )
        ).toThrow('Selector requires at least one Option');
    });

    it('renders its label when a visible option is provided', () => {
        // Act
        const output = renderXmlToMarkup(
            parseFragment('<Selector label="Status"><Option label="Open" value="open" /></Selector>')
        );

        // Assert
        expect(output).toContain('Status');
    });
});
