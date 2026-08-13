import type { BadgeVariant } from '@astryxdesign/core-0-3/Badge';
import { Badge as AstryxBadge } from '@astryxdesign/core-0-3/Badge';
import type { Props } from '../types';
import { renderNode } from '../core/node';
import { BADGE_VARIANTS } from '../constants';
import { useXmlRuntime } from '../core/context';
import { isXmlEnum, requireXmlString, resolveXml } from '../core/props';

const badgeVariants: readonly BadgeVariant[] = BADGE_VARIANTS;

/**
 * https://astryx.atmeta.com/components/Badge?tab=properties
 * - label: string
 * - id: string
 * - variant: str
 * - children: Icon
 */
export function Badge({ props, nodes }: Props) {
    const { scope: ctx } = useXmlRuntime();
    const id = resolveXml(props, 'id', ctx);
    const label = requireXmlString(props, 'label', ctx, 'Badge');
    const variant = resolveXml(props, 'variant', ctx);

    if (variant != null && !isXmlEnum(variant, badgeVariants)) {
        throw new Error(`Unsupported Badge variant '${variant}'`);
    }

    const iconNodes = nodes.map((node) => {
        const slot = resolveXml(node.params, 'slot', ctx);
        if (slot != null && slot !== 'icon') {
            throw new Error(`Badge does not support the ${String(slot)} slot`);
        }

        if (node.name !== 'Icon') {
            throw new Error('Badge icon slot only supports Icon');
        }

        const { slot: _slot, ...iconProps } = node.params;
        return { ...node, params: iconProps };
    });

    if (iconNodes.length > 1) {
        throw new Error('Badge icon slot accepts one child');
    }

    return (
        <AstryxBadge
            icon={renderNode(iconNodes, ctx)}
            id={typeof id === 'string' ? id : undefined}
            label={label}
            variant={variant}
        />
    );
}
