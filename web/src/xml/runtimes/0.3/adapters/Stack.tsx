import { Stack as AstryxStack } from '@astryxdesign/core-0-3/Stack';
import { useXmlRuntime } from '../core/context';
import { renderNode } from '../core/node';
import { isXmlBoolean, isXmlEnum, isXmlNumber, isXmlString, resolveXml } from '../core/props';
import type { Props } from '../types';

/** Renders an Astryx stack for horizontal or vertical layout. */
export function Stack({ props, nodes }: Props) {
    const { scope: ctx } = useXmlRuntime();
    const directionValue = resolveXml(props, 'direction', ctx);
    const justifyValue = resolveXml(props, 'justify', ctx);
    const alignValue = resolveXml(props, 'align', ctx);
    const wrapValue = resolveXml(props, 'wrap', ctx);
    const direction = isXmlEnum(directionValue, ['horizontal', 'vertical']) ? directionValue : 'vertical';
    const justify = isXmlEnum(justifyValue, ['start', 'center', 'end', 'between', 'around', 'evenly']) ? justifyValue : 'start';
    const align = isXmlEnum(alignValue, ['start', 'center', 'end', 'stretch']) ? alignValue : 'stretch';
    const wrap = isXmlEnum(wrapValue, ['nowrap', 'wrap', 'wrap-reverse']) ? wrapValue : 'nowrap';
    const gap = resolveXml(props, 'gap', ctx);
    const padding = resolveXml(props, 'padding', ctx);
    const paddingInline = resolveXml(props, 'paddingInline', ctx);
    const paddingBlock = resolveXml(props, 'paddingBlock', ctx);
    const isScrollable = resolveXml(props, 'isScrollable', ctx);
    const width = resolveXml(props, 'width', ctx);
    const height = resolveXml(props, 'height', ctx);
    const maxWidth = resolveXml(props, 'maxWidth', ctx);
    const minHeight = resolveXml(props, 'minHeight', ctx);

    return (
        <AstryxStack
            align={align}
            direction={direction}
            gap={isXmlEnum(gap, [0, 0.5, 1, 1.5, 2, 3, 4, 5, 6, 8, 10]) ? gap : undefined}
            height={isXmlString(height) || isXmlNumber(height) ? height : undefined}
            isScrollable={isXmlBoolean(isScrollable) ? isScrollable : undefined}
            justify={justify}
            maxWidth={isXmlString(maxWidth) || isXmlNumber(maxWidth) ? maxWidth : undefined}
            minHeight={isXmlString(minHeight) || isXmlNumber(minHeight) ? minHeight : undefined}
            padding={isXmlEnum(padding, [0, 0.5, 1, 1.5, 2, 3, 4, 5, 6, 8, 10]) ? padding : undefined}
            paddingBlock={isXmlEnum(paddingBlock, [0, 0.5, 1, 1.5, 2, 3, 4, 5, 6, 8, 10]) ? paddingBlock : undefined}
            paddingInline={isXmlEnum(paddingInline, [0, 0.5, 1, 1.5, 2, 3, 4, 5, 6, 8, 10]) ? paddingInline : undefined}
            width={isXmlString(width) || isXmlNumber(width) ? width : undefined}
            wrap={wrap}
        >
            {renderNode(nodes, ctx)}
        </AstryxStack>
    );
}
