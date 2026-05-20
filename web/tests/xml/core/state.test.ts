import { state } from '@xml/core/state';
import type { ExecutionContext } from '@xml/types';
import { describe, expect, it } from 'bun:test';

describe('state', () => {
    it('stores object values under a reactive slot', () => {
        const ctx: ExecutionContext = { setups: {}, invalidate: async () => {}, values: {} };

        state(ctx, 'name', { value: 'Ada' });

        expect(ctx.values.name).toMatchObject({ value: 'Ada' });
    });

    it('stores arbitrary fields as reactive slots', () => {
        const ctx: ExecutionContext = { setups: {}, invalidate: async () => {}, values: {} };

        state(ctx, 'items', { anything: [1, 2, 3] });

        expect((ctx.values.items as { anything: number[] }).anything).toEqual([1, 2, 3]);
    });
});
