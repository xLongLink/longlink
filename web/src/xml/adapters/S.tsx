import type { Props } from '@xml';
import { renderNode, useXmlContext } from '@xml';

/** Props accepted by the XML s bridge component. */

/** Renders strikethrough text. */
export function S({ props, nodes }: Props) {
    const { ctx } = useXmlContext();
    void props;
    void nodes;
    const children = nodes;

    return <s className="line-through">{renderNode(children ?? [], ctx)}</s>;
}
