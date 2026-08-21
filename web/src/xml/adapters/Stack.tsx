import { z } from 'zod';
import type { Props } from '../types';
import { renderNode } from '../core/node';
import { useXmlRuntime } from '../core/context';
import { Stack as AstryxStack } from '@astryxdesign/core/Stack';
import { resolveXmlProps, xmlSpacingWithDefaultSchema } from '../core/props';
import { BOX_ALIGNS, ORIENTATIONS, STACK_JUSTIFICATIONS, STACK_WRAPS } from '../constants';

const stackPropsSchema = z.object({
    align: z.enum(BOX_ALIGNS).optional().catch('stretch').default('stretch'),
    direction: z.enum(ORIENTATIONS).optional().catch(undefined),
    gap: xmlSpacingWithDefaultSchema,
    justify: z.enum(STACK_JUSTIFICATIONS).optional().catch('start').default('start'),
    wrap: z.enum(STACK_WRAPS).optional().catch('nowrap').default('nowrap'),
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
        <AstryxStack align={align} direction={direction} gap={gap} justify={justify} wrap={wrap}>
            {renderNode(nodes, ctx)}
        </AstryxStack>
    );
}
