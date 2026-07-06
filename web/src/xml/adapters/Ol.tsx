import { useXmlContext } from '@/xml/core/context';
import { renderNode } from '@/xml/core/node';
import type { Props } from '@/xml/types';

/** Props accepted by the XML ol bridge component. */

/** Renders an ordered list with typographic defaults. */
export function Ol({ nodes }: Props) {
    const { ctx } = useXmlContext();

    return <ol className="ml-6 list-decimal space-y-2">{renderNode(nodes, ctx)}</ol>;
}
