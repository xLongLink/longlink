import { XmlErrorBoundary } from '@xml/core/errors';
import { compile, evaluate } from '@xml/core/expressions';
import { For } from '@xml/primitives/For';
import { Text } from '@xml/primitives/Text';
import { registry } from '@xml/registry';
import type { ASTNode, ExecutionContext } from '@xml/types';
import { Fragment, type ReactNode } from 'react';

/** Renders XML AST nodes using the active runtime context. */
export function renderNode(node: ASTNode | ASTNode[] | null, ctx: ExecutionContext): ReactNode {
    // Handle null/undefined early to avoid unnecessary registry lookups and error boundaries.
    if (!node) return <></>;

    // Handle arrays of nodes as fragments with stable keys.
    if (Array.isArray(node)) {
        return node.map((child, index) => <Fragment key={index}>{renderNode(child, ctx)}</Fragment>);
    }

    // Handle conditional rendering with "if" parameter.
    if (node.params?.if != null) {
        if (!Boolean(evaluate(node.params.if, ctx))) {
            return <></>;
        }
    }

    // For and State component are already handled in the setupContext
    if (node.name === 'State' || node.name === 'Query') return <></>;

    // Special handling for "For" component to support array iteration and scoped variables.
    if (node.name === 'For') {
        // If there are no children, there's nothing to render, so we can skip the "For" component entirely.
        if (!node.children) return <></>;

        // Ensure that the parameters are defined
        if (!node.params?.as) throw new Error(`Missing "as" parameter on "For" component`);
        if (!node.params?.each) throw new Error(`Missing "each" parameter on "For" component`);

        let each = evaluate(node.params.each, ctx);

        if (!Array.isArray(each)) throw new Error(`For.each must evaluate to an array, but got ${typeof each}`);
        return <For each={each} as={node.params.as} children={node.children} />;
    }

    if (node.name === 'Text') {
        if (!node.params?.value) return <></>;

        return <Text value={String(evaluate(node.params.value, ctx) ?? '')} />;
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
                resolved[key] = evaluate(value, ctx);
            } catch (error) {
                throw new Error(
                    `Failed to evaluate ${node.name}.${key}="${value}": ${error instanceof Error ? error.message : String(error)}`
                );
            }
        }
    }

    const Component = registry[node.name];
    if (!Component) throw new Error(`Unknown component "${node.name}"`);

    return (
        <XmlErrorBoundary resetKey={node}>
            <Component {...resolved} children={node.children} />
        </XmlErrorBoundary>
    );
}
