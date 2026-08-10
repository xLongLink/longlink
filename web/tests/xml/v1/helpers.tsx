import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { RenderXML } from '@/xml/v1/renderers';
import type { ASTNode, ExecutionContext } from '@/xml/v1/types';

/** Renders XML AST to static markup. */
export function renderXmlToMarkup(
    ast: ASTNode[],
    ctx: ExecutionContext = { setups: {}, invalidate: async () => {}, values: {} },
    baseUrl = ''
): string {
    return renderToStaticMarkup(createElement(RenderXML, { ast, ctx, baseUrl }));
}
