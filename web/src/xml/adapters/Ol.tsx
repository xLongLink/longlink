import type { Props } from '@/xml/types';
import { renderNode } from '@/xml/core/node';
import { useXmlContext } from '@/xml/core/context';

/** Renders an ordered list with typographic defaults. */
export function Ol({ nodes }: Props) {
    const { ctx } = useXmlContext();

    return <ol className="ml-6 list-decimal space-y-2">{renderNode(nodes, ctx)}</ol>;
}
