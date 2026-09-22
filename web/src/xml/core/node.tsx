import type { ReactNode } from 'react';
import type { ASTNode, Scope } from '../types';
import { sdkXmlComponentRegistry } from './registry';
import { isVisibleXmlNode, resolveXmlValue } from './props';

/** Finds the closest registry supplied by the XML host. */
function registryFor(ctx: Scope) {
    let scope: Scope | undefined = ctx;

    while (scope) {
        if (scope.registry) return scope.registry;
        scope = scope.parent;
    }

    return sdkXmlComponentRegistry;
}

/** Renders XML AST nodes using the active runtime context. */
export function renderNode(nodes: ASTNode[], ctx: Scope): ReactNode {
    const registry = registryFor(ctx);
    const keyCounts = new Map<string, number>();

    return nodes.map((node) => {
        // Render parser-generated text directly rather than through a public XML component.
        if (node.name === '$text') {
            const value = resolveXmlValue(node.params, 'value', ctx);

            return value == null ? null : String(value);
        }

        // Suppress setup-only nodes during render.
        if (node.name === 'State' || node.name === 'Query') {
            return null;
        }

        // Handle conditional rendering with "if" parameter.
        if (!isVisibleXmlNode(node, ctx)) return null;

        const RegisteredComponent = registry[node.name];

        // Render registered XML components directly.
        if (RegisteredComponent !== undefined) {
            const nodeKey = `${node.name}-${JSON.stringify(node.params)}`;
            const occurrence = keyCounts.get(nodeKey) ?? 0;
            keyCounts.set(nodeKey, occurrence + 1);

            return <RegisteredComponent key={`${nodeKey}-${occurrence}`} props={node.params} nodes={node.children} />;
        }

        throw new Error(`Unknown component "${node.name}"`);
    });
}
