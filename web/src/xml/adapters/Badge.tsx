import type { Props } from '../types';
import { renderNode } from '../core/node';
import { useXmlRuntime } from '../core/context';
import { resolveXml } from '../core/props';
import { Badge as UiBadge } from '@/components/ui/Badge';

export function Badge({ nodes }: Props) {
    const { scope: ctx } = useXmlRuntime();
    const iconNodes = nodes.filter((node) => node.name === 'Icon');
    const contentNodes = nodes.filter((node) => node.name !== 'Icon');

    for (const node of iconNodes) {
        const slot = resolveXml(node.params, 'slot', ctx);
        if (slot != null && slot !== 'icon') {
            throw new Error(`Badge does not support the ${String(slot)} slot`);
        }
    }

    if (iconNodes.length > 1) {
        throw new Error('Badge icon slot accepts one child');
    }

    return <UiBadge icon={renderNode(iconNodes, ctx)}>{renderNode(contentNodes, ctx)}</UiBadge>;
}
