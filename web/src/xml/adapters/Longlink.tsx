import { useXmlContext } from '../core/context';
import { renderNode } from '../core/node';
import type { Props } from '../types';

/** Props accepted by the XML Longlink component. */

/** Renders the root shell. */
export function Longlink({ props, nodes }: Props) {
    const { ctx } = useXmlContext();
    void props;
    void nodes;
    const children = nodes;

    return <div>{renderNode(children, ctx)}</div>;
}
