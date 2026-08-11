import { renderToStaticMarkup } from 'react-dom/server';
import { createContext } from '@/xml/v1/core/context';
import { RenderXML } from '@/xml/v1/renderers';
import type { ASTNode, ExecutionContext } from '@/xml/v1/types';

/** Renders XML AST to static markup. */
export function renderXmlToMarkup(ast: ASTNode[], ctx: ExecutionContext = createContext(), baseUrl = ''): string {
    return renderToStaticMarkup(<RenderXML ast={ast} baseUrl={baseUrl} ctx={ctx} />);
}
