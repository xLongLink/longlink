import type { Props } from '@xml';
import { renderNode, useXmlContext } from '@xml';

/** Props accepted by the XML ul bridge component. */
export interface UlProps extends Props {}

/** Renders an unordered list with typographic defaults. */
export function Ul({ props, nodes }: UlProps) {
    const { ctx } = useXmlContext();
    void props;
    void nodes;
    const children = nodes;

    return <ul className="ml-6 list-disc space-y-2">{renderNode(children ?? [], ctx)}</ul>;
}
