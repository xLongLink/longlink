import { useXmlContext } from '../core/context';
import { renderNode } from '../core/node';
import type { Props } from '../types';

/** Props accepted by the XML s bridge component. */

/** Renders strikethrough text. */
export function S({ props, nodes }: Props) {
    const { ctx } = useXmlContext();
    void props;
    void nodes;
    const children = nodes;

    return <s className="line-through">{renderNode(children ?? [], ctx)}</s>;
}
