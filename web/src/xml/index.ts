import type { ASTNode } from './types';
import { parseXML as parseAst } from './core/parser';

/** Verifies that an XML document contains one LongLink root. */
function assertPageRoot(ast: ASTNode[]): asserts ast is [ASTNode] {
    const [root] = ast;

    if (ast.length !== 1 || root?.name !== 'longlink') {
        throw new Error('XML pages must contain exactly one longlink root');
    }
}

/** Parses one XML document. */
export function parseXML(xml: string): [ASTNode] {
    const ast = parseAst(xml);

    assertPageRoot(ast);
    return ast;
}

export { createContext } from './core/context';
export { resolveRequestUrl } from './core/url';
export { RenderXML } from './renderers';
export type { ASTNode, RuntimeServices, Scope, XmlRuntime } from './types';
