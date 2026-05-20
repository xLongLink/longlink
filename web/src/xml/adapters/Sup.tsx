import { useXmlContext } from '@xml/core/context';
import { renderNode } from '@xml/core/node';
import type { Props } from '@xml/types';

/** Props accepted by the XML sup bridge component. */

/** Renders superscript text. */
export function Sup({ nodes }: Props) {
    const { ctx } = useXmlContext();

    return <sup className="text-[0.8em]">{renderNode(nodes, ctx)}</sup>;
}
