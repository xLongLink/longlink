import { Heading as AstryxHeading } from '@astryxdesign/core-0-3/Heading';
import type { HeadingLevel, HeadingType } from '@astryxdesign/core-0-3/Heading';
import type { LayerPlacement } from '@astryxdesign/core-0-3/Layer';
import type { TextColor, TextDisplay, TextJustify, TextWrap, WordBreak } from '@astryxdesign/core-0-3/Text';
import {
    ALIGNS,
    HEADING_TYPES,
    TEXT_COLORS,
    TEXT_DISPLAYS,
    TEXT_WRAPS,
    TRUNCATE_TOOLTIPS,
    WORD_BREAKS,
} from '../constants';
import { useXmlRuntime } from '../core/context';
import { renderNode } from '../core/node';
import { resolveXml, resolveXmlValue } from '../core/props';
import type { Props } from '../types';

const HEADING_LEVELS: readonly HeadingLevel[] = [1, 2, 3, 4, 5, 6];
const headingColors: readonly TextColor[] = TEXT_COLORS;
const headingDisplays: readonly TextDisplay[] = TEXT_DISPLAYS;
const headingJustifications: readonly TextJustify[] = ALIGNS;
const headingTextWraps: readonly TextWrap[] = TEXT_WRAPS;
const headingTypes: readonly HeadingType[] = HEADING_TYPES;
const headingWordBreaks: readonly WordBreak[] = WORD_BREAKS;
const truncateTooltips: readonly (boolean | LayerPlacement)[] = TRUNCATE_TOOLTIPS;

/** Returns whether a value is one of an Astryx prop's supported values. */
function isAstryxValue<T>(value: unknown, values: readonly T[]): value is T {
    return values.some((candidate) => candidate === value);
}

/** Returns whether an optional value is absent or supported by an Astryx prop. */
function isOptionalAstryxValue<T>(value: unknown, values: readonly T[]): value is T | undefined {
    return value == null || isAstryxValue(value, values);
}

/** Renders an Astryx heading with explicit semantic level. */
export function Heading({ props, nodes }: Props) {
    const { scope: ctx } = useXmlRuntime();
    const id = resolveXml(props, 'id', ctx);
    const type = resolveXml(props, 'type', ctx);
    const color = resolveXml(props, 'color', ctx);
    const level = resolveXml(props, 'level', ctx);
    const display = resolveXml(props, 'display', ctx);
    const justify = resolveXml(props, 'justify', ctx);
    const textWrap = resolveXml(props, 'textWrap', ctx);
    const maxLines = resolveXml(props, 'maxLines', ctx);
    const wordBreak = resolveXml(props, 'wordBreak', ctx);
    const hasCapsize = resolveXml(props, 'hasCapsize', ctx);
    const hasStrikethrough = resolveXml(props, 'hasStrikethrough', ctx);
    const hasTruncateTooltip = resolveXmlValue(props, 'hasTruncateTooltip', ctx);
    const accessibilityLevel = resolveXml(props, 'accessibilityLevel', ctx);

    // Heading levels define document semantics and must be integral and bounded.
    if (!isAstryxValue(level, HEADING_LEVELS)) {
        throw new Error('Heading requires a level from 1 to 6');
    }

    if (!isOptionalAstryxValue(accessibilityLevel, HEADING_LEVELS)) {
        throw new Error('Heading accessibilityLevel must be from 1 to 6');
    }

    if (maxLines != null && (typeof maxLines !== 'number' || !Number.isInteger(maxLines) || maxLines < 0)) {
        throw new Error('Heading maxLines must be a non-negative integer');
    }

    if (!isOptionalAstryxValue(color, headingColors)) {
        throw new Error(`Unsupported Heading color '${String(color)}'`);
    }

    if (!isOptionalAstryxValue(display, headingDisplays)) {
        throw new Error(`Unsupported Heading display '${String(display)}'`);
    }

    if (!isOptionalAstryxValue(justify, headingJustifications)) {
        throw new Error(`Unsupported Heading justify '${String(justify)}'`);
    }

    if (!isOptionalAstryxValue(textWrap, headingTextWraps)) {
        throw new Error(`Unsupported Heading textWrap '${String(textWrap)}'`);
    }

    if (!isOptionalAstryxValue(type, headingTypes)) {
        throw new Error(`Unsupported Heading type '${String(type)}'`);
    }

    if (!isOptionalAstryxValue(wordBreak, headingWordBreaks)) {
        throw new Error(`Unsupported Heading wordBreak '${String(wordBreak)}'`);
    }

    if (!isOptionalAstryxValue(hasTruncateTooltip, truncateTooltips)) {
        throw new Error(`Unsupported Heading hasTruncateTooltip '${String(hasTruncateTooltip)}'`);
    }

    return (
        <AstryxHeading
            id={typeof id === 'string' ? id : undefined}
            type={type}
            color={color}
            level={level}
            display={display}
            justify={justify}
            maxLines={typeof maxLines === 'number' ? maxLines : undefined}
            textWrap={textWrap}
            wordBreak={wordBreak}
            hasCapsize={typeof hasCapsize === 'boolean' ? hasCapsize : undefined}
            hasStrikethrough={typeof hasStrikethrough === 'boolean' ? hasStrikethrough : undefined}
            accessibilityLevel={accessibilityLevel}
            hasTruncateTooltip={hasTruncateTooltip}
        >
            {renderNode(nodes, ctx)}
        </AstryxHeading>
    );
}
