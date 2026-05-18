import type { ASTNode } from '@xml';
import { renderNode, useXmlContext } from '@xml';

/** Props accepted by the XML h1 bridge component. */
export interface H1Props {
    children?: ASTNode[];
}

/** Renders a primary heading with typographic defaults. */
export function H1({ children }: H1Props) {
    const { ctx } = useXmlContext();

    return <h1>{renderNode(children ?? [], ctx)}</h1>;
}
