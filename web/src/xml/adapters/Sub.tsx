import { useXmlContext } from '../core/context';
import { renderNode } from '../core/node';
import type { Props } from '../types';

/** Props accepted by the XML sub bridge component. */

/** Renders subscript text. */
export function Sub({ props, nodes }: Props) {
    const { ctx } = useXmlContext();
    const children = nodes;

    return <sub className="text-[0.8em]">{renderNode(children ?? [], ctx)}</sub>;
}
