import { Divider as AstryxDivider } from '@astryxdesign/core-0-3/Divider';
import { xmlTypeValues } from '../constants';
import { useXmlRuntime } from '../core/context';
import { isXmlBoolean, isXmlEnum, isXmlString, resolveXml } from '../core/props';
import type { Props } from '../types';

/** Renders an Astryx content divider. */
export function Divider({ props }: Props) {
    const { scope: ctx } = useXmlRuntime();
    const label = resolveXml(props, 'label', ctx);
    const variantValue = resolveXml(props, 'variant', ctx);
    const isFullBleed = resolveXml(props, 'isFullBleed', ctx);
    const orientationValue = resolveXml(props, 'orientation', ctx);

    if (orientationValue != null && !isXmlEnum(orientationValue, xmlTypeValues.orientation)) {
        throw new Error(`Unsupported Divider orientation '${String(orientationValue)}'`);
    }

    if (variantValue != null && !isXmlEnum(variantValue, xmlTypeValues.dividerVariant)) {
        throw new Error(`Unsupported Divider variant '${String(variantValue)}'`);
    }

    return (
        <AstryxDivider
            label={isXmlString(label) ? label : undefined}
            variant={variantValue}
            isFullBleed={isXmlBoolean(isFullBleed) ? isFullBleed : undefined}
            orientation={orientationValue}
        />
    );
}
