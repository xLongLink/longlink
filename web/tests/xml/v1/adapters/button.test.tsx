import { proxy } from 'valtio';
import { describe, expect, it } from 'vitest';
import { appendButtonItem } from '@/xml/v1/adapters/Button';
import type { XmlRuntime } from '@/xml/v1/types';
import { compileProps } from '../helpers';

describe('Button', () => {
    /* Append mode should push items into a named cart state slot. */
    it('appends an item to the target cart state', () => {
        const ctx: XmlRuntime = {
            scope: {
                bindings: {
                    cart: proxy([]),
                },
            },
            services: { invalidate: async () => {}, navigationBaseUrl: '', params: {}, requestBaseUrl: '', setups: {} },
        };

        appendButtonItem(
            compileProps({
                append: 'cart',
                item: '${{ name: "Apples", quantity: 1, price: "$2.40" }}',
            }),
            ctx.scope
        );

        const cart = ctx.scope.bindings.cart as Array<{ name: string; quantity: number; price: string }>;

        expect(cart).toHaveLength(1);
        expect(cart[0]).toEqual({ name: 'Apples', quantity: 1, price: '$2.40' });
    });
});
