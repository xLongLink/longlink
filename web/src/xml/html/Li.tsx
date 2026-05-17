import type { ASTNode } from '@xml';
import { renderNode, useXmlContext } from '@xml';

/** Props accepted by the XML li bridge component. */
export interface LiProps {
    children?: ASTNode | ASTNode[] | null;
    className?: string;
}

/** Renders a list item and preserves nested XML children. */
export function Li({ children, className }: LiProps) {
    const { ctx } = useXmlContext();

    return <li className={className}>{renderNode(children ?? null, ctx)}</li>;
}
