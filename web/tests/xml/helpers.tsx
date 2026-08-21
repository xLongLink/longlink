import { RenderXML } from '@/xml';
import { createContext } from '@/xml/core/context';
import { renderToStaticMarkup } from 'react-dom/server';
import { compileAttribute } from '@/xml/expressions/compile';
import type { ASTNode, ASTProps, XmlRuntime } from '@/xml/types';

/** Compiles string fixture attributes through the same document compiler rules. */
export function compileProps(props: Record<string, string>): ASTProps {
    return Object.fromEntries(Object.entries(props).map(([name, value]) => [name, compileAttribute(value)]));
}

/** Renders XML AST to static markup. */
export function renderXmlToMarkup(ast: ASTNode[], ctx: XmlRuntime = createContext(), baseUrl = ''): string {
    ctx.services.requestBaseUrl = baseUrl;

    return renderToStaticMarkup(<RenderXML ast={{ name: 'longlink', params: {}, children: ast }} ctx={ctx} />);
}
