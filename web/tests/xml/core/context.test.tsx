import { createContext, setupContext } from '@xml/core/context';
import type { ASTNode } from '@xml/types';
import { describe, expect, it } from 'bun:test';

describe('core/context', () => {
    it('creates a blank runtime context', () => {
        const ctx = createContext();

        expect(typeof ctx.invalidate).toBe('function');
        expect(ctx).toEqual({
            invalidate: ctx.invalidate,
            locale: 'en',
            setups: {},
            values: {},
        });
    });

    it('returns the same context for an empty ast', async () => {
        const ctx = createContext();
        const ast: ASTNode[] = [];

        await expect(setupContext(ast, ctx, '/api')).resolves.toBe(ctx);
    });

    it('preserves state across setup reruns until the slot is invalidated', async () => {
        const ctx = createContext();
        const ast: ASTNode[] = [{ name: 'State', params: { id: 'filter', value: 'day' } }];

        await setupContext(ast, ctx, '/api');
        (ctx.values.filter as { value: string }).value = 'week';
        await setupContext(ast, ctx, '/api');

        expect((ctx.values.filter as { value: string }).value).toBe('week');

        delete ctx.values.filter;
        await ctx.setups.filter();

        expect((ctx.values.filter as { value: string }).value).toBe('day');
    });
});
