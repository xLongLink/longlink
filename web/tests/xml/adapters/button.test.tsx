import { appendButtonItem } from '@xml/adapters/Button';
import { parseXML } from '@xml/core/parser';
import type { ExecutionContext } from '@xml/types';
import { describe, expect, it } from 'bun:test';
import { proxy } from 'valtio';
import { renderXmlToMarkup } from '../helpers';

describe('Button', () => {
    /* Variant should flow into the shared button class recipe. */
    it('applies the requested variant', () => {
        const ast = parseXML('<Button variant="destructive" i18n="Delete" />');
        const output = renderXmlToMarkup(ast);

        expect(output).toContain('bg-destructive/10');
        expect(output).toContain('Delete');
    });

    /* Size should flow into the shared button class recipe. */
    it('applies the requested size', () => {
        const ast = parseXML('<Button size="lg" i18n="Save" />');
        const output = renderXmlToMarkup(ast);

        expect(output).toContain('h-9');
        expect(output).toContain('Save');
    });

    /* Submit mode should render a native submit control. */
    it('renders a submit button when submit is enabled', () => {
        const ast = parseXML('<Button submit="true" i18n="Submit" />');
        const output = renderXmlToMarkup(ast);

        expect(output).toContain('<button');
        expect(output).toContain('type="submit"');
        expect(output).toContain('Submit');
    });

    /* Disabled should mark the rendered button as inactive. */
    it('disables normal buttons when disabled is set', () => {
        const ast = parseXML('<Button disabled="true" i18n="Submit" />');
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
        const ast = parseXML('<Button if="${false}" i18n="Hidden" />');
        const output = renderXmlToMarkup(ast);

        expect(output).toBe('<div></div>');
    });

    /* The compiler should preserve the if parameter on button nodes. */
    it('preserves if in compiled xml', () => {
        expect(parseXML('<Button if="${true}" i18n="Visible" />')).toEqual([
            {
                name: 'Button',
                params: { if: '${true}', i18n: 'Visible' },
                children: [],
            },
        ]);
    });
});
