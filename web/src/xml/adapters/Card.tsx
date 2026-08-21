import type { Props } from '../types';
import { renderNode } from '../core/node';
import { resolveXmlGap } from '../core/props';
import { useXmlRuntime } from '../core/context';
import { Stack } from '@astryxdesign/core/Stack';
import { Card as AstryxCard } from '@astryxdesign/core/Card';

export function Card({ props, nodes }: Props) {
    const { scope: ctx } = useXmlRuntime();
    const gap = resolveXmlGap(props, ctx, 'Card');

    return (
        <AstryxCard>
            <Stack gap={gap}>{renderNode(nodes, ctx)}</Stack>
        </AstryxCard>
    );
}
