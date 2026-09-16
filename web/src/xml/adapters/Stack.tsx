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
    gap: xmlSpacingSchema.default(0),
    height: z.union([z.number(), z.string().refine((value) => value.trim().length > 0, 'must not be blank')]).optional(),
    isScrollable: z.boolean().optional(),
    justify: z.enum(STACK_JUSTIFICATIONS).optional(),
    wrap: z.enum(STACK_WRAPS).optional(),
});

export function Stack({ props, nodes }: Props) {
    const { scope: ctx } = useXmlRuntime();
    const { align, direction, gap, height, isScrollable, justify, wrap } = resolveXmlProps(props, ctx, stackPropsSchema);

    return (
        <UiStack
            align={align}
            direction={direction}
            gap={gap}
            height={height}
            isScrollable={isScrollable}
            justify={justify}
            wrap={wrap}
        >
            {renderNode(nodes, ctx)}
        </UiStack>
    );
}
