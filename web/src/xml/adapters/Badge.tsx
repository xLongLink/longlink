import type { Props } from '../types';
import { renderNode } from '../core/node';
import { useXmlRuntime } from '../core/context';
import { Badge as AstryxBadge } from '@astryxdesign/core/Badge';

export function Badge({ nodes }: Props) {
    const { scope: ctx } = useXmlRuntime();
    const iconNodes = nodes.filter((node) => node.name === 'Icon');
    const contentNodes = nodes.filter((node) => node.name !== 'Icon');

    if (iconNodes.length > 1) {
        throw new Error('Badge accepts one Icon child');
    }

    return <AstryxBadge icon={renderNode(iconNodes, ctx)} label={renderNode(contentNodes, ctx)} />;
}
