import type { ASTNode } from '@xml';
import { renderNode, useXmlContext } from '@xml';

/** Props accepted by the XML u bridge component. */
export interface UProps {
    children?: ASTNode[];
    className?: string;
}

/** Renders underlined text. */
export function U({ children, className: _className }: UProps) {
    const { ctx } = useXmlContext();

    return <u>{renderNode(children ?? [], ctx)}</u>;
}
