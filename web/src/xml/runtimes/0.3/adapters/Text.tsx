import type { LayerPlacement } from '@astryxdesign/core-0-3/Layer';
import type {
    TextColor,
    TextDisplay,
    TextJustify,
    TextSize,
    TextType,
    TextWeight,
    TextWrap,
    WordBreak,
} from '@astryxdesign/core-0-3/Text';
import { Text as AstryxText } from '@astryxdesign/core-0-3/Text';
import type { Props } from '../types';
import { renderNode } from '../core/node';
import { useXmlRuntime } from '../core/context';
import { isOptionalXmlValue, resolveXml, resolveXmlValue } from '../core/props';
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

const textColors: readonly TextColor[] = TEXT_COLORS;
const textDisplays: readonly TextDisplay[] = TEXT_DISPLAYS;
const textJustifications: readonly TextJustify[] = ALIGNS;
const textSizes: readonly TextSize[] = TEXT_SIZES;
const textTypes: readonly TextType[] = TYPOGRAPHIES;
const textWeights: readonly TextWeight[] = FONT_WEIGHTS;
const textWordBreaks: readonly WordBreak[] = WORD_BREAKS;
const textWraps: readonly TextWrap[] = TEXT_WRAPS;
const truncateTooltips: readonly (boolean | LayerPlacement)[] = TRUNCATE_TOOLTIPS;

/** Renders semantic Astryx text from a value or nested XML. */
export function Text({ props, nodes }: Props) {
    const { scope: ctx } = useXmlRuntime();
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

    if (!isOptionalXmlValue(type, textTypes)) {
        throw new Error(`Unsupported Text type '${String(type)}'`);
    }

    if (!isOptionalXmlValue(size, textSizes)) {
        throw new Error(`Unsupported Text size '${String(size)}'`);
    }

    if (!isOptionalXmlValue(color, textColors)) {
        throw new Error(`Unsupported Text color '${String(color)}'`);
    }

    if (!isOptionalXmlValue(weight, textWeights)) {
        throw new Error(`Unsupported Text weight '${String(weight)}'`);
    }

    if (!isOptionalXmlValue(display, textDisplays)) {
        throw new Error(`Unsupported Text display '${String(display)}'`);
    }

    if (!isOptionalXmlValue(as, TEXT_ELEMENTS)) {
        throw new Error(`Unsupported Text as '${String(as)}'`);
    }

    if (!isOptionalXmlValue(hasTruncateTooltip, truncateTooltips)) {
        throw new Error(`Unsupported Text hasTruncateTooltip '${String(hasTruncateTooltip)}'`);
    }

    if (!isOptionalXmlValue(wordBreak, textWordBreaks)) {
        throw new Error(`Unsupported Text wordBreak '${String(wordBreak)}'`);
    }

    if (!isOptionalXmlValue(textWrap, textWraps)) {
        throw new Error(`Unsupported Text textWrap '${String(textWrap)}'`);
    }

    if (!isOptionalXmlValue(justify, textJustifications)) {
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
            {value != null ? String(value) : renderNode(nodes, ctx)}
        </AstryxText>
    );
}
