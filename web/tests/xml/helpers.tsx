import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RenderXML } from '@xml/renderers.tsx';
import type { ASTNode, ExecutionContext } from '@xml/types';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

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
            createElement('div', null, createElement(RenderXML, { ast, ctx, baseUrl }))
        )
    );
}
