import type { Props } from '@xml';
import { renderNode, useXmlContext } from '@xml';

/** Props accepted by the XML ol bridge component. */
export interface OlProps extends Props {}

/** Renders an ordered list with typographic defaults. */
export function Ol({ props, nodes }: OlProps) {
    const { ctx } = useXmlContext();
    void props;
    void nodes;
    const children = nodes;

    return <ol className="ml-6 list-decimal space-y-2">{renderNode(children ?? [], ctx)}</ol>;
}
