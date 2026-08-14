import { createElement } from 'react';
import type { ASTNode } from './runtime/types';
import * as runtime from './runtime';

/** Verifies that an XML document contains one unversioned LongLink root. */
function assertPageRoot(ast: ASTNode[]): void {
    const [root] = ast;

    if (ast.length !== 1 || root?.name !== 'longlink') {
        throw new Error('XML pages must contain exactly one longlink root');
    }

    if (root.params.version) throw new Error('XML page version attributes are not supported');
}

/** Parses one XML document. */
export function parseXML(xml: string): ASTNode[] {
    const ast = runtime.parseXML(xml);

    assertPageRoot(ast);
    return ast;
}

/** Renders one XML page. */
export function RenderXML({ ast, ...props }: Parameters<typeof runtime.RenderXML>[0]) {
    assertPageRoot(ast);

    return createElement(runtime.RenderXML, { ast, ...props });
}

export { createContext, resolveRequestUrl } from './runtime';
export type { ASTNode, RuntimeServices, Scope, XmlRuntime } from './runtime';
