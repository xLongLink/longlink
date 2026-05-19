import type { Props } from '@xml';
import { renderNode, useXmlContext } from '@xml';

/** Props accepted by the XML paragraph bridge component. */
export interface PProps extends Props {}

/** Renders a paragraph with standard styling. */
export function P({ props, nodes }: PProps) {
    const { ctx } = useXmlContext();
    void props;
    void nodes;
    const children = nodes;

    return <p className="leading-7">{renderNode(children ?? [], ctx)}</p>;
}
