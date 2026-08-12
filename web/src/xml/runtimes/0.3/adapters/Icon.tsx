import { Icon as AstryxIcon } from '@astryxdesign/core-0-3/Icon';
import type { IconColor, IconSize } from '@astryxdesign/core-0-3/Icon';
import type { IconName } from '@astryxdesign/core-0-3/Icon';
import { useXmlRuntime } from '../core/context';
import { requireXmlString, resolveXml } from '../core/props';
import type { Props } from '../types';

const ICON_COLORS: readonly IconColor[] = [
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
];
const ICON_SIZES: readonly IconSize[] = ['xsm', 'sm', 'md', 'lg'];
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

    if (
        color != null &&
        color !== 'primary' &&
        color !== 'secondary' &&
        color !== 'tertiary' &&
        color !== 'disabled' &&
        color !== 'accent' &&
        color !== 'success' &&
        color !== 'error' &&
        color !== 'warning' &&
        color !== 'inherit' &&
        color !== 'blue' &&
        color !== 'red' &&
        color !== 'green' &&
        color !== 'gray' &&
        color !== 'cyan' &&
        color !== 'teal' &&
        color !== 'yellow' &&
        color !== 'orange' &&
        color !== 'pink' &&
        color !== 'purple'
    ) {
        throw new Error(`Unsupported Icon color '${String(color)}'`);
    }

    if (size != null && size !== 'xsm' && size !== 'sm' && size !== 'md' && size !== 'lg') {
        throw new Error(`Unsupported Icon size '${String(size)}'`);
    }

    return <AstryxIcon icon={icon} size={size} color={color} label={typeof label === 'string' ? label : undefined} />;
}
