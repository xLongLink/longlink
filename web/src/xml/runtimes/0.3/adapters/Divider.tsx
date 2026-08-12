import { Divider as AstryxDivider } from '@astryxdesign/core-0-3/Divider';
import { useXmlRuntime } from '../core/context';
import { resolveXmlBoolean, resolveXmlEnum, resolveXmlString } from '../core/props';
import type { Props } from '../types';

/** Renders an Astryx content divider. */
export function Divider({ props }: Props) {
    const { scope: ctx } = useXmlRuntime();
    const label = resolveXmlString(props, 'label', ctx);
    const orientation = resolveXmlEnum(props, 'orientation', ctx, ['horizontal', 'vertical'], 'Divider') ?? 'horizontal';
    const variant = resolveXmlEnum(props, 'variant', ctx, ['subtle', 'strong'], 'Divider') ?? 'subtle';
    const isFullBleed = resolveXmlBoolean(props, 'isFullBleed', ctx);

    return (
        <AstryxDivider
            isFullBleed={isFullBleed}
            label={label || undefined}
            orientation={orientation}
            variant={variant}
        />
    );
}
