import type { ASTNode } from '@xml';
import { renderNode, useXmlContext } from '@xml';

/** Props accepted by the XML sub bridge component. */
export interface SubProps {
    children?: ASTNode[];
    className?: string;
}

/** Renders subscript text. */
export function Sub({ children, className: _className }: SubProps) {
    const { ctx } = useXmlContext();

    return <sub>{renderNode(children ?? [], ctx)}</sub>;
}
