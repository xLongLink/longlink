import type { ReactNode } from 'react';
import type { ASTNode, Scope } from '../types';
import { renderNode } from './node';
import { isXmlString, resolveXml } from './props';

type SlotOptions = {
    allowedNodes: readonly string[];
    componentName: string;
    name: string;
};

/** Renders a single named XML child slot without forwarding its XML-only attribute. */
export function renderXmlSlot(nodes: ASTNode[], ctx: Scope, options: SlotOptions): ReactNode {
    const slotNodes: ASTNode[] = [];

    // Assign direct children to the sole unambiguous slot and validate explicit slot declarations.
    for (const node of nodes) {
        const slot = resolveXml(node.params, 'slot', ctx);
        if (slot != null && (!isXmlString(slot) || slot !== options.name)) {
            throw new Error(`${options.componentName} does not support the ${String(slot)} slot`);
        }

        if (!options.allowedNodes.includes(node.name)) {
            throw new Error(
                `${options.componentName} ${options.name} slot only supports ${options.allowedNodes.join(' or ')}`
            );
        }

        slotNodes.push({
            ...node,
            params: Object.fromEntries(Object.entries(node.params).filter(([name]) => name !== 'slot')),
        });
    }

    // Visual slots represent one ReactNode prop, so more than one child is ambiguous.
    if (slotNodes.length > 1) {
        throw new Error(`${options.componentName} ${options.name} slot accepts one child`);
    }

    return renderNode(slotNodes, ctx);
}
