import { Divider as AstryxDivider } from '@astryxdesign/core/Divider';
import type { Props } from '@/xml/types';
import { useXmlContext } from '@/xml/core/context';
import { resolveTranslation } from '@/xml/core/i18n';
import { resolveXmlBoolean, resolveXmlEnum, resolveXmlString } from './props';

/** Renders an Astryx content divider. */
export function Divider({ props }: Props) {
    const { ctx } = useXmlContext();
    const label = props.i18n ? resolveTranslation(props, ctx) : resolveXmlString(props, 'label', ctx);
    const orientation = resolveXmlEnum(props, 'orientation', ctx, ['horizontal', 'vertical'], 'horizontal', 'Divider');
    const variant = resolveXmlEnum(props, 'variant', ctx, ['subtle', 'strong'], 'subtle', 'Divider');
    const isFullBleed = resolveXmlBoolean(props, 'isFullBleed', ctx, false);

    return (
        <AstryxDivider
            isFullBleed={isFullBleed}
            label={label || undefined}
            orientation={orientation}
            variant={variant}
        />
    );
}
