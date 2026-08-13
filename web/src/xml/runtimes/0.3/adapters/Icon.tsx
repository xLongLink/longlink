import { Icon as AstryxIcon } from '@astryxdesign/core-0-3/Icon';
import type { Props } from '../types';
import { useXmlRuntime } from '../core/context';
import { ICON_COLORS, ICON_SIZES } from '../constants';
import { isXmlEnum, requireXmlString, resolveXml } from '../core/props';

/**
 * https://astryx.atmeta.com/components/Icon?tab=properties
 * - icon: str
 * - label: string
 * - size: str
 * - color: str
 */
export function Icon({ props }: Props) {
    const { scope: ctx } = useXmlRuntime();
    const icon = requireXmlString(props, 'icon', ctx, 'Icon');
    const size = resolveXml(props, 'size', ctx);
    const color = resolveXml(props, 'color', ctx);
    const label = resolveXml(props, 'label', ctx);

    if (
        icon !== 'close' &&
        icon !== 'chevronDown' &&
        icon !== 'chevronLeft' &&
        icon !== 'chevronRight' &&
        icon !== 'chevronsLeft' &&
        icon !== 'chevronsRight' &&
        icon !== 'check' &&
        icon !== 'success' &&
        icon !== 'error' &&
        icon !== 'warning' &&
        icon !== 'info' &&
        icon !== 'calendar' &&
        icon !== 'clock' &&
        icon !== 'externalLink' &&
        icon !== 'menu' &&
        icon !== 'moreHorizontal' &&
        icon !== 'search' &&
        icon !== 'arrowUp' &&
        icon !== 'arrowDown' &&
        icon !== 'arrowsUpDown' &&
        icon !== 'funnel' &&
        icon !== 'eyeSlash' &&
        icon !== 'viewColumns' &&
        icon !== 'copy' &&
        icon !== 'checkDouble' &&
        icon !== 'wrench' &&
        icon !== 'stop' &&
        icon !== 'microphone'
    ) {
        throw new Error(`Unsupported Icon icon '${icon}'`);
    }

    if (color != null && !isXmlEnum(color, ICON_COLORS)) {
        throw new Error(`Unsupported Icon color '${String(color)}'`);
    }

    if (size != null && !isXmlEnum(size, ICON_SIZES)) {
        throw new Error(`Unsupported Icon size '${String(size)}'`);
    }

    return <AstryxIcon icon={icon} size={size} color={color} label={typeof label === 'string' ? label : undefined} />;
}
