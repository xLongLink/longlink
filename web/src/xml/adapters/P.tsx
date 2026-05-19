import { useXmlContext } from '@xml/core/context';
import { renderNode } from '@xml/core/node';
import type { Props } from '@xml/types';

/** Props accepted by the XML paragraph bridge component. */

/** Renders a paragraph with standard styling. */
export function P({ props, nodes }: Props) {
    const { ctx } = useXmlContext();

    return <p className="leading-7">{renderNode(nodes, ctx)}</p>;
}
