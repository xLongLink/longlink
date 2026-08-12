import { Divider as AstryxDivider } from '@astryxdesign/core-0-3/Divider';
import { useXmlRuntime } from '../core/context';
import { resolveXml } from '../core/props';
import type { Props } from '../types';

/** Renders an Astryx content divider. */
export function Divider({ props }: Props) {
    const { scope: ctx } = useXmlRuntime();
    const label = resolveXml(props, 'label', ctx);
    const variantValue = resolveXml(props, 'variant', ctx);
    const isFullBleed = resolveXml(props, 'isFullBleed', ctx);
    const orientationValue = resolveXml(props, 'orientation', ctx);

    if (orientationValue != null && orientationValue !== 'horizontal' && orientationValue !== 'vertical') {
        throw new Error(`Unsupported Divider orientation '${String(orientationValue)}'`);
    }

    if (variantValue != null && variantValue !== 'subtle' && variantValue !== 'strong') {
        throw new Error(`Unsupported Divider variant '${String(variantValue)}'`);
    }

    return (
        <AstryxDivider
            label={typeof label === 'string' ? label : undefined}
            variant={variantValue === 'subtle' || variantValue === 'strong' ? variantValue : undefined}
            isFullBleed={typeof isFullBleed === 'boolean' ? isFullBleed : undefined}
            orientation={
                orientationValue === 'horizontal' || orientationValue === 'vertical' ? orientationValue : undefined
            }
        />
    );
}
