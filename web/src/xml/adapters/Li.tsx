import type { Props } from '@xml';
import { renderNode, useXmlContext } from '@xml';

/** Props accepted by the XML li bridge component. */

/** Renders a list item and preserves nested XML children. */
export function Li({ props, nodes }: Props) {
    const { ctx } = useXmlContext();
    void props;
    void nodes;
    const children = nodes;

    return <li>{renderNode(children ?? [], ctx)}</li>;
}
