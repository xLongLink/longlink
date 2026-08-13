import { Icon as AstryxIcon } from '@astryxdesign/core-0-3/Icon';
import type { Props } from '../types';
import { useXmlRuntime } from '../core/context';
import { ICON_COLORS, ICON_NAMES, ICON_SIZES } from '../constants';
import { isXmlEnum, requireXmlString, resolveXml } from '../core/props';

/**
 * checked: false
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

    if (!isXmlEnum(icon, [undefined, ...ICON_NAMES])) {
        throw new Error(`Unsupported Icon icon '${icon}'`);
    }

    if (!isXmlEnum(color, [undefined, ...ICON_COLORS])) {
        throw new Error(`Unsupported Icon color '${String(color)}'`);
    }

    if (!isXmlEnum(size, [undefined, ...ICON_SIZES])) {
        throw new Error(`Unsupported Icon size '${String(size)}'`);
    }

    return <AstryxIcon icon={icon} size={size} color={color} label={typeof label === 'string' ? label : undefined} />;
}
