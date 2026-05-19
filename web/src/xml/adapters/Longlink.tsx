import type { Props } from '@xml';
import { renderNode, useXmlContext } from '@xml';

/** Props accepted by the XML Longlink component. */

/** Renders the root shell. */
export function Longlink({ props, nodes }: Props) {
    const { ctx } = useXmlContext();
    void props;
    void nodes;
    const children = nodes;

    return <div>{renderNode(children, ctx)}</div>;
}
