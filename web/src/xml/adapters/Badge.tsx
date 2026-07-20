import { Badge as AstryxBadge } from '@astryxdesign/core/Badge';
import type { Props } from '@/xml/types';
import { useXmlContext } from '@/xml/core/context';
import { resolveXmlEnum, resolveXmlLabel } from './props';

/** Renders an Astryx badge with a serializable label. */
export function Badge({ props }: Props) {
    const { ctx } = useXmlContext();
    const label = resolveXmlLabel(props, ctx, 'Badge');
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
