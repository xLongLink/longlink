import { useXmlContext } from '../core/context';
import { renderNode } from '../core/node';
import type { Props } from '../types';

/** Props accepted by the XML li bridge component. */

/** Renders a list item and preserves nested XML children. */
export function Li({ props, nodes }: Props) {
    const { ctx } = useXmlContext();
    const children = nodes;

    return <li>{renderNode(children ?? [], ctx)}</li>;
}
