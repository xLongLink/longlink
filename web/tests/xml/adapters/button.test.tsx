import { appendButtonItem } from '@xml/adapters/Button';
import { parseXML } from '@xml/core/parser';
import type { ExecutionContext } from '@xml/types';
import { describe, expect, it } from 'bun:test';
import { proxy } from 'valtio';
import { renderXmlToMarkup } from '../helpers';

describe('Button', () => {
    /* Submit mode should render a native submit control. */
    it('renders a submit button when submit is enabled', () => {
        const ast = parseXML('<Button submit="true" i18n="actions.submit" />');
        const output = renderXmlToMarkup(ast);

        expect(output).toContain('<button');
        expect(output).toContain('type="submit"');
        expect(output).toContain('Submit');
    });

    /* Disabled should mark the rendered button as inactive. */
    it('disables normal buttons when disabled is set', () => {
        const ast = parseXML('<Button disabled="true" i18n="actions.submit" />');
        const output = renderXmlToMarkup(ast);

        expect(output).toContain('<button');
        expect(output).toContain('disabled');
        expect(output).toContain('Submit');
    });

    /* Append mode should push items into a named cart state slot. */
    it('appends an item to the target cart state', () => {
        const ctx: ExecutionContext = {
            setups: {},
            invalidate: async () => {},
            values: {
                cart: proxy([]),
            },
        };

        appendButtonItem(
            {
                append: 'cart',
                item: '${{ name: "Apples", quantity: 1, price: "$2.40" }}',
            },
            ctx
        );

        const cart = ctx.values.cart as Array<{ name: string; quantity: number; price: string }>;

        expect(cart).toHaveLength(1);
        expect(cart[0]).toEqual({ name: 'Apples', quantity: 1, price: '$2.40' });
    });

    /* The runtime should honor conditional rendering on button nodes. */
    it('skips a button when if resolves false', () => {
        const ast = parseXML('<Button if="${false}" i18n="actions.hidden" />');
        const output = renderXmlToMarkup(ast);

        expect(output).toBe('<div></div>');
    });

});
