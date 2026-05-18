import type { ASTNode } from '@xml';
import { renderNode, useXmlContext } from '@xml';

/** Props accepted by the XML b bridge component. */
export interface BProps {
    children?: ASTNode[];
    className?: string;
}

/** Renders bold text. */
export function B({ children, className: _className }: BProps) {
    const { ctx } = useXmlContext();

    return <b>{renderNode(children ?? [], ctx)}</b>;
}
