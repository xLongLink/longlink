import { Icon as AstryxIcon, type IconName } from '@astryxdesign/core/Icon';
import type { Props } from '@/xml/types';
import { useXmlContext } from '@/xml/core/context';
import { requireXmlString, resolveXmlEnum } from './props';

/** Renders a semantic icon from the active Astryx theme registry. */
export function Icon({ props }: Props) {
    const { ctx } = useXmlContext();
    const icon = requireXmlString(props, 'icon', ctx, 'Icon');
    const size = resolveXmlEnum(props, 'size', ctx, ['xsm', 'sm', 'md', 'lg'], 'md', 'Icon');
    const color = resolveXmlEnum(
        props,
        'color',
        ctx,
        [
            'primary',
            'secondary',
            'tertiary',
            'disabled',
            'accent',
            'success',
            'error',
            'warning',
            'inherit',
            'blue',
            'red',
            'green',
            'gray',
            'cyan',
            'teal',
            'yellow',
            'orange',
            'pink',
            'purple',
        ],
        'inherit',
        'Icon'
    );

    return <AstryxIcon color={color} icon={icon as IconName} size={size} />;
}
