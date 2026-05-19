import { useXmlContext } from '../core/context';
import { renderNode } from '../core/node';
import type { Props } from '../types';

/** Props accepted by the XML sup bridge component. */

/** Renders superscript text. */
export function Sup({ props, nodes }: Props) {
    const { ctx } = useXmlContext();
    const children = nodes;

    return <sup className="text-[0.8em]">{renderNode(children ?? [], ctx)}</sup>;
}
