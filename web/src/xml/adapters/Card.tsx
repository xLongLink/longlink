import { z } from 'zod';
import type { Props } from '../types';
import { renderNode } from '../core/node';
import { useXmlRuntime } from '../core/context';
import { Stack } from '@astryxdesign/core/Stack';
import { Card as AstryxCard } from '@astryxdesign/core/Card';
import { resolveXmlProps, xmlSpacingWithDefaultSchema } from '../core/props';

const cardPropsSchema = z.object({ gap: xmlSpacingWithDefaultSchema });

export function Card({ props, nodes }: Props) {
    const { scope: ctx } = useXmlRuntime();
    const { gap } = resolveXmlProps(props, ctx, { gap: 'scalar' }, cardPropsSchema);

    return (
        <AstryxCard>
            <Stack gap={gap}>{renderNode(nodes, ctx)}</Stack>
        </AstryxCard>
    );
}
