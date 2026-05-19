import type { Props } from '@xml';
import { renderNode, useXmlContext } from '@xml';

/** Props accepted by the XML b bridge component. */
export interface BProps extends Props {}

/** Renders bold text. */
export function B({ props, nodes }: BProps) {
    const { ctx } = useXmlContext();
    void props;
    void nodes;
    const children = nodes;

    return <b className="font-semibold text-foreground">{renderNode(children ?? [], ctx)}</b>;
}
