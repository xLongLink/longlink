import { parseXML } from '@/xml/parser';
import { Query } from '@/xml/primitives/Query';
import { RuntimeProvider } from '@/xml/runtime';
import type { ExecutionContext } from '@/xml/types';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it } from 'bun:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

describe('Query', () => {
    /* The compiler should preserve query attributes and nested content. */
    it('compiles query xml into a query ast node', () => {
        expect(parseXML('<Query id="user" path="/api/user"><p>Ready</p></Query>')).toEqual([
            {
                name: 'Query',
                params: { id: 'user', path: '/api/user' },
                children: [{ name: 'p', children: [{ name: 'Text', children: 'Ready' }] }],
            },
        ]);
    });

    /* Query should reject missing ids so invalid XML fails fast. */
    it('throws when id is missing', () => {
        const runtime: ExecutionContext = { ctx: {}, props: {}, children: null };
        const client = new QueryClient();

        expect(() =>
            renderToStaticMarkup(
                createElement(
                    QueryClientProvider,
                    { client },
                    createElement(RuntimeProvider, {
                        value: runtime,
                        children: createElement(Query, { props: { path: '/api/user' }, children: null }),
                    })
                )
            )
        ).toThrow('Query requires an "id" parameter');
    });
});
