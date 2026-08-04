import { describe, expect, it } from 'vitest';
import { createContext, setupContext } from '@/xml/v1/core/context';
import type { ASTNode } from '@/xml/v1/types';
import { withGlobalValue } from '../../../helpers/globals';

describe('core/context', () => {
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
        const ast: ASTNode[] = [{ name: 'Query', params: { id: 'issue', path: '/api/issues/${params.issue}' } }];
        let requestedUrl = '';

        ctx.params = { issue: '123' };
        await withGlobalValue(
            'fetch',
            async (input: RequestInfo | URL) => {
                requestedUrl = String(input);

                return new Response(JSON.stringify({ id: '123' }), {
                    headers: { 'content-type': 'application/json' },
                });
            },
            async () => {
                await setupContext(ast, ctx, '/proxy');
            }
        );

        expect(requestedUrl).toBe('/proxy/api/issues/123');
        expect(ctx.values.issue).toEqual({ id: '123' });
    });
});
