import { z } from 'zod';
import type { Props } from '../types';
import { renderNode } from '../core/node';
import { BADGE_VARIANTS } from '../constants';
import { useXmlRuntime } from '../core/context';
import { resolveXmlProps } from '../core/props';
import { Badge as AstryxBadge } from '@astryxdesign/core/Badge';

const badgePropsSchema = z.object({ variant: z.enum(BADGE_VARIANTS).optional() });

export function Badge({ props, nodes }: Props) {
    const { scope: ctx } = useXmlRuntime();
    const { variant } = resolveXmlProps(props, ctx, badgePropsSchema);
    const iconNodes = nodes.filter((node) => node.name === 'Icon');
    const contentNodes = nodes.filter((node) => node.name !== 'Icon');

    if (iconNodes.length > 1) {
        throw new Error('Badge accepts one Icon child');
    }

    return <AstryxBadge icon={renderNode(iconNodes, ctx)} label={renderNode(contentNodes, ctx)} variant={variant} />;
}
