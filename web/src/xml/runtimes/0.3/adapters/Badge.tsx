import { Badge as AstryxBadge } from '@astryxdesign/core-0-3/Badge';
import type { BadgeVariant } from '@astryxdesign/core-0-3/Badge';
import { useXmlRuntime } from '../core/context';
import { requireXmlString, resolveXml } from '../core/props';
import { renderXmlSlot } from '../core/slots';
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

    if (
        variant != null &&
        variant !== 'neutral' &&
        variant !== 'info' &&
        variant !== 'success' &&
        variant !== 'warning' &&
        variant !== 'error' &&
        variant !== 'blue' &&
        variant !== 'cyan' &&
        variant !== 'green' &&
        variant !== 'orange' &&
        variant !== 'pink' &&
        variant !== 'purple' &&
        variant !== 'red' &&
        variant !== 'teal' &&
        variant !== 'yellow'
    ) {
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
