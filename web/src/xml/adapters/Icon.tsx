import type { Props } from '@/xml/types';
import { renderIcon } from '@/lib/icons';
import { useXmlContext } from '@/xml/core/context';
import { requireXmlString, resolveXmlEnum } from './props';

const ICON_SIZES = { xsm: 12, sm: 16, md: 20, lg: 24 } as const;
const ICON_COLOR_CLASSES = {
    primary: 'text-primary',
    secondary: 'text-secondary',
    tertiary: 'text-secondary',
    disabled: 'text-disabled',
    accent: 'text-accent',
    success: 'text-success',
    error: 'text-error',
    warning: 'text-warning',
    inherit: '',
    blue: 'text-blue-vivid',
    red: 'text-red-vivid',
    green: 'text-green-vivid',
    gray: 'text-gray-vivid',
    cyan: 'text-cyan-vivid',
    teal: 'text-teal-vivid',
    yellow: 'text-yellow-vivid',
    orange: 'text-orange-vivid',
    pink: 'text-pink-vivid',
    purple: 'text-purple-vivid',
} as const;

/** Renders a supported Lucide icon in an XML page. */
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
    const renderedIcon = renderIcon(icon, {
        'aria-hidden': true,
        className: ICON_COLOR_CLASSES[color] || undefined,
        size: ICON_SIZES[size],
    });

    // Ignore unknown icon names rather than breaking the surrounding page.
    if (!renderedIcon) {
        return null;
    }

    return renderedIcon;
}
