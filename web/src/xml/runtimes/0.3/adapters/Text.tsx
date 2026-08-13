import { Text as AstryxText } from '@astryxdesign/core-0-3/Text';
import type { Props } from '../types';
import { useXmlRuntime } from '../core/context';
import { isXmlEnum, resolveXml, resolveXmlValue } from '../core/props';
import {
    ALIGNS,
    FONT_WEIGHTS,
    TEXT_COLORS,
    TEXT_DISPLAYS,
    TEXT_ELEMENTS,
    TEXT_SIZES,
    TEXT_WRAPS,
    TRUNCATE_TOOLTIPS,
    TYPOGRAPHIES,
    WORD_BREAKS,
} from '../constants';

/**
 * checked: false
 * https://astryx.atmeta.com/components/Text?tab=properties
 * - value: str | int | float | bool
 * - id: string
 * - as: str
 * - type: str
 * - size: str
 * - color: str
 * - weight: str
 * - display: str
 * - justify: str
 * - textWrap: str
 * - wordBreak: str
 * - maxLines: non-negative integer
 * - hasCapsize: bool
 * - hasStrikethrough: bool
 * - hasTabularNumbers: bool
 * - hasTruncateTooltip: bool | str
 */
export function Text({ props }: Props) {
    const { scope: ctx } = useXmlRuntime();

    if (props.value == null) {
        throw new Error('Text requires a value');
    }

    const id = resolveXml(props, 'id', ctx);
    const as = resolveXml(props, 'as', ctx);
    const type = resolveXml(props, 'type', ctx);
    const size = resolveXml(props, 'size', ctx);
    const color = resolveXml(props, 'color', ctx);
    const value = resolveXmlValue(props, 'value', ctx);
    const weight = resolveXml(props, 'weight', ctx);
    const display = resolveXml(props, 'display', ctx);
    const justify = resolveXml(props, 'justify', ctx);
    const maxLines = resolveXml(props, 'maxLines', ctx);
    const textWrap = resolveXml(props, 'textWrap', ctx);
    const wordBreak = resolveXml(props, 'wordBreak', ctx);
    const hasCapsize = resolveXml(props, 'hasCapsize', ctx);
    const hasStrikethrough = resolveXml(props, 'hasStrikethrough', ctx);
    const hasTabularNumbers = resolveXml(props, 'hasTabularNumbers', ctx);
    const hasTruncateTooltip = resolveXmlValue(props, 'hasTruncateTooltip', ctx);

    if (maxLines != null && (typeof maxLines !== 'number' || !Number.isInteger(maxLines) || maxLines < 0)) {
        throw new Error('Text maxLines must be a non-negative integer');
    }

    if (!isXmlEnum(type, [undefined, ...TYPOGRAPHIES])) {
        throw new Error(`Unsupported Text type '${String(type)}'`);
    }

    if (!isXmlEnum(size, [undefined, ...TEXT_SIZES])) {
        throw new Error(`Unsupported Text size '${String(size)}'`);
    }

    if (!isXmlEnum(color, [undefined, ...TEXT_COLORS])) {
        throw new Error(`Unsupported Text color '${String(color)}'`);
    }

    if (!isXmlEnum(weight, [undefined, ...FONT_WEIGHTS])) {
        throw new Error(`Unsupported Text weight '${String(weight)}'`);
    }

    if (!isXmlEnum(display, [undefined, ...TEXT_DISPLAYS])) {
        throw new Error(`Unsupported Text display '${String(display)}'`);
    }

    if (!isXmlEnum(as, [undefined, ...TEXT_ELEMENTS])) {
        throw new Error(`Unsupported Text as '${String(as)}'`);
    }

    if (!isXmlEnum(hasTruncateTooltip, [undefined, ...TRUNCATE_TOOLTIPS])) {
        throw new Error(`Unsupported Text hasTruncateTooltip '${String(hasTruncateTooltip)}'`);
    }

    if (!isXmlEnum(wordBreak, [undefined, ...WORD_BREAKS])) {
        throw new Error(`Unsupported Text wordBreak '${String(wordBreak)}'`);
    }

    if (!isXmlEnum(textWrap, [undefined, ...TEXT_WRAPS])) {
        throw new Error(`Unsupported Text textWrap '${String(textWrap)}'`);
    }

    if (!isXmlEnum(justify, [undefined, ...ALIGNS])) {
        throw new Error(`Unsupported Text justify '${String(justify)}'`);
    }

    return (
        <AstryxText
            id={typeof id === 'string' ? id : undefined}
            type={type}
            size={size}
            color={color}
            weight={weight}
            display={display}
            as={as}
            justify={justify}
            maxLines={typeof maxLines === 'number' ? maxLines : undefined}
            textWrap={textWrap}
            wordBreak={wordBreak}
            hasCapsize={typeof hasCapsize === 'boolean' ? hasCapsize : undefined}
            hasStrikethrough={typeof hasStrikethrough === 'boolean' ? hasStrikethrough : undefined}
            hasTabularNumbers={typeof hasTabularNumbers === 'boolean' ? hasTabularNumbers : undefined}
            hasTruncateTooltip={hasTruncateTooltip}
        >
            {String(value)}
        </AstryxText>
    );
}
