import type { BadgeVariant } from '@astryxdesign/core-0-3/Badge';
import { Badge as AstryxBadge } from '@astryxdesign/core-0-3/Badge';
import type { Props } from '../types';
import { BADGE_VARIANTS } from '../constants';
import { renderXmlSlot } from '../core/slots';
import { useXmlRuntime } from '../core/context';
import { isXmlEnum, requireXmlString, resolveXml } from '../core/props';

const badgeVariants: readonly BadgeVariant[] = BADGE_VARIANTS;

/** Renders an Astryx badge with a serializable label. */
export function Badge({ props, nodes }: Props) {
    const { scope: ctx } = useXmlRuntime();
    const id = resolveXml(props, 'id', ctx);
    const label = requireXmlString(props, 'label', ctx, 'Badge');
    const variant = resolveXml(props, 'variant', ctx);

    if (variant != null && !isXmlEnum(variant, badgeVariants)) {
        throw new Error(`Unsupported Badge variant '${variant}'`);
    }

    return (
        <AstryxBadge
            icon={renderXmlSlot(nodes, ctx, { allowedNodes: ['Icon'], componentName: 'Badge', name: 'icon' })}
            id={typeof id === 'string' ? id : undefined}
            label={label}
            variant={variant}
        />
    );
}
