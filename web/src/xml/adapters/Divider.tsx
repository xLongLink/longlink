import type { Props } from '../types';
import { renderNode } from '../core/node';
import { useXmlRuntime } from '../core/context';
import { Divider as AstryxDivider } from '@astryxdesign/core/Divider';

export function Divider({ nodes }: Props) {
    const { scope: ctx } = useXmlRuntime();

    return <AstryxDivider label={nodes.length === 0 ? undefined : renderNode(nodes, ctx)} />;
}
