import type { ReactNode } from 'react';
import { isVisibleXmlNode } from './props';
import { For } from './for';
import type { ASTNode, ExecutionContext } from '../types';
import { xmlComponentRegistry } from './registry';

/** Renders XML AST nodes using the active runtime context. */
export function renderNode(nodes: ASTNode[], ctx: ExecutionContext): ReactNode {
    return nodes.map((node, index) => {
        const props = node.params ?? {};

        // Reject consumer styling and callbacks so adapters retain control of behavior.
        for (const name of Object.keys(props)) {
            const lowerName = name.toLowerCase();
            if (lowerName === 'classname' || lowerName === 'style' || lowerName === 'xstyle') {
                throw new Error(`${name} is not supported in XML`);
            }

            if (lowerName.startsWith('on')) {
                throw new Error(`Event handler attribute "${name}" is not supported in XML`);
            }
        }

        // Handle conditional rendering with "if" parameter.
        if (!isVisibleXmlNode(node, ctx)) return null;

        // Suppress setup-only nodes during render.
        if (node.name === 'State' || node.name === 'Query') {
            return null;
        }

        const RegisteredComponent = xmlComponentRegistry[node.name];

        // Render registered XML components directly.
        if (RegisteredComponent) {
            return <RegisteredComponent key={index} props={props} nodes={node.children ?? []} />;
        }

        // Delegate loop nodes to the scoped core renderer.
        if (node.name === 'For') {
            // Require a loop item alias.
            if (!props.as) throw new Error(`For requires an "as" parameter`);

            // Require a loop source expression.
            if (!props.each) throw new Error(`For requires an "each" parameter`);

            return <For key={index} props={props} nodes={node.children ?? []} />;
        }

        throw new Error(`Unknown component "${node.name}"`);
    });
}
