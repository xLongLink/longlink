import { Divider as AstryxDivider } from '@astryxdesign/core/Divider';
import { useXmlContext, useXmlServices } from '../core/context';
import { resolveTranslation } from '../core/i18n';
import { readXmlProp, resolveXmlBoolean, resolveXmlEnum, resolveXmlString } from '../core/props';
import type { Props } from '../types';

/** Renders an Astryx content divider. */
export function Divider({ props }: Props) {
    const ctx = useXmlContext();
    const services = useXmlServices();
    const label = readXmlProp(props, 'i18n')
        ? resolveTranslation(props, ctx, services)
        : resolveXmlString(props, 'label', ctx);
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
