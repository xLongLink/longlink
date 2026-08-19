import type { Props } from '../types';
import { renderNode } from '../core/node';
import { useXmlRuntime } from '../core/context';
import { isXmlEnum, resolveXml } from '../core/props';
import { StackItem as AstryxStackItem } from '@astryxdesign/core/Stack';
import { BOX_ALIGNS, STACK_ITEM_SIZES } from '../constants';

export function StackItem({ props, nodes }: Props) {
    const { scope: ctx } = useXmlRuntime();
    const size = resolveXml(props, 'size', ctx);
    const isScrollable = resolveXml(props, 'isScrollable', ctx);
    const crossAlignSelf = resolveXml(props, 'crossAlignSelf', ctx);

    if (!isXmlEnum(size, [undefined, ...STACK_ITEM_SIZES])) {
        throw new Error(`Unsupported StackItem size '${String(size)}'`);
    }

    if (!isXmlEnum(crossAlignSelf, [undefined, ...BOX_ALIGNS])) {
        throw new Error(`Unsupported StackItem crossAlignSelf '${String(crossAlignSelf)}'`);
    }

    return (
        <AstryxStackItem
            crossAlignSelf={crossAlignSelf}
            isScrollable={typeof isScrollable === 'boolean' ? isScrollable : undefined}
            size={size}
        >
            {renderNode(nodes, ctx)}
        </AstryxStackItem>
    );
}
