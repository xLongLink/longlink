import type { ASTNode } from '@xml';
import { renderNode, useXmlContext } from '@xml';

/** Props accepted by the XML li bridge component. */
export interface LiProps {
    children?: ASTNode[];
}

/** Renders a list item and preserves nested XML children. */
export function Li({ children }: LiProps) {
    const { ctx } = useXmlContext();

    return <li>{renderNode(children ?? [], ctx)}</li>;
}
