import { Text as AstryxText, type TextProps } from '@astryxdesign/core/Text';
import type { Props } from '@/xml/types';
import { renderNode } from '@/xml/core/node';
import { useXmlContext } from '@/xml/core/context';
import { resolveTranslation } from '@/xml/core/i18n';
import { resolveXmlBoolean, resolveXmlEnum, resolveXmlNumber, resolveXmlValue } from './props';

/** Renders semantic Astryx text from a value, translation, or nested XML. */
export function Text({ props, nodes }: Props) {
    const { ctx } = useXmlContext();
    const value = resolveXmlValue(props, 'value', ctx);
    const content = props.i18n
        ? resolveTranslation(props, ctx)
        : value != null
          ? String(value)
          : renderNode(nodes, ctx);
    const type = resolveXmlEnum(
        props,
        'type',
        ctx,
        ['body', 'large', 'label', 'supporting', 'code', 'display-1', 'display-2', 'display-3', 'inherit'],
        'body',
        'Text'
    );
    const color = resolveXmlEnum(
        props,
        'color',
        ctx,
        ['primary', 'secondary', 'disabled', 'placeholder', 'accent', 'inherit'],
        'primary',
        'Text'
    );
    const weight = props.weight
        ? resolveXmlEnum(props, 'weight', ctx, ['normal', 'medium', 'semibold', 'bold'], 'normal', 'Text')
        : undefined;
    const display = resolveXmlEnum(props, 'display', ctx, ['inline', 'block'], 'inline', 'Text');
    const justify = resolveXmlEnum(props, 'justify', ctx, ['start', 'center', 'end'], 'start', 'Text');
    const as = resolveXmlEnum(props, 'as', ctx, ['span', 'p', 'div', 'label'], 'span', 'Text');
    const maxLines = resolveXmlNumber(props, 'maxLines', ctx, 0);
    const hasStrikethrough = resolveXmlBoolean(props, 'hasStrikethrough', ctx, false);
    const hasTabularNumbers = resolveXmlBoolean(props, 'hasTabularNumbers', ctx, false);

    return (
        <AstryxText
            as={as}
            color={color}
            display={display}
            hasStrikethrough={hasStrikethrough}
            hasTabularNumbers={hasTabularNumbers}
            justify={justify}
            maxLines={maxLines}
            type={type as TextProps['type']}
            weight={weight}
        >
            {content}
        </AstryxText>
    );
}
