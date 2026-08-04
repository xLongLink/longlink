import { createElement, type ComponentProps, type ReactNode } from 'react';
import * as v1 from './v1';
import type { ASTNode } from './v1/types';

export const XML_SYNTAX_VERSION = v1.XML_SYNTAX_VERSION;

type XmlRuntime = {
    RenderXML: typeof v1.RenderXML;
};

const runtimes: Record<string, XmlRuntime> = {
    [v1.XML_SYNTAX_VERSION]: {
        RenderXML: v1.RenderXML,
    },
};

/** Parses one XML document and verifies its declared runtime syntax. */
export function parseXML(xml: string): ASTNode[] {
    const ast = v1.parseXML(xml);

    runtimeFor(ast);
    return ast;
}

/** Renders XML through the runtime declared by its root node. */
export function RenderXML(props: ComponentProps<typeof v1.RenderXML>): ReactNode {
    const runtime = runtimeFor(props.ast);

    return createElement(runtime.RenderXML, props);
}

/** Returns the runtime selected by a complete XML document root. */
function runtimeFor(ast: ASTNode[]): XmlRuntime {
    const [root] = ast;

    // XML pages have one versioned LongLink root.
    if (ast.length !== 1 || root?.name !== 'longlink') {
        throw new Error('XML pages must contain exactly one longlink root');
    }

    const version = root.params?.version;
    const runtime = typeof version === 'string' ? runtimes[version] : undefined;

    // Do not render documents for a runtime this bundle does not include.
    if (!runtime) {
        throw new Error(`Unsupported LongLink XML syntax version: ${version ?? 'missing'}`);
    }

    return runtime;
}

export { createContext, resolveRequestUrl } from './v1';
export type { ASTNode, ExecutionContext } from './v1';
