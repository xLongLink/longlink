import { XmlErrorBoundary } from '@xml/core/errors';
import { compile, evaluate } from '@xml/core/expressions';
import { For } from '@xml/primitives/For';
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

    // Special handling for "For" component to support array iteration and scoped variables.
    if (node.name === 'For') {
        if (!For) throw new Error(`Missing "For" component in registry`);
        if (!node.params?.as) throw new Error(`Missing "as" parameter on "For" component`);
        if (!node.params?.each) throw new Error(`Missing "each" parameter on "For" component`);

        let each: unknown;
        try {
            each = evaluate(node.params.each, runtime);
        } catch (error) {
            throw new Error(
                `Failed to evaluate For.each="${node.params.each}": ${error instanceof Error ? error.message : String(error)}`
            );
        }

        if (!Array.isArray(each)) {
            throw new Error(`For.each must evaluate to an array, but got ${each === null ? 'null' : typeof each}`);
        }

        return <For each={each} as={node.params.as} children={node.children ?? null} />;
    }

    const resolved: Record<string, unknown> = {};

    /* Resolve XML attributes into component props and compile event handlers lazily. */
    if (node.params) {
        for (const [key, value] of Object.entries(node.params)) {
            if (key.startsWith('on') && key.length > 2 && key[2] === key[2]?.toUpperCase()) {
                resolved[key] = compile(value);
                continue;
            }

            try {
                resolved[key] = evaluate(value, runtime);
            } catch (error) {
                throw new Error(
                    `Failed to evaluate ${node.name}.${key}="${value}": ${error instanceof Error ? error.message : String(error)}`
                );
            }
        }
    }

    if (node.name === 'State' || node.name === 'Query') return <></>;

    const Component = registry[node.name];
    if (!Component) throw new Error(`Unknown component "${node.name}"`);

    /* Pass the parsed XML attributes through as component props. */
    rendered = <Component {...resolved} children={node.children} />;

    return <XmlErrorBoundary resetKey={node}>{rendered}</XmlErrorBoundary>;
}
