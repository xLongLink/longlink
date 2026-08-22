import type { ReactNode } from 'react';
import type { ASTNode, Scope } from '../types';
import { xmlComponentRegistry } from './registry';
import { isVisibleXmlNode, resolveXmlValue } from './props';

/** Renders XML AST nodes using the active runtime context. */
export function renderNode(nodes: ASTNode[], ctx: Scope): ReactNode {
    return nodes.map((node, index) => {
        const props = node.params;

        // Render parser-generated text directly rather than through a public XML component.
        if (node.name === '$text') {
            const value = resolveXmlValue(props, 'value', ctx);

            return value == null ? null : String(value);
        }

        // Suppress setup-only nodes during render.
        if (node.name === 'State' || node.name === 'Query') {
            return null;
        }

        // Handle conditional rendering with "if" parameter.
        if (!isVisibleXmlNode(node, ctx)) return null;

        const RegisteredComponent = xmlComponentRegistry[node.name];

        // Render registered XML components directly.
        if (RegisteredComponent) {
            return <RegisteredComponent key={index} props={props} nodes={node.children} />;
        }

        throw new Error(`Unknown component "${node.name}"`);
    });
}
