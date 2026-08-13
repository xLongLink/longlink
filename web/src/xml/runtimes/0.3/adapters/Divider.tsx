import { Divider as AstryxDivider } from '@astryxdesign/core-0-3/Divider';
import type { Props } from '../types';
import { useXmlRuntime } from '../core/context';
import { DIVIDER_VARIANTS, ORIENTATIONS } from '../constants';
import { isXmlBoolean, isXmlEnum, isXmlString, resolveXml } from '../core/props';

/**
 * https://astryx.atmeta.com/components/Divider?tab=properties
 * - label: string
 * - variant: str
 * - orientation: str
 * - isFullBleed: bool
 */
export function Divider({ props }: Props) {
    const { scope: ctx } = useXmlRuntime();
    const label = resolveXml(props, 'label', ctx);
    const variantValue = resolveXml(props, 'variant', ctx);
    const isFullBleed = resolveXml(props, 'isFullBleed', ctx);
    const orientationValue = resolveXml(props, 'orientation', ctx);

    if (orientationValue != null && !isXmlEnum(orientationValue, ORIENTATIONS)) {
        throw new Error(`Unsupported Divider orientation '${String(orientationValue)}'`);
    }

    if (variantValue != null && !isXmlEnum(variantValue, DIVIDER_VARIANTS)) {
        throw new Error(`Unsupported Divider variant '${String(variantValue)}'`);
    }

    return (
        <AstryxDivider
            label={isXmlString(label) ? label : undefined}
            variant={isXmlEnum(variantValue, DIVIDER_VARIANTS) ? variantValue : undefined}
            isFullBleed={isXmlBoolean(isFullBleed) ? isFullBleed : undefined}
            orientation={isXmlEnum(orientationValue, ORIENTATIONS) ? orientationValue : undefined}
        />
    );
}
