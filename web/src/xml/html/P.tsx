import type { ASTNode } from '@xml';
import { renderNode, useXmlContext } from '@xml';

/** Props accepted by the XML paragraph bridge component. */
export interface PProps {
    children?: ASTNode[];
}

/** Renders a paragraph with standard styling. */
export function P({ children }: PProps) {
    const { ctx } = useXmlContext();

    return <p>{renderNode(children ?? [], ctx)}</p>;
}
