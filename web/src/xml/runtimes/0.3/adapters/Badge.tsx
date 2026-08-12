import { Badge as AstryxBadge } from '@astryxdesign/core-0-3/Badge';
import type { BadgeVariant } from '@astryxdesign/core-0-3/Badge';
import { useXmlRuntime } from '../core/context';
import { renderNode } from '../core/node';
import { requireXmlString, resolveXmlString } from '../core/props';
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

/** Returns whether a value is one of an Astryx prop's supported values. */
function isAstryxValue<T>(value: unknown, values: readonly T[]): value is T {
    return values.includes(value as T);
}

/** Renders an Astryx badge with a serializable label. */
export function Badge({ props, nodes }: Props) {
    const { scope: ctx } = useXmlRuntime();
    const id = resolveXmlString(props, 'id', ctx);
    const label = requireXmlString(props, 'label', ctx, 'Badge');
    const variant = resolveXmlString(props, 'variant', ctx);

    if (variant != null && !isAstryxValue(variant, BADGE_VARIANTS)) {
        throw new Error(`Unsupported Badge variant '${variant}'`);
    }

    return <AstryxBadge icon={renderNode(nodes, ctx)} id={id} label={label} variant={variant} />;
}
