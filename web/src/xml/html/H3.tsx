import type { ASTNode } from '@xml';
import { renderNode, useXmlContext } from '@xml';

/** Props accepted by the XML h3 bridge component. */
export interface H3Props {
    children?: ASTNode[];
}

/** Renders a tertiary heading with typographic defaults. */
export function H3({ children }: H3Props) {
    const { ctx } = useXmlContext();

    return <h3>{renderNode(children ?? [], ctx)}</h3>;
}
