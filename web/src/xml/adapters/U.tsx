import { useXmlContext } from '../core/context';
import { renderNode } from '../core/node';
import type { Props } from '../types';

/** Props accepted by the XML u bridge component. */

/** Renders underlined text. */
export function U({ props, nodes }: Props) {
    const { ctx } = useXmlContext();
    void props;
    void nodes;
    const children = nodes;

    return <u className="underline underline-offset-4">{renderNode(children ?? [], ctx)}</u>;
}
