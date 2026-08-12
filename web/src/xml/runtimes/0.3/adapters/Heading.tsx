import { Heading as AstryxHeading } from '@astryxdesign/core-0-3/Heading';
import {
    HEADING_COLORS,
    HEADING_DISPLAYS,
    HEADING_JUSTIFICATIONS,
    HEADING_LEVELS,
    HEADING_TEXT_WRAPS,
    HEADING_TYPES,
    HEADING_WORD_BREAKS,
    TOOLTIP_VALUES,
} from '../constants';
import { useXmlRuntime } from '../core/context';
import { renderNode } from '../core/node';
import { resolveXmlBoolean, resolveXmlNumber, resolveXmlString, resolveXmlValue } from '../core/props';
import type { Props } from '../types';

/** Renders an Astryx heading with explicit semantic level. */
export function Heading({ props, nodes }: Props) {
    const { scope: ctx } = useXmlRuntime();
    const id = resolveXmlString(props, 'id', ctx) || undefined;
    const type = resolveXmlValue(props, 'type', ctx);
    const color = resolveXmlValue(props, 'color', ctx);
    const level = resolveXmlNumber(props, 'level', ctx);
    const display = resolveXmlValue(props, 'display', ctx);
    const justify = resolveXmlValue(props, 'justify', ctx);
    const hasCapsize = resolveXmlBoolean(props, 'hasCapsize', ctx);
    const maxLines = resolveXmlNumber(props, 'maxLines', ctx);
    const textWrap = resolveXmlValue(props, 'textWrap', ctx);
    const wordBreak = resolveXmlValue(props, 'wordBreak', ctx);
    const accessibilityLevel = resolveXmlNumber(props, 'accessibilityLevel', ctx);
    const hasStrikethrough = resolveXmlBoolean(props, 'hasStrikethrough', ctx);
    const hasTruncateTooltip = resolveXmlValue(props, 'hasTruncateTooltip', ctx);

    // Heading levels define document semantics and must be integral and bounded.
    if (level == null || !HEADING_LEVELS.includes(level as (typeof HEADING_LEVELS)[number])) {
        throw new Error('Heading requires a level from 1 to 6');
    }

    if (accessibilityLevel != null && !HEADING_LEVELS.includes(accessibilityLevel as (typeof HEADING_LEVELS)[number])) {
        throw new Error('Heading accessibilityLevel must be from 1 to 6');
    }

    if (maxLines != null && (!Number.isInteger(maxLines) || maxLines < 0)) {
        throw new Error('Heading maxLines must be a non-negative integer');
    }

    if (color != null && !HEADING_COLORS.includes(color as (typeof HEADING_COLORS)[number])) {
        throw new Error(`Unsupported Heading color '${String(color)}'`);
    }

    if (display != null && !HEADING_DISPLAYS.includes(display as (typeof HEADING_DISPLAYS)[number])) {
        throw new Error(`Unsupported Heading display '${String(display)}'`);
    }

    if (justify != null && !HEADING_JUSTIFICATIONS.includes(justify as (typeof HEADING_JUSTIFICATIONS)[number])) {
        throw new Error(`Unsupported Heading justify '${String(justify)}'`);
    }

    if (textWrap != null && !HEADING_TEXT_WRAPS.includes(textWrap as (typeof HEADING_TEXT_WRAPS)[number])) {
        throw new Error(`Unsupported Heading textWrap '${String(textWrap)}'`);
    }

    if (type != null && !HEADING_TYPES.includes(type as (typeof HEADING_TYPES)[number])) {
        throw new Error(`Unsupported Heading type '${String(type)}'`);
    }

    if (wordBreak != null && !HEADING_WORD_BREAKS.includes(wordBreak as (typeof HEADING_WORD_BREAKS)[number])) {
        throw new Error(`Unsupported Heading wordBreak '${String(wordBreak)}'`);
    }

    if (hasTruncateTooltip != null && !TOOLTIP_VALUES.includes(hasTruncateTooltip as (typeof TOOLTIP_VALUES)[number])) {
        throw new Error(`Unsupported Heading hasTruncateTooltip '${String(hasTruncateTooltip)}'`);
    }

    return (
        <AstryxHeading
            id={id}
            type={type as 'display-1' | 'display-2' | 'display-3' | undefined}
            color={color as (typeof HEADING_COLORS)[number] | undefined}
            level={level as (typeof HEADING_LEVELS)[number]}
            display={display as (typeof HEADING_DISPLAYS)[number] | undefined}
            justify={justify as (typeof HEADING_JUSTIFICATIONS)[number] | undefined}
            maxLines={maxLines}
            textWrap={textWrap as 'wrap' | 'nowrap' | 'balance' | 'pretty' | undefined}
            wordBreak={wordBreak as 'break-word' | 'break-all' | undefined}
            hasCapsize={hasCapsize}
            hasStrikethrough={hasStrikethrough}
            accessibilityLevel={accessibilityLevel as (typeof HEADING_LEVELS)[number] | undefined}
            hasTruncateTooltip={hasTruncateTooltip as (typeof TOOLTIP_VALUES)[number] | undefined}
        >
            {renderNode(nodes, ctx)}
        </AstryxHeading>
    );
}
