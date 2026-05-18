import type { ASTNode } from '@xml';
import { renderNode, useXmlContext } from '@xml';

/** Props accepted by the XML s bridge component. */
export interface SProps {
    children?: ASTNode[];
    className?: string;
}

/** Renders strikethrough text. */
export function S({ children, className: _className }: SProps) {
    const { ctx } = useXmlContext();

    return <s>{renderNode(children ?? [], ctx)}</s>;
}
