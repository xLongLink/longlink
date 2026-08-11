import { renderToStaticMarkup } from 'react-dom/server';
import { createContext } from '@/xml/v1/core/context';
import { compileAttribute } from '@/xml/v1/expressions';
import { RenderXML } from '@/xml/v1/renderers';
import type { ASTNode, ASTProps, ExecutionContext } from '@/xml/v1/types';

/** Compiles string fixture attributes through the same document compiler rules. */
export function compileProps(props: Record<string, string>): ASTProps {
    return Object.fromEntries(
        Object.entries(props).map(([name, value]) => [
            name,
            compileAttribute(value, name === 'field' || name === 'i18n'),
        ])
    );
}

/** Renders XML AST to static markup. */
export function renderXmlToMarkup(ast: ASTNode[], ctx: ExecutionContext = createContext(), baseUrl = ''): string {
    return renderToStaticMarkup(<RenderXML ast={ast} baseUrl={baseUrl} ctx={ctx} />);
}
