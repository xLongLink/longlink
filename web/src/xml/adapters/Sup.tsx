import type { Props } from '@xml';
import { renderNode, useXmlContext } from '@xml';

/** Props accepted by the XML sup bridge component. */

/** Renders superscript text. */
export function Sup({ props, nodes }: Props) {
    const { ctx } = useXmlContext();
    void props;
    void nodes;
    const children = nodes;

    return <sup className="text-[0.8em]">{renderNode(children ?? [], ctx)}</sup>;
}
