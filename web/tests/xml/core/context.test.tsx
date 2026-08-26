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

    it('refetches Query data through its registered setup', async () => {
        // Arrange
        const ctx = createContext();
        const ast = [{ name: 'Query', params: compileProps({ id: 'records', path: '/records' }), children: [] }];
        const fetchImpl = vi
            .fn()
            .mockResolvedValueOnce(new Response(JSON.stringify({ version: 1 })))
            .mockResolvedValueOnce(new Response(JSON.stringify({ version: 2 })));
        ctx.services.requestBaseUrl = 'http://localhost/proxy';
        vi.stubGlobal('fetch', fetchImpl);

        // Act
        await setupContext(ast, ctx);
        await ctx.services.setups.records();

        // Assert
        expect(fetchImpl).toHaveBeenCalledTimes(2);
        expect(ctx.scope.bindings.records).toEqual({ version: 2 });
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

    it('rejects non-string query paths before fetching', async () => {
        // Arrange
        const ctx = createContext();
        const fetchImpl = vi.fn();
        vi.stubGlobal('fetch', fetchImpl);

        // Act and assert
        await expect(
            setupContext(
                [
                    {
                        name: 'Query',
                        params: compileProps({ id: 'issue', path: '${{id: "123"}}' }),
                        children: [],
                    },
                ],
                ctx
            )
        ).rejects.toThrow('Query path must resolve to a string');

        expect(fetchImpl).not.toHaveBeenCalled();
    });
});
