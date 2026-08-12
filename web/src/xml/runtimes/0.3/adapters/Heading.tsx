import { Heading as AstryxHeading } from '@astryxdesign/core-0-3/Heading';
import type { ComponentProps } from 'react';
import { useXmlRuntime } from '../core/context';
import { renderNode } from '../core/node';
import { resolveXmlBoolean, resolveXmlNumber, resolveXmlString, resolveXmlValue } from '../core/props';
import type { Props } from '../types';

type AstryxHeadingProps = ComponentProps<typeof AstryxHeading>;

const HEADING_LEVELS = [1, 2, 3, 4, 5, 6] as const satisfies readonly AstryxHeadingProps['level'][];
const HEADING_COLORS = ['primary', 'secondary', 'disabled', 'placeholder', 'accent', 'inherit'] as const satisfies readonly NonNullable<AstryxHeadingProps['color']>[];
const HEADING_DISPLAYS = ['inline', 'block'] as const satisfies readonly NonNullable<AstryxHeadingProps['display']>[];
const HEADING_JUSTIFICATIONS = ['start', 'center', 'end'] as const satisfies readonly NonNullable<AstryxHeadingProps['justify']>[];
const HEADING_TEXT_WRAPS = ['wrap', 'nowrap', 'balance', 'pretty'] as const satisfies readonly NonNullable<AstryxHeadingProps['textWrap']>[];
const HEADING_TYPES = ['display-1', 'display-2', 'display-3'] as const satisfies readonly NonNullable<AstryxHeadingProps['type']>[];
const HEADING_WORD_BREAKS = ['break-word', 'break-all'] as const satisfies readonly NonNullable<AstryxHeadingProps['wordBreak']>[];
const TOOLTIP_VALUES = [true, false, 'above', 'below', 'start', 'end'] as const satisfies readonly NonNullable<AstryxHeadingProps['hasTruncateTooltip']>[];

/** Returns whether a value is one of an Astryx prop's supported values. */
function isAstryxValue<T>(value: unknown, values: readonly T[]): value is T {
    return values.includes(value as T);
}

/** Returns whether an optional value is absent or supported by an Astryx prop. */
function isOptionalAstryxValue<T>(value: unknown, values: readonly T[]): value is T | undefined {
    return value == null || isAstryxValue(value, values);
}

/** Renders an Astryx heading with explicit semantic level. */
export function Heading({ props, nodes }: Props) {
    const { scope: ctx } = useXmlRuntime();
    const id = resolveXmlString(props, 'id', ctx);
    const type = resolveXmlString(props, 'type', ctx);
    const color = resolveXmlString(props, 'color', ctx);
    const level = resolveXmlNumber(props, 'level', ctx);
    const display = resolveXmlString(props, 'display', ctx);
    const justify = resolveXmlString(props, 'justify', ctx);
    const textWrap = resolveXmlString(props, 'textWrap', ctx);
    const maxLines = resolveXmlNumber(props, 'maxLines', ctx);
    const wordBreak = resolveXmlString(props, 'wordBreak', ctx);
    const hasCapsize = resolveXmlBoolean(props, 'hasCapsize', ctx);
    const hasStrikethrough = resolveXmlBoolean(props, 'hasStrikethrough', ctx);
    const hasTruncateTooltip = resolveXmlValue(props, 'hasTruncateTooltip', ctx);
    const accessibilityLevel = resolveXmlNumber(props, 'accessibilityLevel', ctx);

    // Heading levels define document semantics and must be integral and bounded.
    if (!isAstryxValue(level, HEADING_LEVELS)) {
        throw new Error('Heading requires a level from 1 to 6');
    }

    if (!isOptionalAstryxValue(accessibilityLevel, HEADING_LEVELS)) {
        throw new Error('Heading accessibilityLevel must be from 1 to 6');
    }

    if (maxLines != null && (!Number.isInteger(maxLines) || maxLines < 0)) {
        throw new Error('Heading maxLines must be a non-negative integer');
    }

    if (!isOptionalAstryxValue(color, HEADING_COLORS)) {
        throw new Error(`Unsupported Heading color '${String(color)}'`);
    }

    if (!isOptionalAstryxValue(display, HEADING_DISPLAYS)) {
        throw new Error(`Unsupported Heading display '${String(display)}'`);
    }

    if (!isOptionalAstryxValue(justify, HEADING_JUSTIFICATIONS)) {
        throw new Error(`Unsupported Heading justify '${String(justify)}'`);
    }

    if (!isOptionalAstryxValue(textWrap, HEADING_TEXT_WRAPS)) {
        throw new Error(`Unsupported Heading textWrap '${String(textWrap)}'`);
    }

    if (!isOptionalAstryxValue(type, HEADING_TYPES)) {
        throw new Error(`Unsupported Heading type '${String(type)}'`);
    }

    if (!isOptionalAstryxValue(wordBreak, HEADING_WORD_BREAKS)) {
        throw new Error(`Unsupported Heading wordBreak '${String(wordBreak)}'`);
    }

    if (!isOptionalAstryxValue(hasTruncateTooltip, TOOLTIP_VALUES)) {
        throw new Error(`Unsupported Heading hasTruncateTooltip '${String(hasTruncateTooltip)}'`);
    }

    return (
        <AstryxHeading
            id={id}
            type={type}
            color={color}
            level={level}
            display={display}
            justify={justify}
            maxLines={maxLines}
            textWrap={textWrap}
            wordBreak={wordBreak}
            hasCapsize={hasCapsize}
            hasStrikethrough={hasStrikethrough}
            accessibilityLevel={accessibilityLevel}
            hasTruncateTooltip={hasTruncateTooltip}
        >
            {renderNode(nodes, ctx)}
        </AstryxHeading>
    );
}
