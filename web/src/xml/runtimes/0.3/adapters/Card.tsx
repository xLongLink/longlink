import { Card as AstryxCard } from '@astryxdesign/core-0-3/Card';
import { useXmlRuntime } from '../core/context';
import { renderNode } from '../core/node';
import { resolveXml } from '../core/props';
import type { Props } from '../types';

/** Renders an Astryx card container. */
export function Card({ props, nodes }: Props) {
    const { scope: ctx } = useXmlRuntime();
    const width = resolveXml(props, 'width', ctx);
    const height = resolveXml(props, 'height', ctx);
    const padding = resolveXml(props, 'padding', ctx);
    const variant = resolveXml(props, 'variant', ctx);
    const maxWidth = resolveXml(props, 'maxWidth', ctx);
    const elevation = resolveXml(props, 'elevation', ctx);
    const minHeight = resolveXml(props, 'minHeight', ctx);

    if (
        padding != null &&
        padding !== 0 &&
        padding !== 0.5 &&
        padding !== 1 &&
        padding !== 1.5 &&
        padding !== 2 &&
        padding !== 3 &&
        padding !== 4 &&
        padding !== 5 &&
        padding !== 6 &&
        padding !== 8 &&
        padding !== 10
    ) {
        throw new Error(`Unsupported Card padding '${String(padding)}'`);
    }

    if (
        elevation != null &&
        elevation !== 'none' &&
        elevation !== 'low' &&
        elevation !== 'med' &&
        elevation !== 'high'
    ) {
        throw new Error(`Unsupported Card elevation '${String(elevation)}'`);
    }

    if (
        variant != null &&
        variant !== 'default' &&
        variant !== 'transparent' &&
        variant !== 'muted' &&
        variant !== 'blue' &&
        variant !== 'cyan' &&
        variant !== 'gray' &&
        variant !== 'green' &&
        variant !== 'orange' &&
        variant !== 'pink' &&
        variant !== 'purple' &&
        variant !== 'red' &&
        variant !== 'teal' &&
        variant !== 'yellow'
    ) {
        throw new Error(`Unsupported Card variant '${String(variant)}'`);
    }

    return (
        <AstryxCard
            width={typeof width === 'string' || typeof width === 'number' ? width : undefined}
            height={typeof height === 'string' || typeof height === 'number' ? height : undefined}
            padding={padding}
            variant={variant}
            maxWidth={typeof maxWidth === 'string' || typeof maxWidth === 'number' ? maxWidth : undefined}
            elevation={elevation}
            minHeight={typeof minHeight === 'string' || typeof minHeight === 'number' ? minHeight : undefined}
        >
            {renderNode(nodes, ctx)}
        </AstryxCard>
    );
}
