import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ContextProvider } from '@xml/core/context';
import { parseXML } from '@xml/core/parser';
import { RenderXML } from '@xml/renderers.tsx';
import type { ExecutionContext } from '@xml/types';
import { describe, expect, it } from 'bun:test';
import { createElement, Fragment } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

describe('Query', () => {
    /* The compiler should preserve query attributes for self-closing query nodes. */
    it('compiles query xml into a query ast node', () => {
        expect(parseXML('<Query id="user" path="/api/user" />')).toEqual([
            {
                name: 'Query',
                params: { id: 'user', path: '/api/user' },
                children: [],
            },
        ]);
    });

    /* Query nodes must reject nested children so invalid layouts fail fast. */
    it('throws when children are present', () => {
        const runtime: ExecutionContext = { setups: {}, invalidate: async () => {}, values: {} };
        const client = new QueryClient();
        const ast = parseXML('<Query id="user" path="/api/user"><P>Ready</P></Query>');

        expect(() =>
            renderToStaticMarkup(
                createElement(
                    QueryClientProvider,
                    { client },
                    createElement(ContextProvider, {
                        value: runtime,
                        children: createElement(Fragment, null, createElement(RenderXML, { ast, ctx: runtime })),
                    })
                )
            )
        ).toThrow('Query cannot have children');
    });

    /* Query should reject missing ids so invalid XML fails fast. */
    it('throws when id is missing', () => {
        const runtime: ExecutionContext = { setups: {}, invalidate: async () => {}, values: {} };
        const client = new QueryClient();
        const ast = parseXML('<Query path="/api/user" />');

        expect(() =>
            renderToStaticMarkup(
                createElement(
                    QueryClientProvider,
                    { client },
                    createElement(ContextProvider, {
                        value: runtime,
                        children: createElement(Fragment, null, createElement(RenderXML, { ast, ctx: runtime })),
                    })
                )
            )
        ).toThrow('Query requires a string id');
    });
});
