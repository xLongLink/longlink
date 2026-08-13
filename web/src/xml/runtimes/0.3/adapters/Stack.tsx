import { Stack as AstryxStack } from '@astryxdesign/core-0-3/Stack';
import type { Props } from '../types';
import { renderNode } from '../core/node';
import { useXmlRuntime } from '../core/context';
import { isXmlEnum, resolveXml } from '../core/props';
import { BOX_ALIGNS, ORIENTATIONS, SPACINGS, STACK_JUSTIFICATIONS, STACK_WRAPS } from '../constants';

/**
 * https://astryx.atmeta.com/components/Stack?tab=properties
 * - direction: str
 * - justify: str
 * - align: str
 * - wrap: str
 * - gap: int | float
 * - padding: int | float
 * - paddingBlock: int | float
 * - paddingInline: int | float
 * - width: str | int
 * - height: str | int
 * - maxWidth: str | int
 * - minHeight: str | int
 * - isScrollable: bool
 * - children: ReactNode
 */
export function Stack({ props, nodes }: Props) {
    const { scope: ctx } = useXmlRuntime();
    const directionValue = resolveXml(props, 'direction', ctx);
    const justifyValue = resolveXml(props, 'justify', ctx);
    const alignValue = resolveXml(props, 'align', ctx);
    const wrapValue = resolveXml(props, 'wrap', ctx);
    const direction = isXmlEnum(directionValue, ORIENTATIONS) ? directionValue : 'vertical';
    const justify = isXmlEnum(justifyValue, STACK_JUSTIFICATIONS) ? justifyValue : 'start';
    const align = isXmlEnum(alignValue, BOX_ALIGNS) ? alignValue : 'stretch';
    const wrap = isXmlEnum(wrapValue, STACK_WRAPS) ? wrapValue : 'nowrap';
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
            gap={isXmlEnum(gap, SPACINGS) ? gap : undefined}
            height={typeof height === 'string' || typeof height === 'number' ? height : undefined}
            isScrollable={typeof isScrollable === 'boolean' ? isScrollable : undefined}
            justify={justify}
            maxWidth={typeof maxWidth === 'string' || typeof maxWidth === 'number' ? maxWidth : undefined}
            minHeight={typeof minHeight === 'string' || typeof minHeight === 'number' ? minHeight : undefined}
            padding={isXmlEnum(padding, SPACINGS) ? padding : undefined}
            paddingBlock={isXmlEnum(paddingBlock, SPACINGS) ? paddingBlock : undefined}
            paddingInline={isXmlEnum(paddingInline, SPACINGS) ? paddingInline : undefined}
            width={typeof width === 'string' || typeof width === 'number' ? width : undefined}
            wrap={wrap}
        >
            {renderNode(nodes, ctx)}
        </AstryxStack>
    );
}
