import { renderToStaticMarkup } from 'react-dom/server';
import type { ASTNode, ASTProps, XmlRuntime } from '@/xml/types';
import { RenderXML } from '@/xml';
import { createContext } from '@/xml/core/context';
import { compileAttribute } from '@/xml/expressions';

/** Compiles string fixture attributes through the same document compiler rules. */
export function compileProps(props: Record<string, string>): ASTProps {
    return Object.fromEntries(Object.entries(props).map(([name, value]) => [name, compileAttribute(value)]));
}

/** Renders XML AST to static markup. */
export function renderXmlToMarkup(ast: ASTNode[], ctx: XmlRuntime = createContext(), baseUrl = ''): string {
    return renderToStaticMarkup(
        <RenderXML ast={[{ name: 'longlink', params: {}, children: ast }]} baseUrl={baseUrl} ctx={ctx} />
    );
}
