import { useXmlContext } from '@xml/core/context';
import { renderNode } from '@xml/core/node';
import type { Props } from '@xml/types';

/** Props accepted by the XML sub bridge component. */

/** Renders subscript text. */
export function Sub({ props, nodes }: Props) {
    const { ctx } = useXmlContext();

    return <sub className="text-[0.8em]">{renderNode(nodes, ctx)}</sub>;
}
