import { XmlErrorBoundary } from '@xml/core/errors';
import { compile, evaluate } from '@xml/core/expressions';
import { registry } from '@xml/registry';
import type { ExecutionContext, RenderableASTNode } from '@xml/types';
import { Fragment, type ReactNode } from 'react';

/** Renders XML AST nodes using the active runtime context. */
export function renderNode(node: RenderableASTNode, ctx: ExecutionContext): ReactNode {
    const runtime = ctx;

    // Handle null/undefined early to avoid unnecessary registry lookups and error boundaries.
    if (!node) return <></>;

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

    if (node.name === 'For') {
        const For = registry['For'];
        if (!For) throw new Error(`Missing "For" component in registry`);
        if (!node.params?.as) throw new Error(`Missing "as" parameter on "For" component`);
        if (!node.params?.each) throw new Error(`Missing "each" parameter on "For" component`);

        const each = evaluate(node.params.each, runtime);
        if (!Array.isArray(each))
            throw new Error(`"each" parameter on "For" component must be an array, got ${typeof each}`);

        return <For each={each} as={node.params.as} children={node.children} />;
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
