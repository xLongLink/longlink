import { useXmlContext } from '../core/context';
import { renderNode } from '../core/node';
import type { Props } from '../types';

/** Props accepted by the XML ol bridge component. */

/** Renders an ordered list with typographic defaults. */
export function Ol({ props, nodes }: Props) {
    const { ctx } = useXmlContext();
    void props;
    void nodes;
    const children = nodes;

    return <ol className="ml-6 list-decimal space-y-2">{renderNode(children ?? [], ctx)}</ol>;
}
