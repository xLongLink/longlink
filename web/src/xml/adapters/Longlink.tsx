import type { Props } from '@xml';
import { renderNode, useXmlContext } from '@xml';

/** Props accepted by the XML Longlink component. */
export interface LonglinkProps extends Props {}

/** Renders the root shell. */
export function Longlink({ props, nodes }: LonglinkProps) {
    const { ctx } = useXmlContext();
    void props;
    void nodes;
    const children = nodes;

    return <div>{renderNode(children, ctx)}</div>;
}
