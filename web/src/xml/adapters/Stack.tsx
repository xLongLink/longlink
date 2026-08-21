import type { Props } from '../types';
import { renderNode } from '../core/node';
import { useXmlRuntime } from '../core/context';
import { Stack as AstryxStack } from '@astryxdesign/core/Stack';
import { isXmlEnum, resolveXml, resolveXmlGap } from '../core/props';
import { BOX_ALIGNS, ORIENTATIONS, STACK_JUSTIFICATIONS, STACK_WRAPS } from '../constants';

export function Stack({ props, nodes }: Props) {
    const { scope: ctx } = useXmlRuntime();
    const directionValue = resolveXml(props, 'direction', ctx);
    const justifyValue = resolveXml(props, 'justify', ctx);
    const alignValue = resolveXml(props, 'align', ctx);
    const wrapValue = resolveXml(props, 'wrap', ctx);
    const gap = resolveXmlGap(props, ctx, 'Stack');
    const direction = isXmlEnum(directionValue, ORIENTATIONS) ? directionValue : undefined;
    const justify = isXmlEnum(justifyValue, STACK_JUSTIFICATIONS) ? justifyValue : 'start';
    const align = isXmlEnum(alignValue, BOX_ALIGNS) ? alignValue : 'stretch';
    const wrap = isXmlEnum(wrapValue, STACK_WRAPS) ? wrapValue : 'nowrap';

    return (
        <AstryxStack align={align} direction={direction} gap={gap} justify={justify} wrap={wrap}>
            {renderNode(nodes, ctx)}
        </AstryxStack>
    );
}
