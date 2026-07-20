import { Heading as AstryxHeading } from '@astryxdesign/core/Heading';
import type { Props } from '@/xml/types';
import { renderNode } from '@/xml/core/node';
import { useXmlContext } from '@/xml/core/context';
import { resolveTranslation } from '@/xml/core/i18n';
import { resolveXmlEnum, resolveXmlNumber, resolveXmlValue } from './props';

/** Renders an Astryx heading with explicit semantic level. */
export function Heading({ props, nodes }: Props) {
    const { ctx } = useXmlContext();
    const value = resolveXmlValue(props, 'value', ctx);
    const content = props.i18n
        ? resolveTranslation(props, ctx)
        : value != null
          ? String(value)
          : renderNode(nodes, ctx);
    const level = resolveXmlNumber(props, 'level', ctx);

    // Heading levels define document semantics and must be integral and bounded.
    if (level == null || !Number.isInteger(level) || level < 1 || level > 6) {
        throw new Error('Heading requires a level from 1 to 6');
    }

    const type = props.type
        ? resolveXmlEnum(props, 'type', ctx, ['display-1', 'display-2', 'display-3'], 'display-1', 'Heading')
        : undefined;
    const color = resolveXmlEnum(
        props,
        'color',
        ctx,
        ['primary', 'secondary', 'disabled', 'placeholder', 'accent', 'inherit'],
        'primary',
        'Heading'
    );
    const justify = resolveXmlEnum(props, 'justify', ctx, ['start', 'center', 'end'], 'start', 'Heading');
    const maxLines = resolveXmlNumber(props, 'maxLines', ctx, 0);

    return (
        <AstryxHeading
            color={color}
            justify={justify}
            level={level as 1 | 2 | 3 | 4 | 5 | 6}
            maxLines={maxLines}
            type={type}
        >
            {content}
        </AstryxHeading>
    );
}
