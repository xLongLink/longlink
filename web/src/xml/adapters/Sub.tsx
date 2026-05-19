import type { Props } from '@xml';
import { renderNode, useXmlContext } from '@xml';

/** Props accepted by the XML sub bridge component. */

/** Renders subscript text. */
export function Sub({ props, nodes }: Props) {
    const { ctx } = useXmlContext();
    void props;
    void nodes;
    const children = nodes;

    return <sub className="text-[0.8em]">{renderNode(children ?? [], ctx)}</sub>;
}
