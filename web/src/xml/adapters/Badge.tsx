import { Badge as AstryxBadge } from '@astryxdesign/core-0-3/Badge';
import type { Props } from '../types';
import { renderNode } from '../core/node';
import { useXmlRuntime } from '../core/context';
import { requireXmlString, resolveXml } from '../core/props';

/**
 * checked: 2026-08-13
 * https://astryx.atmeta.com/components/Badge?tab=properties
 * - label: string
 * - children: Icon
 */
export function Badge({ props, nodes }: Props) {
    const { scope: ctx } = useXmlRuntime();
    const label = requireXmlString(props, 'label', ctx, 'Badge');

    for (const node of nodes) {
        const slot = resolveXml(node.params, 'slot', ctx);
        if (slot != null && slot !== 'icon') {
            throw new Error(`Badge does not support the ${String(slot)} slot`);
        }

        if (node.name !== 'Icon') {
            throw new Error('Badge icon slot only supports Icon');
        }
    }

    if (nodes.length > 1) {
        throw new Error('Badge icon slot accepts one child');
    }

    return <AstryxBadge icon={renderNode(nodes, ctx)} label={label} />;
}
