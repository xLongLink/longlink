import type { ASTNode } from '@xml';
import { renderNode, useXmlContext } from '@xml';

/** Props accepted by the XML ol bridge component. */
export interface OlProps {
    children?: ASTNode[];
    className?: string;
}

/** Renders an ordered list with typographic defaults. */
export function Ol({ children, className: _className }: OlProps) {
    const { ctx } = useXmlContext();

    return <ol>{renderNode(children ?? [], ctx)}</ol>;
}
