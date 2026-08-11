import { describe, expect, it } from 'vitest';
import { createContext, setupContext } from '@/xml/v1/core/context';
import { compileProps } from '../helpers';

describe('core/context', () => {
    it('preserves state across setup reruns until the slot is invalidated', async () => {
        const ctx = createContext();
        const ast = [{ name: 'State', params: compileProps({ id: 'filter', value: 'day' }), children: [] }];

        await setupContext(ast, ctx, '/api');
        (ctx.scope.bindings.filter as { value: string }).value = 'week';
        await setupContext(ast, ctx, '/api');

        expect((ctx.scope.bindings.filter as { value: string }).value).toBe('week');

        delete ctx.scope.bindings.filter;
        await ctx.services.setups.filter();

        expect((ctx.scope.bindings.filter as { value: string }).value).toBe('day');
    });

    it('evaluates query paths against route params', async () => {
        const ctx = createContext();
        const ast = [
            { name: 'Query', params: compileProps({ id: 'issue', path: '/api/issues/${params.issue}' }), children: [] },
        ];
        let requestedUrl = '';

        ctx.scope.bindings.params = { issue: '123' };
        const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'fetch');

        Object.defineProperty(globalThis, 'fetch', {
            configurable: true,
            value: async (input: RequestInfo | URL) => {
                requestedUrl = String(input);

                return new Response(JSON.stringify({ id: '123' }));
            },
        });

        try {
            await setupContext(ast, ctx, '/proxy');
        } finally {
            if (descriptor) {
                Object.defineProperty(globalThis, 'fetch', descriptor);
            } else {
                Reflect.deleteProperty(globalThis, 'fetch');
            }
        }

        expect(requestedUrl).toBe('/proxy/api/issues/123');
        expect(ctx.scope.bindings.issue).toEqual({ id: '123' });
    });
});
