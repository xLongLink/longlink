import type { HeadingLevel } from '@astryxdesign/core-0-3/Heading';
import { Heading as AstryxHeading } from '@astryxdesign/core-0-3/Heading';
import type { Props } from '../types';
import { renderNode } from '../core/node';
import { useXmlRuntime } from '../core/context';
import { isOptionalXmlValue, isXmlEnum, resolveXml, resolveXmlValue } from '../core/props';
import {
    ALIGNS,
    HEADING_TYPES,
    TEXT_COLORS,
    TEXT_DISPLAYS,
    TEXT_WRAPS,
    TRUNCATE_TOOLTIPS,
    WORD_BREAKS,
} from '../constants';

const HEADING_LEVELS: readonly HeadingLevel[] = [1, 2, 3, 4, 5, 6];

/**
 * checked: false
 * https://astryx.atmeta.com/components/Heading?tab=properties
 * - children: ReactNode
 * - level: int
 * - accessibilityLevel: int
 * - id: string
 * - type: str
 * - color: str
 * - display: str
 * - justify: str
 * - textWrap: str
 * - wordBreak: str
 * - maxLines: non-negative integer
 * - hasCapsize: bool
 * - hasStrikethrough: bool
 * - hasTruncateTooltip: bool | str
 */
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
    if (!isXmlEnum(level, HEADING_LEVELS)) {
        throw new Error('Heading requires a level from 1 to 6');
    }

    if (!isOptionalXmlValue(accessibilityLevel, HEADING_LEVELS)) {
        throw new Error('Heading accessibilityLevel must be from 1 to 6');
    }

    if (maxLines != null && (typeof maxLines !== 'number' || !Number.isInteger(maxLines) || maxLines < 0)) {
        throw new Error('Heading maxLines must be a non-negative integer');
    }

    if (!isOptionalXmlValue(color, TEXT_COLORS)) {
        throw new Error(`Unsupported Heading color '${String(color)}'`);
    }

    if (!isOptionalXmlValue(display, TEXT_DISPLAYS)) {
        throw new Error(`Unsupported Heading display '${String(display)}'`);
    }

    if (!isOptionalXmlValue(justify, ALIGNS)) {
        throw new Error(`Unsupported Heading justify '${String(justify)}'`);
    }

    if (!isOptionalXmlValue(textWrap, TEXT_WRAPS)) {
        throw new Error(`Unsupported Heading textWrap '${String(textWrap)}'`);
    }

    if (!isOptionalXmlValue(type, HEADING_TYPES)) {
        throw new Error(`Unsupported Heading type '${String(type)}'`);
    }

    if (!isOptionalXmlValue(wordBreak, WORD_BREAKS)) {
        throw new Error(`Unsupported Heading wordBreak '${String(wordBreak)}'`);
    }

    if (!isOptionalXmlValue(hasTruncateTooltip, TRUNCATE_TOOLTIPS)) {
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
