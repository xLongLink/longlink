import { Badge as AstryxBadge } from '@astryxdesign/core/Badge';
import { useXmlRuntime } from '../core/context';
import { resolveXmlEnum, resolveXmlLabel } from '../core/props';
import type { Props } from '../types';

/** Renders an Astryx badge with a serializable label. */
export function Badge({ props }: Props) {
    const { scope: ctx, services } = useXmlRuntime();
    const label = resolveXmlLabel(props, ctx, services, 'Badge');
    const variant = resolveXmlEnum(
        props,
        'variant',
        ctx,
        [
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
        ],
        'neutral',
        'Badge'
    );

    return <AstryxBadge label={label} variant={variant} />;
}
