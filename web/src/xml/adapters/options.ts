import { z } from 'zod';
import type { ASTNode, Scope } from '../types';
import { isVisibleXmlNode, resolveXmlProps, xmlNonblankStringSchema } from '../core/props';

const optionPropsSchema = z.object({
    label: z.string().optional(),
    value: xmlNonblankStringSchema,
});

/** Resolves visible Option nodes for choice controls. */
export function resolveOptions(nodes: ASTNode[], scope: Scope) {
    return nodes
        .filter((node) => node.name === 'Option' && isVisibleXmlNode(node, scope))
        .map((node) => {
            const { label, value } = resolveXmlProps(
                node.params,
                scope,
                { label: 'scalar', value: 'raw' },
                optionPropsSchema
            );

            return { label: label ?? value, value };
        });
}
