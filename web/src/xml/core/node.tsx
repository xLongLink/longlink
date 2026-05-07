import { XmlErrorBoundary } from '@xml/core/errors';
import { compile, evaluate } from '@xml/core/expressions';
import { RuntimeContext } from '@xml/core/runtime';
import { registry } from '@xml/registry';
import type { ExecutionContext, RenderableASTNode } from '@xml/types';
import { Fragment, useContext as useReactContext, type ReactNode } from 'react';

/** Renders XML AST nodes using the active runtime context when present. */
export function renderNode(node: RenderableASTNode, ctx?: ExecutionContext): ReactNode {
    const runtime = ctx ?? useReactContext(RuntimeContext) ?? { values: {} };

    // Handle null/undefined early to avoid unnecessary registry lookups and error boundaries.
    if (!node) return <></>;
    if (typeof node === 'string' || typeof node === 'number') return node;
    if (typeof node === 'boolean') return <></>;

    let rendered: ReactNode;

    // Handle arrays of nodes as fragments with stable keys.
    if (Array.isArray(node)) {
        return node.map((child, index) => <Fragment key={index}>{renderNode(child, runtime)}</Fragment>);
    }

    // Handle conditional rendering with "if" parameter.
    if (node.params?.if != null) {
        if (!Boolean(evaluate(node.params.if, runtime))) {
            return <></>;
        }
    }

    const resolved: Record<string, unknown> = {};

    /* Resolve XML attributes into component props and compile event handlers lazily. */
    if (node.params) {
        for (const [key, value] of Object.entries(node.params)) {
            if (key.startsWith('on') && key.length > 2 && key[2] === key[2]?.toUpperCase()) {
                resolved[key] = compile(value);
                continue;
            }

            resolved[key] = evaluate(value, runtime);
        }
    }

    if (node.name === 'State' || node.name === 'Query') return <></>;

    const Component = registry[node.name];
    if (!Component) throw new Error(`Unknown component "${node.name}"`);

    /* Pass the parsed XML attributes through as component props. */
    rendered = <Component {...resolved} children={node.children} />;

    return <XmlErrorBoundary resetKey={node}>{rendered}</XmlErrorBoundary>;
}
