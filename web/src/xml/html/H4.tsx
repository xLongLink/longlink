import type { ASTNode } from '@xml';
import { renderNode, useXmlContext } from '@xml';

/** Props accepted by the XML h4 bridge component. */
export interface H4Props {
    children?: ASTNode[];
    className?: string;
}

/** Renders a quaternary heading with typographic defaults. */
export function H4({ children, className: _className }: H4Props) {
    const { ctx } = useXmlContext();

    return <h4>{renderNode(children ?? [], ctx)}</h4>;
}
