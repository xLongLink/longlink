import { renderToStaticMarkup } from 'react-dom/server';
import type { ASTNode, ASTProps, XmlRuntime } from '@/xml/runtime/types';
import { RenderXML } from '@/xml/runtime/renderers';
import { createContext } from '@/xml/runtime/core/context';
import { compileAttribute } from '@/xml/runtime/expressions';

/** Compiles string fixture attributes through the same document compiler rules. */
export function compileProps(props: Record<string, string>): ASTProps {
    return Object.fromEntries(
        Object.entries(props).map(([name, value]) => [name, compileAttribute(value, name === 'field')])
    );
}

/** Renders XML AST to static markup. */
export function renderXmlToMarkup(ast: ASTNode[], ctx: XmlRuntime = createContext(), baseUrl = ''): string {
    return renderToStaticMarkup(<RenderXML ast={ast} baseUrl={baseUrl} ctx={ctx} />);
}
