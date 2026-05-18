import type { ASTNode } from '@xml';
import { renderNode, useXmlContext } from '@xml';

/** Props accepted by the XML ol bridge component. */
export interface OlProps {
    children?: ASTNode[];
}

/** Renders an ordered list with typographic defaults. */
export function Ol({ children }: OlProps) {
    const { ctx } = useXmlContext();

    return <ol>{renderNode(children ?? [], ctx)}</ol>;
}
