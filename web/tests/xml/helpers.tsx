import { createElement } from 'react';
import { MemoryRouter } from 'react-router';
import { renderToStaticMarkup } from 'react-dom/server';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ASTNode, ExecutionContext } from '@/xml/types';
import { RenderXML } from '@/xml/renderers.tsx';

/** Renders XML AST through the providers required by runtime components. */
export function renderXmlToMarkup(
    ast: ASTNode[],
    ctx: ExecutionContext = { setups: {}, invalidate: async () => {}, values: {} },
    baseUrl = ''
): string {
    const queryClient = new QueryClient();

    return renderToStaticMarkup(
        createElement(
            QueryClientProvider,
            { client: queryClient },
            createElement(
                MemoryRouter,
                null,
                createElement('div', null, createElement(RenderXML, { ast, ctx, baseUrl }))
            )
        )
    );
}
