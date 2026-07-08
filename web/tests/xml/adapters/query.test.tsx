import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ContextProvider } from '@/xml/core/context';
import { parseXML } from '@/xml/core/parser';
import { RenderXML } from '@/xml/renderers.tsx';
import type { ExecutionContext } from '@/xml/types';
import { describe, expect, it } from 'bun:test';
import { createElement, Fragment } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

describe('Query', () => {
    /* Query nodes must render a scoped setup error when invalid layouts include children. */
    it('renders an error when children are present', () => {
        const runtime: ExecutionContext = { setups: {}, invalidate: async () => {}, values: {} };
        const client = new QueryClient();
        const ast = parseXML('<Query id="user" path="/api/user"><P i18n="query.ready" /></Query>');

        expect(
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
        ).toContain('Query cannot have children');
    });

    /* Query should render a clear scoped runtime error when ids are missing. */
    it('renders an error when id is missing', () => {
        const runtime: ExecutionContext = { setups: {}, invalidate: async () => {}, values: {} };
        const client = new QueryClient();
        const ast = parseXML('<Query path="/api/user" />');

        expect(
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
        ).toContain('Query requires a string id');
    });
});
