import type { Props } from '../types';
import { renderNode } from '../core/node';
import { useXmlRuntime } from '../core/context';
import { Card as AstryxCard } from '@astryxdesign/core/Card';

export function Card({ nodes }: Props) {
    const { scope: ctx } = useXmlRuntime();

    return <AstryxCard>{renderNode(nodes, ctx)}</AstryxCard>;
}
