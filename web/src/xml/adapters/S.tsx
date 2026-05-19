import { useXmlContext } from '@xml/core/context';
import { renderNode } from '@xml/core/node';
import type { Props } from '@xml/types';

/** Props accepted by the XML s bridge component. */

/** Renders strikethrough text. */
export function S({ props, nodes }: Props) {
    const { ctx } = useXmlContext();

    return <s className="line-through">{renderNode(nodes, ctx)}</s>;
}
