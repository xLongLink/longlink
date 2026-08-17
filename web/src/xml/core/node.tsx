import type { ReactNode } from 'react';
import type { ASTNode, Scope } from '../types';
import { For } from './for';
import { isVisibleXmlNode } from './props';
import { xmlComponentRegistry } from './registry';

/** Renders XML AST nodes using the active runtime context. */
export function renderNode(nodes: ASTNode[], ctx: Scope): ReactNode {
    return nodes.map((node, index) => {
        const props = node.params;

        // Handle conditional rendering with "if" parameter.
        if (!isVisibleXmlNode(node, ctx)) return null;

        // Suppress setup-only nodes during render.
        if (node.name === 'State' || node.name === 'Query') {
            return null;
        }

        const RegisteredComponent = xmlComponentRegistry[node.name];

        // Render registered XML components directly.
        if (RegisteredComponent) {
            return <RegisteredComponent key={index} props={props} nodes={node.children} />;
        }

        // Delegate loop nodes to the scoped core renderer.
        if (node.name === 'For') {
            // Require a loop item alias.
            if (!props.as) throw new Error(`For requires an "as" parameter`);

            // Require a loop source expression.
            if (!props.each) throw new Error(`For requires an "each" parameter`);

            return <For key={index} props={props} nodes={node.children} />;
        }

        throw new Error(`Unknown component "${node.name}"`);
    });
}
