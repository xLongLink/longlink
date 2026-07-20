import { Card as AstryxCard } from '@astryxdesign/core/Card';
import type { Props } from '@/xml/types';
import { renderNode } from '@/xml/core/node';
import { useXmlContext } from '@/xml/core/context';
import { resolveXmlEnum, resolveXmlSizeValue, resolveXmlSpacing } from './props';

/** Renders an Astryx card container. */
export function Card({ props, nodes }: Props) {
    const { ctx } = useXmlContext();
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
        'default',
        'Card'
    );
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
