import type { Props } from '@xml';
import { renderNode, useXmlContext } from '@xml';

/** Props accepted by the XML li bridge component. */
export interface LiProps extends Props {}

/** Renders a list item and preserves nested XML children. */
export function Li({ props, nodes }: LiProps) {
    const { ctx } = useXmlContext();
    void props;
    void nodes;
    const children = nodes;

    return <li>{renderNode(children ?? [], ctx)}</li>;
}
