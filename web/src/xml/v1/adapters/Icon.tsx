import { renderIcon } from '@/lib/icons';
import { useXmlRuntime } from '../core/context';
import { requireXmlString, resolveXmlEnum } from '../core/props';
import type { Props } from '../types';

const ICON_SIZES = { xsm: 12, sm: 16, md: 20, lg: 24 } as const;

/** Renders a supported Lucide icon in an XML page. */
export function Icon({ props }: Props) {
    const { scope: ctx } = useXmlRuntime();
    const icon = requireXmlString(props, 'icon', ctx, 'Icon');
    const size = resolveXmlEnum(props, 'size', ctx, ['xsm', 'sm', 'md', 'lg'], 'md', 'Icon');
    const renderedIcon = renderIcon(icon, {
        'aria-hidden': true,
        size: ICON_SIZES[size],
    });

    // Ignore unknown icon names rather than breaking the surrounding page.
    if (!renderedIcon) {
        return null;
    }

    return renderedIcon;
}
