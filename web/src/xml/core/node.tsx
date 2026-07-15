import { Fragment, type ReactNode } from 'react';
import type { ASTNode, ExecutionContext } from '../types';
import { For } from '../adapters';
import { evaluate } from '../expressions';
import { xmlComponentRegistry } from './registry';

/** Renders XML AST nodes using the active runtime context. */
export function renderNode(nodes: ASTNode[], ctx: ExecutionContext): ReactNode {
    return nodes.map((node, index) => {
        // Reject styling-only XML props so invalid attributes fail fast.
        if (node.params?.className != null) {
            throw new Error('className is not supported in XML');
        }

        // Handle conditional rendering with "if" parameter.
        if (node.params?.if != null) {
            // Skip nodes when their XML condition is false.
            if (!evaluate(node.params.if, ctx)) {
                return <Fragment key={index} />;
            }
        }

        // Suppress setup-only nodes during render.
        if (node.name === 'State' || node.name === 'Query') {
            return <Fragment key={index} />;
        }

        const RegisteredComponent = xmlComponentRegistry[node.name];

        // Render registered XML components directly.
        if (RegisteredComponent) {
            return <RegisteredComponent key={index} props={node.params ?? {}} nodes={node.children ?? []} />;
        }

        // Delegate loop nodes to the scoped For adapter.
        if (node.name === 'For') {
            // Require a loop item alias.
            if (!node.params?.as) throw new Error(`For requires an "as" parameter`);

            // Require a loop source expression.
            if (!node.params?.each) throw new Error(`For requires an "each" parameter`);

            const each = evaluate(node.params.each, ctx);

            // Skip loop rendering when the source is not an array.
            if (!Array.isArray(each)) return <Fragment key={index} />;
            return <For key={index} props={node.params} nodes={node.children ?? []} />;
        }

        throw new Error(`Unknown component "${node.name}"`);
    });
}
