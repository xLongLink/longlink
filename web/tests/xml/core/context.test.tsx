import { createContext, parseFragment } from '../helpers';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getSetupNodes, setupContext } from '@/xml/core/context';

describe('core/context', () => {
    afterEach(() => vi.unstubAllGlobals());

    it('recreates state on setup reruns and invalidation', async () => {
        const ctx = createContext();
        const ast = parseFragment('<State id="filter" value="day" score="10" list="[]" />');

        await setupContext(getSetupNodes(ast), ctx);
        const filter = ctx.scope.bindings.filter;
        if (
            typeof filter !== 'object' ||
            filter === null ||
            !('value' in filter) ||
            !('score' in filter) ||
            !('list' in filter) ||
            typeof filter.value !== 'string' ||
            typeof filter.score !== 'string' ||
            typeof filter.list !== 'string'
        ) {
            throw new Error('Filter State is missing its string values');
        }
        expect(filter).toEqual({ value: 'day', score: '10', list: '[]' });
        filter.value = 'week';
        await setupContext(getSetupNodes(ast), ctx);

        expect(ctx.scope.bindings.filter).toEqual({ value: 'day', score: '10', list: '[]' });

        delete ctx.scope.bindings.filter;
        await ctx.services.setups.filter();

        expect(ctx.scope.bindings.filter).toEqual({ value: 'day', score: '10', list: '[]' });
    });

    it('evaluates query paths against route params', async () => {
        const ctx = createContext({ params: { issue: '123' }, requestBaseUrl: 'http://localhost/proxy' });
        const ast = parseFragment('<Query id="issue" path="/api/issues/${params.issue}" />');
        let requestedUrl = '';

        vi.stubGlobal('fetch', async (input: RequestInfo | URL) => {
            requestedUrl = input instanceof Request ? input.url : String(input);

            return new Response(JSON.stringify({ id: '123' }));
        });

        await setupContext(getSetupNodes(ast), ctx);

        expect(requestedUrl).toBe('http://localhost/proxy/api/issues/123');
        expect(ctx.scope.bindings.issue).toEqual({ id: '123' });
    });

    it('refetches Query data through its registered setup', async () => {
        // Arrange
        const ctx = createContext({ requestBaseUrl: 'http://localhost/proxy' });
        const ast = parseFragment('<Query id="records" path="/records" />');
        const fetchImpl = vi
            .fn()
            .mockResolvedValueOnce(new Response(JSON.stringify({ version: 1 })))
            .mockResolvedValueOnce(new Response(JSON.stringify({ version: 2 })));
        vi.stubGlobal('fetch', fetchImpl);

        // Act
        await setupContext(getSetupNodes(ast), ctx);
        await ctx.services.setups.records();

        // Assert
        expect(fetchImpl).toHaveBeenCalledTimes(2);
        expect(ctx.scope.bindings.records).toEqual({ version: 2 });
    });

    it.each([
        {
            scenario: 'unsafe',
            path: 'https://evil.example/issues',
            error: 'XML request URL must be solution-relative',
        },
        {
            scenario: 'non-string',
            path: '${{id: "123"}}',
            error: 'Query path must resolve to a string',
        },
    ])('rejects $scenario query paths before fetching', async ({ path, error }) => {
        // Arrange
        const ctx = createContext({ requestBaseUrl: '/proxy' });
        const fetchImpl = vi.fn();
        const ast = parseFragment(`<Query id="issue" path='${path}' />`);

        vi.stubGlobal('fetch', fetchImpl);

        // Act
        const setup = setupContext(getSetupNodes(ast), ctx);

        // Assert
        await expect(setup).rejects.toThrow(new Error(error));
        expect(fetchImpl).not.toHaveBeenCalled();
    });
});
