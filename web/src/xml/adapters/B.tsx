import type { Props } from '@xml';
import { renderNode, useXmlContext } from '@xml';

/** Renders bold text. */
export function B({ props, nodes }: Props) {
    const { ctx } = useXmlContext();
    void props;
    void nodes;
    const children = nodes;

    return <b className="font-semibold text-foreground">{renderNode(children ?? [], ctx)}</b>;
}
