import { renderNode } from '../renderer/renderNode';
import type { PrimitiveProps } from '../types';

export function Page({ node, ctx, registry }: PrimitiveProps) {
    return renderNode(node.children, registry, ctx);
}
