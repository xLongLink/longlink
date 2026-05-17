import type { ASTNode } from '@xml';
import { renderNode, useXmlContext } from '@xml';

/** Props accepted by the XML s bridge component. */
export interface SProps {
    children?: ASTNode | ASTNode[] | null;
    className?: string;
}

/** Renders strikethrough text. */
export function S({ children, className }: SProps) {
    const { ctx } = useXmlContext();

    return <s className={className}>{renderNode(children ?? null, ctx)}</s>;
}
