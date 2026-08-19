import type { Props } from '../types';
import { renderNode } from '../core/node';
import { useXmlRuntime } from '../core/context';
import * as AstryxText from '@astryxdesign/core/Text';

export function Text({ nodes }: Props) {
    const { scope: ctx } = useXmlRuntime();

    return <AstryxText.Text>{renderNode(nodes, ctx)}</AstryxText.Text>;
}

export function Bold({ nodes }: Props) {
    const { scope: ctx } = useXmlRuntime();

    return <b>{renderNode(nodes, ctx)}</b>;
}

export function Italic({ nodes }: Props) {
    const { scope: ctx } = useXmlRuntime();

    return <i>{renderNode(nodes, ctx)}</i>;
}
