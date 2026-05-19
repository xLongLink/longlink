import type { Props } from '@xml';
import { renderNode, useXmlContext } from '@xml';

/** Props accepted by the XML u bridge component. */
export interface UProps extends Props {}

/** Renders underlined text. */
export function U({ props, nodes }: UProps) {
    const { ctx } = useXmlContext();
    void props;
    void nodes;
    const children = nodes;

    return <u className="underline underline-offset-4">{renderNode(children ?? [], ctx)}</u>;
}
