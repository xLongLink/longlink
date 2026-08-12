import { renderToStaticMarkup } from 'react-dom/server';
import { createContext } from '@/xml/runtimes/0.3/core/context';
import { compileAttribute } from '@/xml/runtimes/0.3/expressions';
import { RenderXML } from '@/xml/runtimes/0.3/renderers';
import type { ASTNode, ASTProps, XmlRuntime } from '@/xml/runtimes/0.3/types';

/** Compiles string fixture attributes through the same document compiler rules. */
export function compileProps(props: Record<string, string>): ASTProps {
    return Object.fromEntries(
        Object.entries(props).map(([name, value]) => [
            name,
            compileAttribute(value, name === 'field'),
        ])
    );
}

/** Renders XML AST to static markup. */
export function renderXmlToMarkup(ast: ASTNode[], ctx: XmlRuntime = createContext(), baseUrl = ''): string {
    return renderToStaticMarkup(<RenderXML ast={ast} baseUrl={baseUrl} ctx={ctx} />);
}
