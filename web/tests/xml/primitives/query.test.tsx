import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { parseXML } from '@xml/core/parser';
import { RuntimeProvider } from '@xml/core/runtime';
import { RenderXML } from '@xml/renderers.tsx';
import type { ExecutionContext } from '@xml/types';
import { describe, expect, it } from 'bun:test';
import { createElement, Fragment } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

describe('Query', () => {
    /* The compiler should preserve query attributes and nested content. */
    it('compiles query xml into a query ast node', () => {
        expect(parseXML('<Query id="user" path="/api/user"><p>Ready</p></Query>')).toEqual([
            {
                name: 'Query',
                params: { id: 'user', path: '/api/user' },
                children: [{ name: 'p', children: [{ name: 'Text', params: { value: 'Ready' } }] }],
            },
        ]);
    });

    /* Query should reject missing ids so invalid XML fails fast. */
    it('throws when id is missing', () => {
        const runtime: ExecutionContext = { values: {} };
        const client = new QueryClient();
        const ast = parseXML('<Query path="/api/user">x</Query>');

        expect(() =>
            renderToStaticMarkup(
                createElement(
                    QueryClientProvider,
                    { client },
                    createElement(RuntimeProvider, {
                        value: runtime,
                        children: createElement(Fragment, null, createElement(RenderXML, { ast, ctx: runtime })),
                    })
                )
            )
        ).toThrow('Query requires a string id');
    });
});
