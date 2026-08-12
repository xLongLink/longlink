import { Text as AstryxText } from '@astryxdesign/core-0-3/Text';
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
import type { LayerPlacement } from '@astryxdesign/core-0-3/Layer';
import { useXmlRuntime } from '../core/context';
import { renderNode } from '../core/node';
import {
    isXmlBoolean, isXmlNumber, isXmlString, resolveXml,
    resolveXmlValue,
} from '../core/props';
import type { Props } from '../types';

const TEXT_COLORS: readonly TextColor[] = ['primary', 'secondary', 'disabled', 'placeholder', 'accent', 'inherit'];
const TEXT_DISPLAYS: readonly TextDisplay[] = ['inline', 'block'];
const TEXT_ELEMENTS = ['span', 'p', 'div', 'label', 'h1', 'h2', 'h3'] as const;
const TEXT_JUSTIFICATIONS: readonly TextJustify[] = ['start', 'center', 'end'];
const TEXT_SIZES: readonly TextSize[] = ['4xs', '3xs', '2xs', 'xsm', 'sm', 'base', 'lg', 'xl', '2xl', '3xl', '4xl'];
const TEXT_TYPES: readonly TextType[] = ['body', 'large', 'label', 'supporting', 'code', 'display-1', 'display-2', 'display-3', 'inherit'];
const TEXT_WEIGHTS: readonly TextWeight[] = ['normal', 'medium', 'semibold', 'bold'];
const TEXT_WORD_BREAKS: readonly WordBreak[] = ['break-word', 'break-all'];
const TEXT_WRAPS: readonly TextWrap[] = ['wrap', 'nowrap', 'balance', 'pretty'];
const TOOLTIP_VALUES: readonly (boolean | LayerPlacement)[] = [true, false, 'above', 'below', 'start', 'end'];

/** Returns whether a value is one of an Astryx prop's supported values. */
function isAstryxValue<T>(value: unknown, values: readonly T[]): value is T {
    return values.some((candidate) => candidate === value);
}

/** Returns whether an optional value is absent or supported by an Astryx prop. */
function isOptionalAstryxValue<T>(value: unknown, values: readonly T[]): value is T | undefined {
    return value == null || isAstryxValue(value, values);
}

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

    if (maxLines != null && (!isXmlNumber(maxLines) || !Number.isInteger(maxLines) || maxLines < 0)) {
        throw new Error('Text maxLines must be a non-negative integer');
    }

    if (!isOptionalAstryxValue(type, TEXT_TYPES)) {
        throw new Error(`Unsupported Text type '${String(type)}'`);
    }

    if (!isOptionalAstryxValue(size, TEXT_SIZES)) {
        throw new Error(`Unsupported Text size '${String(size)}'`);
    }

    if (!isOptionalAstryxValue(color, TEXT_COLORS)) {
        throw new Error(`Unsupported Text color '${String(color)}'`);
    }

    if (!isOptionalAstryxValue(weight, TEXT_WEIGHTS)) {
        throw new Error(`Unsupported Text weight '${String(weight)}'`);
    }

    if (!isOptionalAstryxValue(display, TEXT_DISPLAYS)) {
        throw new Error(`Unsupported Text display '${String(display)}'`);
    }

    if (!isOptionalAstryxValue(as, TEXT_ELEMENTS)) {
        throw new Error(`Unsupported Text as '${String(as)}'`);
    }

    if (!isOptionalAstryxValue(hasTruncateTooltip, TOOLTIP_VALUES)) {
        throw new Error(`Unsupported Text hasTruncateTooltip '${String(hasTruncateTooltip)}'`);
    }

    if (!isOptionalAstryxValue(wordBreak, TEXT_WORD_BREAKS)) {
        throw new Error(`Unsupported Text wordBreak '${String(wordBreak)}'`);
    }

    if (!isOptionalAstryxValue(textWrap, TEXT_WRAPS)) {
        throw new Error(`Unsupported Text textWrap '${String(textWrap)}'`);
    }

    if (!isOptionalAstryxValue(justify, TEXT_JUSTIFICATIONS)) {
        throw new Error(`Unsupported Text justify '${String(justify)}'`);
    }

    return (
        <AstryxText
            id={isXmlString(id) ? id : undefined}
            type={type}
            size={size}
            color={color}
            weight={weight}
            display={display}
            as={as}
            justify={justify}
            maxLines={isXmlNumber(maxLines) ? maxLines : undefined}
            textWrap={textWrap}
            wordBreak={wordBreak}
            hasCapsize={isXmlBoolean(hasCapsize) ? hasCapsize : undefined}
            hasStrikethrough={isXmlBoolean(hasStrikethrough) ? hasStrikethrough : undefined}
            hasTabularNumbers={isXmlBoolean(hasTabularNumbers) ? hasTabularNumbers : undefined}
            hasTruncateTooltip={hasTruncateTooltip}
        >
            {value != null ? String(value) : renderNode(nodes, ctx)}
        </AstryxText>
    );
}
