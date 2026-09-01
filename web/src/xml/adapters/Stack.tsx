import { z } from 'zod';
import type { Props } from '../types';
import { renderNode } from '../core/node';
import { useXmlRuntime } from '../core/context';
import { Stack as UiStack } from '@astryxdesign/core/Stack';
import { resolveXmlProps, xmlSpacingSchema } from '../core/props';
import { BOX_ALIGNS, ORIENTATIONS, STACK_JUSTIFICATIONS, STACK_WRAPS } from '../constants';

const stackPropsSchema = z.object({
    align: z.enum(BOX_ALIGNS).optional(),
    direction: z.enum(ORIENTATIONS).optional(),
    gap: xmlSpacingSchema.optional(),
    justify: z.enum(STACK_JUSTIFICATIONS).optional(),
    wrap: z.enum(STACK_WRAPS).optional(),
});

export function Stack({ props, nodes }: Props) {
    const { scope: ctx } = useXmlRuntime();
    const { align, direction, gap, justify, wrap } = resolveXmlProps(
        props,
        ctx,
        { align: 'scalar', direction: 'scalar', gap: 'scalar', justify: 'scalar', wrap: 'scalar' },
        stackPropsSchema
    );

    return (
        <UiStack align={align} direction={direction} gap={gap} justify={justify} wrap={wrap}>
            {renderNode(nodes, ctx)}
        </UiStack>
    );
}
