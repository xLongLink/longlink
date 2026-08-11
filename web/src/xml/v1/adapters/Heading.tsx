import { Heading as AstryxHeading } from '@astryxdesign/core/Heading';
import { useXmlContext } from '../core/context';
import { renderNode } from '../core/node';
import { readXmlProp, resolveXmlContent, resolveXmlEnum, resolveXmlNumber, resolveXmlValue } from '../core/props';
import type { Props } from '../types';

type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;

/** Renders an Astryx heading with explicit semantic level. */
export function Heading({ props, nodes }: Props) {
    const ctx = useXmlContext();
    const value = resolveXmlValue(props, 'value', ctx);
    const content = resolveXmlContent(props, ctx, value, () => renderNode(nodes, ctx));
    const level = resolveXmlNumber(props, 'level', ctx);

    // Heading levels define document semantics and must be integral and bounded.
    if (level == null || !isHeadingLevel(level)) {
        throw new Error('Heading requires a level from 1 to 6');
    }

    const type = readXmlProp(props, 'type')
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
        <AstryxHeading color={color} justify={justify} level={level} maxLines={maxLines} type={type}>
            {content}
        </AstryxHeading>
    );
}

/** Returns whether a number is a supported semantic heading level. */
function isHeadingLevel(value: number): value is HeadingLevel {
    return Number.isInteger(value) && value >= 1 && value <= 6;
}
