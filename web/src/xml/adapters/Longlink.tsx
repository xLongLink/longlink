import { useXmlContext } from '@xml/core/context';
import { renderNode } from '@xml/core/node';
import type { Props } from '@xml/types';

/** Props accepted by the XML Longlink component. */

/** Renders the root shell. */
export function Longlink({ props, nodes }: Props) {
    const { ctx } = useXmlContext();

    // The root element is intentionally attribute-free.
    if (Object.keys(props).length > 0) {
        throw new Error('longlink does not accept attributes');
    }

    return <div className="flex flex-col gap-6 text-sm">{renderNode(nodes, ctx)}</div>;
}
