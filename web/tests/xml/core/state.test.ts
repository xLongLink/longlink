import { state } from '@xml/core/state';
import type { ExecutionContext } from '@xml/types';
import { describe, expect, it } from 'bun:test';

describe('state', () => {
    it('stores scalar values under a reactive slot', () => {
        const ctx: ExecutionContext = { setups: {}, invalidate: async () => {}, values: {} };

        state(ctx, 'name', 'Ada');

        expect(ctx.values.name).toMatchObject({ value: 'Ada' });
    });

    it('stores arrays as reactive slots', () => {
        const ctx: ExecutionContext = { setups: {}, invalidate: async () => {}, values: {} };

        state(ctx, 'items', [1, 2, 3]);

        expect(Array.isArray(ctx.values.items)).toBe(true);
    });
});
