import { Card as AstryxCard } from '@astryxdesign/core-0-3/Card';
import { useXmlRuntime } from '../core/context';
import { renderNode } from '../core/node';
import { isXmlEnum, isXmlNumber, isXmlString, resolveXml } from '../core/props';
import type { Props } from '../types';

const CARD_ELEVATIONS = ['none', 'low', 'med', 'high'] as const;
const CARD_VARIANTS = ['default', 'transparent', 'muted', 'blue', 'cyan', 'gray', 'green', 'orange', 'pink', 'purple', 'red', 'teal', 'yellow'] as const;
const SPACING_VALUES = [0, 0.5, 1, 1.5, 2, 3, 4, 5, 6, 8, 10] as const;

/** Renders an Astryx card container. */
export function Card({ props, nodes }: Props) {
    const { scope: ctx } = useXmlRuntime();
    const padding = resolveXml(props, 'padding', ctx);
    const elevation = resolveXml(props, 'elevation', ctx);
    const variant = resolveXml(props, 'variant', ctx);
    const width = resolveXml(props, 'width', ctx);
    const height = resolveXml(props, 'height', ctx);
    const maxWidth = resolveXml(props, 'maxWidth', ctx);
    const minHeight = resolveXml(props, 'minHeight', ctx);

    if (padding != null && !isXmlEnum(padding, SPACING_VALUES)) throw new Error(`Unsupported Card padding '${String(padding)}'`);
    if (elevation != null && !isXmlEnum(elevation, CARD_ELEVATIONS)) throw new Error(`Unsupported Card elevation '${String(elevation)}'`);
    if (variant != null && !isXmlEnum(variant, CARD_VARIANTS)) throw new Error(`Unsupported Card variant '${String(variant)}'`);

    return (
        <AstryxCard
            width={isXmlString(width) || isXmlNumber(width) ? width : undefined}
            elevation={elevation}
            height={isXmlString(height) || isXmlNumber(height) ? height : undefined}
            padding={padding}
            variant={variant}
            maxWidth={isXmlString(maxWidth) || isXmlNumber(maxWidth) ? maxWidth : undefined}
            minHeight={isXmlString(minHeight) || isXmlNumber(minHeight) ? minHeight : undefined}
        >
            {renderNode(nodes, ctx)}
        </AstryxCard>
    );
}
