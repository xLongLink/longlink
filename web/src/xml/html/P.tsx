import type { ASTNode } from '@xml';
import { renderNode, useXmlContext } from '@xml';

/** Props accepted by the XML paragraph bridge component. */
export interface PProps {
    children?: ASTNode | ASTNode[] | null;
}

/** Renders a paragraph with standard styling. */
export function P({ children }: PProps) {
    const { ctx } = useXmlContext();

    return <p className="leading-7 [&:not(:first-child)]:mt-4">{renderNode(children ?? null, ctx)}</p>;
}
