import { compileProps } from '../helpers';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createContext, setupContext } from '@/xml/core/context';

describe('core/context', () => {
    afterEach(() => vi.unstubAllGlobals());

    it('recreates state on setup reruns and invalidation', async () => {
        const ctx = createContext();
        const ast = [
            {
                name: 'State',
                params: compileProps({ id: 'filter', value: 'day', score: '10', list: '[]' }),
                children: [],
            },
        ];

        await setupContext(ast, ctx);
        const filter = ctx.scope.bindings.filter as { value: string; score: string; list: string };
        expect(filter).toEqual({ value: 'day', score: '10', list: '[]' });
        filter.value = 'week';
        await setupContext(ast, ctx);

        expect(ctx.scope.bindings.filter).toEqual({ value: 'day', score: '10', list: '[]' });

        delete ctx.scope.bindings.filter;
        await ctx.services.setups.filter();

        expect(ctx.scope.bindings.filter).toEqual({ value: 'day', score: '10', list: '[]' });
    });

    it('evaluates query paths against route params', async () => {
        const ctx = createContext();
        const ast = [
            { name: 'Query', params: compileProps({ id: 'issue', path: '/api/issues/${params.issue}' }), children: [] },
        ];
        let requestedUrl = '';

        ctx.scope.bindings.params = { issue: '123' };
        ctx.services.requestBaseUrl = 'http://localhost/proxy';
        vi.stubGlobal('fetch', async (input: RequestInfo | URL) => {
            requestedUrl = input instanceof Request ? input.url : String(input);

            return new Response(JSON.stringify({ id: '123' }));
        });

        await setupContext(ast, ctx);

        expect(requestedUrl).toBe('http://localhost/proxy/api/issues/123');
        expect(ctx.scope.bindings.issue).toEqual({ id: '123' });
    });

    it('rejects duplicate State and Query setup IDs before mutating the runtime', async () => {
        const ctx = createContext();

        await expect(
            setupContext(
                [
                    { name: 'State', params: compileProps({ id: 'data', value: 'draft' }), children: [] },
                    { name: 'Query', params: compileProps({ id: 'data', path: '/api/data' }), children: [] },
                ],
                ctx
            )
        ).rejects.toThrow('Duplicate State or Query id "data"');

        expect(ctx.scope.bindings.data).toBeUndefined();
    });

    it('rejects unsafe query paths before fetching', async () => {
        const ctx = createContext();
        const fetchImpl = vi.fn();

        ctx.services.requestBaseUrl = '/proxy';
        vi.stubGlobal('fetch', fetchImpl);

        await expect(
            setupContext(
                [
                    {
                        name: 'Query',
                        params: compileProps({ id: 'issue', path: 'https://evil.example/issues' }),
                        children: [],
                    },
                ],
                ctx
            )
        ).rejects.toThrow('XML request URL must be app-relative');

        expect(fetchImpl).not.toHaveBeenCalled();
    });
});
