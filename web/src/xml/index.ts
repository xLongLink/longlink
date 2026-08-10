import { createElement, type ComponentProps, type ReactNode } from 'react';
import * as v1 from './v1';
import type { ASTNode } from './v1/types';

export const XML_SYNTAX_VERSION = v1.XML_SYNTAX_VERSION;

/** Parses one XML document and verifies its declared runtime syntax. */
export function parseXML(xml: string): ASTNode[] {
    const ast = v1.parseXML(xml);

    validateRuntime(ast);
    return ast;
}

/** Renders XML through the runtime declared by its root node. */
export function RenderXML(props: ComponentProps<typeof v1.RenderXML>): ReactNode {
    validateRuntime(props.ast);

    return createElement(v1.RenderXML, props);
}

/** Validate the runtime declared by a complete XML document root. */
function validateRuntime(ast: ASTNode[]): void {
    const [root] = ast;

    // XML pages have one versioned LongLink root.
    if (ast.length !== 1 || root?.name !== 'longlink') {
        throw new Error('XML pages must contain exactly one longlink root');
    }

    const version = root.params?.version;

    // Do not render documents for a runtime this bundle does not include.
    if (version !== XML_SYNTAX_VERSION) {
        throw new Error(`Unsupported LongLink XML syntax version: ${version ?? 'missing'}`);
    }
}

export { createContext, resolveRequestUrl } from './v1';
export type { ASTNode, ExecutionContext } from './v1';
