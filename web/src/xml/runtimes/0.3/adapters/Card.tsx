import { Card as AstryxCard } from '@astryxdesign/core-0-3/Card';
import { useXmlRuntime } from '../core/context';
import { renderNode } from '../core/node';
import { isXmlEnum, isXmlNumber, isXmlString, resolveXml } from '../core/props';
import type { Props } from '../types';

/** Renders an Astryx card container. */
export function Card({ props, nodes }: Props) {
    const { scope: ctx } = useXmlRuntime();
    const variantValue = resolveXml(props, 'variant', ctx);
    const variant = isXmlEnum(variantValue, ['default', 'transparent', 'muted', 'blue', 'cyan', 'gray', 'green', 'orange', 'pink', 'purple', 'red', 'teal', 'yellow']) ? variantValue : 'default';
    const padding = resolveXml(props, 'padding', ctx);
    const width = resolveXml(props, 'width', ctx);
    const height = resolveXml(props, 'height', ctx);
    const maxWidth = resolveXml(props, 'maxWidth', ctx);
    const minHeight = resolveXml(props, 'minHeight', ctx);

    return (
        <AstryxCard
            height={isXmlString(height) || isXmlNumber(height) ? height : undefined}
            maxWidth={isXmlString(maxWidth) || isXmlNumber(maxWidth) ? maxWidth : undefined}
            minHeight={isXmlString(minHeight) || isXmlNumber(minHeight) ? minHeight : undefined}
            padding={isXmlEnum(padding, [0, 0.5, 1, 1.5, 2, 3, 4, 5, 6, 8, 10]) ? padding : undefined}
            variant={variant}
            width={isXmlString(width) || isXmlNumber(width) ? width : undefined}
        >
            {renderNode(nodes, ctx)}
        </AstryxCard>
    );
}
