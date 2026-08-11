import { afterEach, describe, expect, it, vi } from 'vitest';
import { createContext, setupContext } from '@/xml/v1/core/context';
import { compileProps } from '../helpers';

describe('core/context', () => {
    afterEach(() => vi.unstubAllGlobals());

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
            {
                name: 'Query',
                params: compileProps({ id: 'issue', path: '/api/issues/${params.issue}' }),
                children: [],
            },
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

    it.each([
        ['/sdk', '/sdk/api/issues/123'],
        ['/api/applications/app-1/proxy', '/api/applications/app-1/proxy/api/issues/123'],
    ])('sends query requests through %s with shared credentials and Accept defaults', async (baseUrl, expectedUrl) => {
        const ctx = createContext();
        const ast = [
            {
                name: 'Query',
                params: compileProps({ id: 'issue', path: '/api/issues/123' }),
                children: [],
            },
        ];
        let requestInit: RequestInit | undefined;
        const fetchImpl = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
            requestInit = init;

            return new Response(JSON.stringify({ id: '123' }));
        });

        vi.stubGlobal('fetch', fetchImpl);

        await setupContext(ast, ctx, baseUrl);

        expect(fetchImpl).toHaveBeenCalledOnce();
        expect(fetchImpl).toHaveBeenCalledWith(expectedUrl, expect.objectContaining({ credentials: 'include' }));
        expect(new Headers(requestInit?.headers).get('accept')).toBe('application/json');
    });

    it.each(['https://evil.example/issues', '//evil.example/issues', '/\\evil.example/issues'])(
        'rejects unsafe query paths before fetching: %s',
        async (path) => {
            const ctx = createContext();
            const ast = [{ name: 'Query', params: compileProps({ id: 'issue', path }), children: [] }];
            const fetchImpl = vi.fn();

            vi.stubGlobal('fetch', fetchImpl);

            await expect(setupContext(ast, ctx, '/proxy')).rejects.toThrow('XML request URL must be app-relative');

            expect(fetchImpl).not.toHaveBeenCalled();
        }
    );
});
