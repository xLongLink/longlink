import { afterEach, describe, expect, it, vi } from 'vitest';
import { createContext, setupContext } from '@/xml/runtime/core/context';
import { compileProps } from '../helpers';

describe('core/context', () => {
    afterEach(() => vi.unstubAllGlobals());

    it('preserves state across setup reruns until the slot is invalidated', async () => {
        const ctx = createContext();
        const ast = [{ name: 'State', params: compileProps({ id: 'filter', value: 'day' }), children: [] }];

        await setupContext(ast, ctx, '/api');
        const filter = ctx.scope.bindings.filter as { value: string };
        filter.value = 'week';
        await setupContext(ast, ctx, '/api');

        expect(filter.value).toBe('week');

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
        vi.stubGlobal('fetch', async (input: RequestInfo | URL) => {
            requestedUrl = String(input);

            return new Response(JSON.stringify({ id: '123' }));
        });

        await setupContext(ast, ctx, '/proxy');

        expect(requestedUrl).toBe('/proxy/api/issues/123');
        expect(ctx.scope.bindings.issue).toEqual({ id: '123' });
    });

    it.each(['https://evil.example/issues', '//evil.example/issues', '/\\evil.example/issues'])(
        'rejects unsafe query paths before fetching: %s',
        async (path) => {
            const ctx = createContext();
            const fetchImpl = vi.fn();

            vi.stubGlobal('fetch', fetchImpl);

            await expect(
                setupContext(
                    [{ name: 'Query', params: compileProps({ id: 'issue', path }), children: [] }],
                    ctx,
                    '/proxy'
                )
            ).rejects.toThrow('XML request URL must be app-relative');

            expect(fetchImpl).not.toHaveBeenCalled();
        }
    );
});
