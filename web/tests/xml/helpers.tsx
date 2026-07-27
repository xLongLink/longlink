import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { RenderXML } from '@/xml/renderers.tsx';
import type { ASTNode, ExecutionContext } from '@/xml/types';

/** Renders XML AST to static markup. */
export function renderXmlToMarkup(
    ast: ASTNode[],
    ctx: ExecutionContext = { setups: {}, invalidate: async () => {}, values: {} },
    baseUrl = ''
): string {
    return renderToStaticMarkup(createElement('div', null, createElement(RenderXML, { ast, ctx, baseUrl })));
}
