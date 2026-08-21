import { z } from 'zod';
import type { Props } from '../types';
import { renderNode } from '../core/node';
import { useXmlRuntime } from '../core/context';
import { resolveXmlProps } from '../core/props';
import { BOX_ALIGNS, STACK_ITEM_SIZES } from '../constants';
import { StackItem as AstryxStackItem } from '@astryxdesign/core/Stack';

const stackItemPropsSchema = z.object({
    crossAlignSelf: z.enum(BOX_ALIGNS).optional(),
    isScrollable: z.boolean().optional().catch(undefined),
    size: z.enum(STACK_ITEM_SIZES).optional(),
});

type StackItemProps = z.infer<typeof stackItemPropsSchema>;

export function StackItem({ props, nodes }: Props) {
    const { scope: ctx } = useXmlRuntime();
    const { crossAlignSelf, isScrollable, size }: StackItemProps = resolveXmlProps(
        props,
        ctx,
        { crossAlignSelf: 'scalar', isScrollable: 'scalar', size: 'scalar' },
        stackItemPropsSchema
    );

    return (
        <AstryxStackItem crossAlignSelf={crossAlignSelf} isScrollable={isScrollable} size={size}>
            {renderNode(nodes, ctx)}
        </AstryxStackItem>
    );
}
