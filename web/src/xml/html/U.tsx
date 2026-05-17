import type { ASTNode } from '@xml';
import { renderNode, useXmlContext } from '@xml';

/** Props accepted by the XML u bridge component. */
export interface UProps {
    children?: ASTNode | ASTNode[] | null;
    className?: string;
}

/** Renders underlined text. */
export function U({ children, className }: UProps) {
    const { ctx } = useXmlContext();

    return <u className={className}>{renderNode(children ?? null, ctx)}</u>;
}
