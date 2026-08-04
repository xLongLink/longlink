import { proxy } from 'valtio';
import { describe, expect, it } from 'vitest';
import { appendButtonItem } from '@/xml/v1/adapters/Button';
import type { ExecutionContext } from '@/xml/v1/types';

describe('Button', () => {
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
});
