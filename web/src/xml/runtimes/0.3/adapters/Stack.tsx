import { Stack as AstryxStack } from '@astryxdesign/core-0-3/Stack';
import { useXmlRuntime } from '../core/context';
import { renderNode } from '../core/node';
import { resolveXml } from '../core/props';
import type { Props } from '../types';

/** Renders an Astryx stack for horizontal or vertical layout. */
export function Stack({ props, nodes }: Props) {
    const { scope: ctx } = useXmlRuntime();
    const directionValue = resolveXml(props, 'direction', ctx);
    const justifyValue = resolveXml(props, 'justify', ctx);
    const alignValue = resolveXml(props, 'align', ctx);
    const wrapValue = resolveXml(props, 'wrap', ctx);
    const direction = directionValue === 'horizontal' || directionValue === 'vertical' ? directionValue : 'vertical';
    const justify =
        justifyValue === 'start' ||
        justifyValue === 'center' ||
        justifyValue === 'end' ||
        justifyValue === 'between' ||
        justifyValue === 'around' ||
        justifyValue === 'evenly'
            ? justifyValue
            : 'start';
    const align =
        alignValue === 'start' || alignValue === 'center' || alignValue === 'end' || alignValue === 'stretch'
            ? alignValue
            : 'stretch';
    const wrap = wrapValue === 'nowrap' || wrapValue === 'wrap' || wrapValue === 'wrap-reverse' ? wrapValue : 'nowrap';
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
            gap={
                gap === 0 ||
                gap === 0.5 ||
                gap === 1 ||
                gap === 1.5 ||
                gap === 2 ||
                gap === 3 ||
                gap === 4 ||
                gap === 5 ||
                gap === 6 ||
                gap === 8 ||
                gap === 10
                    ? gap
                    : undefined
            }
            height={typeof height === 'string' || typeof height === 'number' ? height : undefined}
            isScrollable={typeof isScrollable === 'boolean' ? isScrollable : undefined}
            justify={justify}
            maxWidth={typeof maxWidth === 'string' || typeof maxWidth === 'number' ? maxWidth : undefined}
            minHeight={typeof minHeight === 'string' || typeof minHeight === 'number' ? minHeight : undefined}
            padding={
                padding === 0 ||
                padding === 0.5 ||
                padding === 1 ||
                padding === 1.5 ||
                padding === 2 ||
                padding === 3 ||
                padding === 4 ||
                padding === 5 ||
                padding === 6 ||
                padding === 8 ||
                padding === 10
                    ? padding
                    : undefined
            }
            paddingBlock={
                paddingBlock === 0 ||
                paddingBlock === 0.5 ||
                paddingBlock === 1 ||
                paddingBlock === 1.5 ||
                paddingBlock === 2 ||
                paddingBlock === 3 ||
                paddingBlock === 4 ||
                paddingBlock === 5 ||
                paddingBlock === 6 ||
                paddingBlock === 8 ||
                paddingBlock === 10
                    ? paddingBlock
                    : undefined
            }
            paddingInline={
                paddingInline === 0 ||
                paddingInline === 0.5 ||
                paddingInline === 1 ||
                paddingInline === 1.5 ||
                paddingInline === 2 ||
                paddingInline === 3 ||
                paddingInline === 4 ||
                paddingInline === 5 ||
                paddingInline === 6 ||
                paddingInline === 8 ||
                paddingInline === 10
                    ? paddingInline
                    : undefined
            }
            width={typeof width === 'string' || typeof width === 'number' ? width : undefined}
            wrap={wrap}
        >
            {renderNode(nodes, ctx)}
        </AstryxStack>
    );
}
