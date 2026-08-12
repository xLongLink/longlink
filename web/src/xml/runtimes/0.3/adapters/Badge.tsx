import { Badge as AstryxBadge } from '@astryxdesign/core-0-3/Badge';
import type { BadgeVariant } from '@astryxdesign/core-0-3/Badge';
import { useXmlRuntime } from '../core/context';
import { renderNode } from '../core/node';
import { isXmlEnum, isXmlString, requireXmlString, resolveXml } from '../core/props';
import type { Props } from '../types';

const BADGE_VARIANTS: readonly BadgeVariant[] = [
    'neutral',
    'info',
    'success',
    'warning',
    'error',
    'blue',
    'cyan',
    'green',
    'orange',
    'pink',
    'purple',
    'red',
    'teal',
    'yellow',
];

/** Renders an Astryx badge with a serializable label. */
export function Badge({ props, nodes }: Props) {
    const { scope: ctx } = useXmlRuntime();
    const id = resolveXml(props, 'id', ctx);
    const label = requireXmlString(props, 'label', ctx, 'Badge');
    const variant = resolveXml(props, 'variant', ctx);

    if (variant != null && !isXmlEnum(variant, BADGE_VARIANTS)) {
        throw new Error(`Unsupported Badge variant '${variant}'`);
    }

    return <AstryxBadge icon={renderNode(nodes, ctx)} id={isXmlString(id) ? id : undefined} label={label} variant={variant} />;
}
