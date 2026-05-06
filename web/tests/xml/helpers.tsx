import { render } from '@/xml/renderers';
import type { ASTNode, ExecutionContext } from '@/xml/types';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

/** Renders XML AST through the providers required by runtime components. */
export function renderXmlToMarkup(ast: ASTNode[], ctx: ExecutionContext = {}, baseUrl = ''): string {
    const queryClient = new QueryClient();

    return renderToStaticMarkup(
        createElement(
            QueryClientProvider,
            { client: queryClient },
            createElement('div', null, render(ast, ctx, baseUrl))
        )
    );
}
