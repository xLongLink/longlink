import type { ASTNode } from '@xml';
import { renderNode, useXmlContext } from '@xml';

/** Props accepted by the XML b bridge component. */
export interface BProps {
    children?: ASTNode[];
}

/** Renders bold text. */
export function B({ children }: BProps) {
    const { ctx } = useXmlContext();

    return <b className="font-semibold text-foreground">{renderNode(children ?? [], ctx)}</b>;
}
