import { useXmlContext } from '../core/context';
import { renderNode } from '../core/node';
import type { Props } from '../types';

/** Props accepted by the XML paragraph bridge component. */

/** Renders a paragraph with standard styling. */
export function P({ props, nodes }: Props) {
    const { ctx } = useXmlContext();
    const children = nodes;

    return <p className="leading-7">{renderNode(children ?? [], ctx)}</p>;
}
