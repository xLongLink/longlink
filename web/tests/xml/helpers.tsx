import * as xml from '@/xml';
import { ApiProvider } from '@/providers';
import { createContext } from '@/xml/core/context';
import { renderToStaticMarkup } from 'react-dom/server';
import { LayerProvider } from '@astryxdesign/core/Layer';
import { compileAttribute } from '@/xml/expressions/compile';
import type { ASTNode, ASTProps, XmlRuntime } from '@/xml/types';

/** Compiles string fixture attributes through the same document compiler rules. */
export function compileProps(props: Record<string, string>): ASTProps {
    return Object.fromEntries(Object.entries(props).map(([name, value]) => [name, compileAttribute(value)]));
}

/** Renders the real XML runtime with application-owned error reporting. */
export function RenderXML(props: { ast: ASTNode; ctx: XmlRuntime }) {
    return (
        <LayerProvider>
            <ApiProvider>
                <xml.RenderXML {...props} />
            </ApiProvider>
        </LayerProvider>
    );
}

/** Renders XML AST to static markup. */
export function renderXmlToMarkup(ast: ASTNode[], ctx: XmlRuntime = createContext()): string {
    return renderToStaticMarkup(<RenderXML ast={{ name: 'longlink', params: {}, children: ast }} ctx={ctx} />);
}
