import type { ASTNode } from '@xml';
import { renderNode, useXmlContext } from '@xml';

/** Props accepted by the XML s bridge component. */
export interface SProps {
    children?: ASTNode[];
}

/** Renders strikethrough text. */
export function S({ children }: SProps) {
    const { ctx } = useXmlContext();

    return <s className="line-through">{renderNode(children ?? [], ctx)}</s>;
}
