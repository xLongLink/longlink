import type { ASTNode } from '@xml';
import { renderNode, useXmlContext } from '@xml';

/** Props accepted by the XML h2 bridge component. */
export interface H2Props {
    children?: ASTNode[];
    className?: string;
}

/** Renders a secondary heading with typographic defaults. */
export function H2({ children, className: _className }: H2Props) {
    const { ctx } = useXmlContext();

    return <h2>{renderNode(children ?? [], ctx)}</h2>;
}
