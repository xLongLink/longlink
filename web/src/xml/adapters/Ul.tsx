import { useXmlContext } from '../core/context';
import { renderNode } from '../core/node';
import type { Props } from '../types';

/** Props accepted by the XML ul bridge component. */

/** Renders an unordered list with typographic defaults. */
export function Ul({ props, nodes }: Props) {
    const { ctx } = useXmlContext();
    const children = nodes;

    return <ul className="ml-6 list-disc space-y-2">{renderNode(children ?? [], ctx)}</ul>;
}
