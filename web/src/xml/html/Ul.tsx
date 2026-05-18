import type { ASTNode } from '@xml';
import { renderNode, useXmlContext } from '@xml';

/** Props accepted by the XML ul bridge component. */
export interface UlProps {
    children?: ASTNode[];
    className?: string;
}

/** Renders an unordered list with typographic defaults. */
export function Ul({ children, className: _className }: UlProps) {
    const { ctx } = useXmlContext();

    return <ul>{renderNode(children ?? [], ctx)}</ul>;
}
