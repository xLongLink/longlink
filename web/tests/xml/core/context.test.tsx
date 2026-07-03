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

    it('evaluates query paths against route params', async () => {
        const ctx = createContext();
        const originalFetch = globalThis.fetch;
        const ast: ASTNode[] = [{ name: 'Query', params: { id: 'issue', path: '/api/issues/${params.issue}' } }];
        let requestedUrl = '';

        ctx.params = { issue: '123' };
        globalThis.fetch = (async (input: RequestInfo | URL) => {
            requestedUrl = String(input);

            return new Response(JSON.stringify({ id: '123' }), {
                headers: { 'content-type': 'application/json' },
            });
        }) as unknown as typeof fetch;

        try {
            await setupContext(ast, ctx, '/proxy');
        } finally {
            globalThis.fetch = originalFetch;
        }

        expect(requestedUrl).toBe('/proxy/api/issues/123');
        expect(ctx.values.issue).toEqual({ id: '123' });
    });
});
