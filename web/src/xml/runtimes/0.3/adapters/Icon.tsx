import { Icon as AstryxIcon } from '@astryxdesign/core-0-3/Icon';
import type { IconColor, IconSize } from '@astryxdesign/core-0-3/Icon';
import type { IconName } from '@astryxdesign/core-0-3/Icon';
import { ICON_COLORS, ICON_SIZES } from '../constants';
import { useXmlRuntime } from '../core/context';
import { isXmlEnum, requireXmlString, resolveXml } from '../core/props';
import type { Props } from '../types';

const iconColors: readonly IconColor[] = ICON_COLORS;
const iconSizes: readonly IconSize[] = ICON_SIZES;
const ICON_NAMES: readonly IconName[] = [
    'close',
    'chevronDown',
    'chevronLeft',
    'chevronRight',
    'chevronsLeft',
    'chevronsRight',
    'check',
    'success',
    'error',
    'warning',
    'info',
    'calendar',
    'clock',
    'externalLink',
    'menu',
    'moreHorizontal',
    'search',
    'arrowUp',
    'arrowDown',
    'arrowsUpDown',
    'funnel',
    'eyeSlash',
    'viewColumns',
    'copy',
    'checkDouble',
    'wrench',
    'stop',
    'microphone',
];

/** Renders an Astryx semantic icon from the active theme registry. */
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

    if (color != null && !isXmlEnum(color, iconColors)) {
        throw new Error(`Unsupported Icon color '${String(color)}'`);
    }

    if (size != null && !isXmlEnum(size, iconSizes)) {
        throw new Error(`Unsupported Icon size '${String(size)}'`);
    }

    return <AstryxIcon icon={icon} size={size} color={color} label={typeof label === 'string' ? label : undefined} />;
}
