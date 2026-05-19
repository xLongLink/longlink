import type { Props } from '@xml';
import { renderNode, useXmlContext } from '@xml';

/** Props accepted by the XML s bridge component. */
export interface SProps extends Props {}

/** Renders strikethrough text. */
export function S({ props, nodes }: SProps) {
    const { ctx } = useXmlContext();
    void props;
    void nodes;
    const children = nodes;

    return <s className="line-through">{renderNode(children ?? [], ctx)}</s>;
}
