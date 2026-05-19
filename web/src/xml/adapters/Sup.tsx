import type { Props } from '@xml';
import { renderNode, useXmlContext } from '@xml';

/** Props accepted by the XML sup bridge component. */
export interface SupProps extends Props {}

/** Renders superscript text. */
export function Sup({ props, nodes }: SupProps) {
    const { ctx } = useXmlContext();
    void props;
    void nodes;
    const children = nodes;

    return <sup className="text-[0.8em]">{renderNode(children ?? [], ctx)}</sup>;
}
