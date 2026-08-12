import { Text as AstryxText } from '@astryxdesign/core-0-3/Text';
import { useXmlRuntime } from '../core/context';
import { renderNode } from '../core/node';
import {
    readXmlProp,
    resolveXmlBoolean,
    resolveXmlEnum,
    resolveXmlNumber,
    resolveXmlValue,
} from '../core/props';
import type { Props } from '../types';

/** Renders semantic Astryx text from a value or nested XML. */
export function Text({ props, nodes }: Props) {
    const { scope: ctx } = useXmlRuntime();
    const value = resolveXmlValue(props, 'value', ctx);
    const content = value != null ? String(value) : renderNode(nodes, ctx);
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
    const weight = readXmlProp(props, 'weight')
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
            type={type}
            weight={weight}
        >
            {content}
        </AstryxText>
    );
}
