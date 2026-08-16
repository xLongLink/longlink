import type { ASTNode } from './types';
import { parseXML as parseAst } from './core/parser';

/** Parses one XML document. */
export function parseXML(xml: string): [ASTNode] {
    const ast = parseAst(xml);
    const [root] = ast;

    if (ast.length !== 1 || root?.name !== 'longlink') {
        throw new Error('XML pages must contain exactly one longlink root');
    }

    return [root];
}

export { createContext } from './core/context';
export { RenderXML } from './renderers';
export type { ASTNode, RuntimeServices, Scope, XmlRuntime } from './types';
