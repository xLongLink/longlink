import { For, Text } from '@xml/adapters';
import { evaluate } from '@xml/core/expressions';
import { xmlComponentRegistry } from '@xml/core/registry';
import type { ASTNode, ExecutionContext } from '@xml/types';
import { Fragment, type ReactNode } from 'react';

/** Renders XML AST nodes using the active runtime context. */
export function renderNode(nodes: ASTNode[], ctx: ExecutionContext): ReactNode {
    return nodes.map((node, index) => {
        // Handle conditional rendering with "if" parameter.
        if (node.params?.if != null) {
            if (!evaluate(node.params.if, ctx)) {
                return <Fragment key={index} />;
            }
        }

        if (node.name === 'State' || node.name === 'Query') {
            return <Fragment key={index} />;
        }

        const RegisteredComponent = xmlComponentRegistry[node.name];
        if (RegisteredComponent) {
            return <RegisteredComponent key={index} props={node.params ?? {}} nodes={node.children ?? []} />;
        }

        if (node.name === 'For') {
            // Ensure that the parameters are defined
            if (!node.params?.as) throw new Error(`For requires an "as" parameter`);
            if (!node.params?.each) throw new Error(`For requires an "each" parameter`);

            const each = evaluate(node.params.each, ctx);

            if (!Array.isArray(each)) return <Fragment key={index} />;
            return <For key={index} props={node.params} nodes={node.children ?? []} />;
        }

        if (node.name === 'Text') {
            if (!node.params?.value) return <Fragment key={index} />;

            const value = evaluate(node.params.value, ctx);
            if (typeof value !== 'string')
                throw new Error(`Text.value must evaluate to a string, but got ${typeof value}`);

            return <Text key={index} props={node.params} nodes={node.children ?? []} />;
        }

        throw new Error(`Unknown component "${node.name}"`);
    });
}
