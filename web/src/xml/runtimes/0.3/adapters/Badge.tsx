import { Badge as AstryxBadge } from '@astryxdesign/core-0-3/Badge';
import { useXmlRuntime } from '../core/context';
import { requireXmlString, resolveXmlEnum } from '../core/props';
import type { Props } from '../types';

/** Renders an Astryx badge with a serializable label. */
export function Badge({ props }: Props) {
    const { scope: ctx } = useXmlRuntime();
    const label = requireXmlString(props, 'label', ctx, 'Badge');
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
