import { createElement } from 'react';
import type { ASTNode } from './runtimes/0.3/types';
import * as v0_3 from './runtimes/0.3';
import { getXmlRuntime, getXmlRuntimeVersion } from './runtimes';

/** Parses one XML document and verifies its declared runtime syntax. */
export function parseXML(xml: string): ASTNode[] {
    const ast = v0_3.parseXML(xml);

    getXmlRuntime(getXmlRuntimeVersion(ast));
    return ast;
}

/** Renders a document through the adapter set selected by its declared runtime version. */
export function RenderXML({ ast, ...props }: Parameters<typeof v0_3.RenderXML>[0]) {
    const runtime = getXmlRuntime(getXmlRuntimeVersion(ast));

    return createElement(runtime.render, { ast, ...props });
}

export { createContext, resolveRequestUrl } from './runtimes/0.3';
export { getXmlRuntimeVersion } from './runtimes';
export type { ASTNode, RuntimeServices, Scope, XmlRuntime } from './runtimes/0.3';
