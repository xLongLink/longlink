import { useXmlContext } from '@xml/core/context';
import { renderNode } from '@xml/core/node';
import type { Props } from '@xml/types';

/** Props accepted by the XML Longlink component. */

/** Renders the root shell. */
export function Longlink({ props, nodes }: Props) {
    const { ctx } = useXmlContext();

    return <div>{renderNode(nodes, ctx)}</div>;
}
