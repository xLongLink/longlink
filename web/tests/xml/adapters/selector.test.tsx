import { parseXML } from '@/xml/core/parser';
import { describe, expect, it } from 'vitest';
import { renderXmlToMarkup } from '../helpers';
import { createContext } from '@/xml/core/context';

describe('Selector', () => {
    it('rejects markup without a visible Option', () => {
        expect(() => renderXmlToMarkup(parseXML('<Selector label="Status" />'))).toThrow(
            'Selector requires at least one Option'
        );
    });

    it('rejects Options hidden by their condition', () => {
        const ctx = createContext();
        ctx.scope.bindings.showOptions = false;

        expect(() =>
            renderXmlToMarkup(
                parseXML('<Selector label="Status"><Option if="$showOptions" label="Open" value="open" /></Selector>'),
                ctx
            )
        ).toThrow('Selector requires at least one Option');
    });

    it('renders visible options', () => {
        expect(() =>
            renderXmlToMarkup(parseXML('<Selector label="Status"><Option label="Open" value="open" /></Selector>'))
        ).not.toThrow();
    });
});
