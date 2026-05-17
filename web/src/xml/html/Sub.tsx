import type { ASTNode } from '@xml';
import { renderNode, useXmlContext } from '@xml';

/** Props accepted by the XML sub bridge component. */
export interface SubProps {
    children?: ASTNode | ASTNode[] | null;
    className?: string;
}

/** Renders subscript text. */
export function Sub({ children, className }: SubProps) {
    const { ctx } = useXmlContext();

    return <sub className={className}>{renderNode(children ?? null, ctx)}</sub>;
}
