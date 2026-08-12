import { createElement } from 'react';
import type { ASTNode } from './runtimes/0.3/types';
import * as v0_3 from './runtimes/0.3';

/** Returns the declared XML runtime version from a complete document AST. */
export function getXmlRuntimeVersion(ast: ASTNode[]): string {
    const [root] = ast;
    const version = root?.params.version;

    if (ast.length !== 1 || root?.name !== 'longlink' || version?.kind !== 'text') {
        throw new Error('XML pages must contain exactly one versioned longlink root');
    }

    return version.value;
}

/** Verifies that a document uses the installed XML runtime version. */
function assertSupportedRuntime(ast: ASTNode[]): void {
    const version = getXmlRuntimeVersion(ast);
    if (version !== '0.3') throw new Error(`Unsupported LongLink XML runtime version: ${version}`);
}

/** Parses one XML document and verifies its declared runtime syntax. */
export function parseXML(xml: string): ASTNode[] {
    const ast = v0_3.parseXML(xml);

    assertSupportedRuntime(ast);
    return ast;
}

/** Renders a document through the adapter set selected by its declared runtime version. */
export function RenderXML({ ast, ...props }: Parameters<typeof v0_3.RenderXML>[0]) {
    assertSupportedRuntime(ast);

    return createElement(v0_3.RenderXML, { ast, ...props });
}

export { createContext, resolveRequestUrl } from './runtimes/0.3';
export type { ASTNode, RuntimeServices, Scope, XmlRuntime } from './runtimes/0.3';
