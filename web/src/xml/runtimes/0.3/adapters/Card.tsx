import { Card as AstryxCard } from '@astryxdesign/core-0-3/Card';
import { useXmlRuntime } from '../core/context';
import { renderNode } from '../core/node';
import { resolveXmlEnum, resolveXmlSizeValue, resolveXmlSpacing } from '../core/props';
import type { Props } from '../types';

/** Renders an Astryx card container. */
export function Card({ props, nodes }: Props) {
    const { scope: ctx } = useXmlRuntime();
    const variant = resolveXmlEnum(
        props,
        'variant',
        ctx,
        [
            'default',
            'transparent',
            'muted',
            'blue',
            'cyan',
            'gray',
            'green',
            'orange',
            'pink',
            'purple',
            'red',
            'teal',
            'yellow',
        ],
        'Card'
    ) ?? 'default';
    const padding = resolveXmlSpacing(props, 'padding', ctx);
    const width = resolveXmlSizeValue(props, 'width', ctx);
    const height = resolveXmlSizeValue(props, 'height', ctx);
    const maxWidth = resolveXmlSizeValue(props, 'maxWidth', ctx);
    const minHeight = resolveXmlSizeValue(props, 'minHeight', ctx);

    return (
        <AstryxCard
            height={height}
            maxWidth={maxWidth}
            minHeight={minHeight}
            padding={padding}
            variant={variant}
            width={width}
        >
            {renderNode(nodes, ctx)}
        </AstryxCard>
    );
}
