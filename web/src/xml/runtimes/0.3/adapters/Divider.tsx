import { Divider as AstryxDivider } from '@astryxdesign/core-0-3/Divider';
import { useXmlRuntime } from '../core/context';
import { isXmlBoolean, isXmlEnum, isXmlString, resolveXml } from '../core/props';
import type { Props } from '../types';

/** Renders an Astryx content divider. */
export function Divider({ props }: Props) {
    const { scope: ctx } = useXmlRuntime();
    const label = resolveXml(props, 'label', ctx);
    const orientationValue = resolveXml(props, 'orientation', ctx);
    const variantValue = resolveXml(props, 'variant', ctx);
    const orientation = isXmlEnum(orientationValue, ['horizontal', 'vertical']) ? orientationValue : 'horizontal';
    const variant = isXmlEnum(variantValue, ['subtle', 'strong']) ? variantValue : 'subtle';
    const isFullBleed = resolveXml(props, 'isFullBleed', ctx);

    return (
        <AstryxDivider
            isFullBleed={isXmlBoolean(isFullBleed) ? isFullBleed : undefined}
            label={isXmlString(label) ? label : undefined}
            orientation={orientation}
            variant={variant}
        />
    );
}
