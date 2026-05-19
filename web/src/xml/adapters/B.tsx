import { useXmlContext } from '../core/context';
import { renderNode } from '../core/node';
import type { Props } from '../types';

/** Renders bold text. */
export function B({ props, nodes }: Props) {
    const { ctx } = useXmlContext();
    const children = nodes;

    return <b className="font-semibold text-foreground">{renderNode(children ?? [], ctx)}</b>;
}
