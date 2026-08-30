import { z } from 'zod';
import type { Props } from '../types';
import { renderNode } from '../core/node';
import { TEXT_COLORS } from '../constants';
import { useXmlRuntime } from '../core/context';
import { resolveXmlProps } from '../core/props';
import * as AstryxText from '@astryxdesign/core/Text';

const textPropsSchema = z.object({ color: z.enum(TEXT_COLORS).optional() });

export function Text({ props, nodes }: Props) {
    const { scope: ctx } = useXmlRuntime();
    const { color } = resolveXmlProps(props, ctx, { color: 'scalar' }, textPropsSchema);

    return <AstryxText.Text color={color}>{renderNode(nodes, ctx)}</AstryxText.Text>;
}

export function Bold({ nodes }: Props) {
    const { scope: ctx } = useXmlRuntime();

    return <b>{renderNode(nodes, ctx)}</b>;
}

export function Italic({ nodes }: Props) {
    const { scope: ctx } = useXmlRuntime();

    return <i>{renderNode(nodes, ctx)}</i>;
}
